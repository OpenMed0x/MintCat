import { generateKeyPairSync, randomUUID } from "node:crypto";
import {
  createFallbackAccount,
  pushFallbackDeliveryJob,
  pushFallbackFollow,
  pushFallbackFollowing,
  pushFallbackInboxActivity,
  pushFallbackInstanceRule,
  pushFallbackModerationAction,
  pushFallbackNotification,
  pushFallbackPost,
  pushFallbackReport,
  pushFallbackRemoteActor,
  pushFallbackRemotePost,
  pushFallbackRiskEvent,
  readFallbackStore,
  updateFallbackAccount,
  updateFallbackNotification,
  updateFallbackPost,
  updateFallbackDeliveryJob,
} from "./fallback-store";
import { actorDocument, createActivity, noteObject } from "./activitypub";
import { actorUrl, getBaseUrl, getHostFromRequest, normalizeUsername } from "./config";
import { buildLinkPreviews } from "./link-preview";
import { serverClient } from "./supabase-server";

const TIMELINE_SEED = [
  {
    id: "remote-seed-1",
    author: {
      name: "Nadia @ River Node",
      handle: "@nadia@river.social",
      instance: "river.social",
      badge: "Maintainer"
    },
    audience: "Federated",
    minutesAgo: 6,
    content:
      "Shipping today's federation preview: portable identity cards, community-owned moderation queues, and a calmer reading experience that feels closer to a neighborhood than an algorithm.",
    tags: ["federation", "moderation", "product"],
    stats: { replies: 12, boosts: 34, favorites: 88 },
    comments: []
  },
  {
    id: "remote-seed-2",
    author: {
      name: "Lina @ Garden Commons",
      handle: "@lina@garden.city",
      instance: "garden.city",
      badge: "Moderator"
    },
    audience: "Community",
    minutesAgo: 27,
    content:
      "A healthy decentralized network needs good defaults: slow mode for conflict spikes, transparent admin logs, and clear community expectations before growth accelerates.",
    tags: ["governance", "community"],
    stats: { replies: 5, boosts: 21, favorites: 59 },
    comments: []
  }
];

export async function listTimeline(request, viewerEmail = "") {
  const client = serverClient();
  const host = getHostFromRequest(request);
  const viewerUsername = viewerEmail ? normalizeUsername(viewerEmail) : "";

  if (!client) {
    const store = readFallbackStore();
    const localPosts = store.posts.map((post) => {
      const author = store.accounts.find((entry) => entry.username === post.author_username);
      return serializeTimelinePost(post, author, host, viewerUsername);
    });
    const inboxRemotePosts = store.remote_posts.map((post) => serializeRemoteTimelinePost(post, viewerUsername));
    return [...localPosts, ...inboxRemotePosts, ...TIMELINE_SEED].sort(sortTimelinePosts);
  }

  const [{ data: accounts }, { data: posts }, { data: remotePosts }] = await Promise.all([
    client.from("oracat_accounts").select("*"),
    client.from("oracat_posts").select("*").order("published_at", { ascending: false }).limit(40),
    client.from("oracat_remote_posts").select("*").order("published_at", { ascending: false }).limit(20)
  ]);

  const pollVoteMap = await getPollVoteMap(client, posts || [], remotePosts || [], viewerUsername);

  const accountMap = new Map((accounts || []).map((entry) => [entry.username, entry]));
  const localPosts = (posts || []).map((post) =>
    serializeTimelinePost(post, accountMap.get(post.author_username), host, viewerUsername, pollVoteMap.local.get(post.id))
  );
  const remoteTimelinePosts = (remotePosts || []).map((post) =>
    serializeRemoteTimelinePost(post, viewerUsername, pollVoteMap.remote.get(post.id))
  );

  return [...localPosts, ...remoteTimelinePosts, ...TIMELINE_SEED].sort(sortTimelinePosts);
}

export async function ensureLocalAccount({ email, displayName, request }) {
  const client = serverClient();
  const baseUsername = normalizeUsername(email || displayName);

  if (!client) {
    const store = readFallbackStore();
    const existing = store.accounts.find((entry) => entry.email === email) || store.accounts.find((entry) => entry.username === baseUsername);
    if (existing) {
      return existing;
    }

    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    return createFallbackAccount({
      id: randomUUID(),
      username: uniqueUsername(store.accounts.map((entry) => entry.username), baseUsername),
      email,
      display_name: displayName || baseUsername,
      bio: "New local MintCat account.",
      avatar_url: "",
      public_key_pem: publicKey,
      private_key_pem: privateKey,
      created_at: new Date().toISOString()
    });
  }

  const { data: current } = await client.from("oracat_accounts").select("*").eq("email", email).maybeSingle();
  if (current) {
    return current;
  }

  const { data: existingByUsername } = await client
    .from("oracat_accounts")
    .select("username")
    .like("username", `${baseUsername}%`);

  const username = uniqueUsername((existingByUsername || []).map((entry) => entry.username), baseUsername);
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  const payload = {
    id: randomUUID(),
    username,
    email,
    display_name: displayName || username,
    bio: "New local MintCat account.",
    avatar_url: "",
    public_key_pem: publicKey,
    private_key_pem: privateKey
  };

  const { data, error } = await client.from("oracat_accounts").insert(payload).select("*").single();
  if (error) {
    throw error;
  }

  return data;
}

export async function createLocalPost({ email, displayName, content, summary = "", media = [], poll = null, visibility = "public", language = "", request }) {
  const account = await ensureLocalAccount({ email, displayName, request });
  const client = serverClient();
  const normalizedPoll = poll && Array.isArray(poll.options) && poll.options.length >= 2
    ? { options: poll.options.filter(Boolean), votes: {} }
    : null;
  const linkPreviews = await buildLinkPreviews(content);
  const payload = {
    id: randomUUID(),
    author_username: account.username,
    content,
    summary,
    visibility,
    language,
    media,
    poll: normalizedPoll,
    link_previews: linkPreviews,
    liked_by: [],
    boosted_by: [],
    bookmarked_by: [],
    comments: [],
    published_at: new Date().toISOString()
  };

  if (!client) {
    pushFallbackPost(payload);
    return { account, post: payload };
  }

  const { data, error } = await client.from("oracat_posts").insert(payload).select("*").single();
  if (!error) {
    return { account, post: data };
  }

  const legacyPayload = {
    id: payload.id,
    author_username: payload.author_username,
    content: payload.content,
    summary: payload.summary,
    visibility: payload.visibility,
    liked_by: payload.liked_by,
    boosted_by: payload.boosted_by,
    bookmarked_by: payload.bookmarked_by,
    comments: payload.comments,
    published_at: payload.published_at
  };
  const retry = await client.from("oracat_posts").insert(legacyPayload).select("*").single();
  if (retry.error) {
    throw retry.error;
  }

  return {
    account,
    post: {
      ...retry.data,
      media,
      poll: normalizedPoll,
      language,
      link_previews: linkPreviews
    }
  };
}

export async function getAccountByUsername(username) {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().accounts.find((entry) => entry.username === username) || null;
  }

  const { data } = await client.from("oracat_accounts").select("*").eq("username", username).maybeSingle();
  return data || null;
}

export async function getPostById(postId) {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().posts.find((entry) => entry.id === postId) || null;
  }

  const { data } = await client.from("oracat_posts").select("*").eq("id", postId).maybeSingle();
  return data || null;
}

export async function getOutboxCollection({ username, baseUrl }) {
  const client = serverClient();
  const account = await getAccountByUsername(username);
  if (!account) {
    return null;
  }

  if (!client) {
    const store = readFallbackStore();
    return store.posts
      .filter((post) => post.author_username === username)
      .map((post) => createActivity(baseUrl, account, post));
  }

  const { data } = await client
    .from("oracat_posts")
    .select("*")
    .eq("author_username", username)
    .order("published_at", { ascending: false })
    .limit(20);

  return (data || []).map((post) => createActivity(baseUrl, account, post));
}

export async function getNoteDocument({ username, postId, baseUrl }) {
  const account = await getAccountByUsername(username);
  const post = await getPostById(postId);
  if (!account || !post || post.author_username !== username) {
    return null;
  }

  return noteObject(baseUrl, account, post);
}

export async function getFollowers(username) {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().follows.filter((entry) => entry.local_username === username && entry.state === "accepted");
  }

  const { data } = await client.from("oracat_follows").select("*").eq("local_username", username).eq("state", "accepted");
  return data || [];
}

export async function getFollowing(username) {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().following.filter((entry) => entry.local_username === username);
  }

  const { data } = await client.from("oracat_following").select("*").eq("local_username", username);
  return data || [];
}

export async function saveInboxActivity({ localUsername, activity, verified = false }) {
  const client = serverClient();
  const payload = {
    id: randomUUID(),
    local_username: localUsername,
    activity_id: activity.id || `${localUsername}-activity-${Date.now()}`,
    actor_url: activity.actor || null,
    activity_type: activity.type || "Unknown",
    verified,
    raw_activity: activity,
    published_at: new Date().toISOString()
  };

  if (!client) {
    return pushFallbackInboxActivity(payload);
  }

  const { data, error } = await client.from("oracat_inbox_activities").insert(payload).select("*").single();
  if (error) {
    throw error;
  }

  return data;
}

export async function upsertRemoteActor(actor) {
  const client = serverClient();

  if (!client) {
    return pushFallbackRemoteActor(actor);
  }

  const { data, error } = await client
    .from("oracat_remote_actors")
    .upsert(actor, { onConflict: "actor_url" })
    .select("*")
    .single();
  if (error) {
    throw error;
  }

  return data;
}

export async function saveRemotePost(remotePost) {
  const client = serverClient();

  if (!client) {
    return pushFallbackRemotePost(remotePost);
  }

  const { data, error } = await client
    .from("oracat_remote_posts")
    .upsert(remotePost, { onConflict: "id" })
    .select("*")
    .single();
  if (error) {
    throw error;
  }

  return data;
}

export async function acceptFollow({ localUsername, remoteActor }) {
  const client = serverClient();
  const payload = {
    id: randomUUID(),
    local_username: localUsername,
    remote_actor_url: remoteActor.actor_url,
    inbox_url: remoteActor.inbox_url,
    shared_inbox_url: remoteActor.shared_inbox_url || null,
    state: "accepted",
    accepted_at: new Date().toISOString()
  };

  if (!client) {
    return pushFallbackFollow(payload);
  }

  const { data, error } = await client
    .from("oracat_follows")
    .upsert(payload, { onConflict: "local_username,remote_actor_url" })
    .select("*")
    .single();
  if (error) {
    throw error;
  }

  return data;
}

export async function followRemoteActor({ localUsername, remoteActor }) {
  const client = serverClient();
  const payload = {
    id: randomUUID(),
    local_username: localUsername,
    remote_actor_url: remoteActor.actor_url,
    state: "pending",
    created_at: new Date().toISOString()
  };

  if (!client) {
    return pushFallbackFollowing(payload);
  }

  const { data, error } = await client
    .from("oracat_following")
    .upsert(payload, { onConflict: "local_username,remote_actor_url" })
    .select("*")
    .single();
  if (error) {
    throw error;
  }

  return data;
}

export async function markFollowingAccepted({ localUsername, remoteActorUrl }) {
  const client = serverClient();
  const patch = {
    state: "accepted"
  };

  if (!client) {
    const store = readFallbackStore();
    const existing = store.following.find(
      (entry) => entry.local_username === localUsername && entry.remote_actor_url === remoteActorUrl
    );
    if (!existing) {
      return null;
    }

    Object.assign(existing, patch);
    return existing;
  }

  const { data, error } = await client
    .from("oracat_following")
    .update(patch)
    .eq("local_username", localUsername)
    .eq("remote_actor_url", remoteActorUrl)
    .select("*")
    .maybeSingle();
  if (error) {
    throw error;
  }

  return data || null;
}

export async function getDeliveryTargets(localUsername) {
  const followers = await getFollowers(localUsername);
  return followers.map((entry) => ({
    actor_url: entry.remote_actor_url,
    inbox_url: entry.shared_inbox_url || entry.inbox_url
  }));
}

export async function createDeliveryJob({ type, localUsername, payload, runAt = new Date().toISOString() }) {
  const client = serverClient();
  const job = {
    id: randomUUID(),
    job_type: type,
    local_username: localUsername,
    payload,
    state: "pending",
    attempt_count: 0,
    max_attempts: 8,
    last_error: null,
    run_at: runAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!client) {
    return pushFallbackDeliveryJob(job);
  }

  const { data, error } = await client.from("oracat_delivery_jobs").insert(job).select("*").single();
  if (error) {
    throw error;
  }

  return data;
}

export async function claimPendingDeliveryJobs(limit = 20) {
  const client = serverClient();
  const now = new Date().toISOString();

  if (!client) {
    const store = readFallbackStore();
    return store.delivery_jobs
      .filter((job) => job.state === "pending" && job.run_at <= now)
      .slice(0, limit)
      .map((job) => updateFallbackDeliveryJob(job.id, { state: "processing", updated_at: new Date().toISOString() }));
  }

  const { data: jobs, error } = await client
    .from("oracat_delivery_jobs")
    .select("*")
    .eq("state", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  const claimed = [];
  for (const job of jobs || []) {
    const { data: updated } = await client
      .from("oracat_delivery_jobs")
      .update({ state: "processing", updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("state", "pending")
      .select("*")
      .maybeSingle();

    if (updated) {
      claimed.push(updated);
    }
  }

  return claimed;
}

export async function markDeliveryJobSucceeded(id) {
  const client = serverClient();
  if (!client) {
    return updateFallbackDeliveryJob(id, { state: "completed", updated_at: new Date().toISOString() });
  }

  const { data, error } = await client
    .from("oracat_delivery_jobs")
    .update({ state: "completed", updated_at: new Date().toISOString(), last_error: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw error;
  }

  return data;
}

export async function markDeliveryJobFailed(job, errorMessage) {
  const client = serverClient();
  const attemptCount = Number(job.attempt_count || 0) + 1;
  const exhausted = attemptCount >= Number(job.max_attempts || 8);
  const nextRun = new Date(Date.now() + Math.min(60, 2 ** Math.min(attemptCount, 6)) * 1000).toISOString();
  const patch = {
    state: exhausted ? "dead" : "pending",
    attempt_count: attemptCount,
    last_error: errorMessage,
    run_at: exhausted ? job.run_at : nextRun,
    updated_at: new Date().toISOString()
  };

  if (!client) {
    return updateFallbackDeliveryJob(job.id, patch);
  }

  const { data, error } = await client.from("oracat_delivery_jobs").update(patch).eq("id", job.id).select("*").single();
  if (error) {
    throw error;
  }

  return data;
}

export async function listDeliveryJobs(localUsername) {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().delivery_jobs
      .filter((job) => job.local_username === localUsername)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const { data } = await client
    .from("oracat_delivery_jobs")
    .select("*")
    .eq("local_username", localUsername)
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}

export async function getAccountByEmail(email) {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().accounts.find((entry) => entry.email === email) || null;
  }

  const { data } = await client.from("oracat_accounts").select("*").eq("email", email).maybeSingle();
  return data || null;
}

export async function updateProfile({ email, avatarUrl, displayName, bio }) {
  const client = serverClient();
  const account = await getAccountByEmail(email);
  if (!account) {
    return null;
  }

  const updates = {};
  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
  }
  if (displayName !== undefined && String(displayName).trim()) {
    updates.display_name = String(displayName).trim();
  }
  if (bio !== undefined) {
    updates.bio = String(bio || "").trim();
  }

  if (!client) {
    return updateFallbackAccount(account.username, updates);
  }

  const { data, error } = await client
    .from("oracat_accounts")
    .update(updates)
    .eq("email", email)
    .select("*")
    .single();
  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfileAvatar({ email, avatarUrl }) {
  return updateProfile({ email, avatarUrl });
}

export async function listNotifications(email) {
  const account = await getAccountByEmail(email);
  if (!account) {
    return [];
  }

  const client = serverClient();
  if (!client) {
    return readFallbackStore().notifications
      .filter((entry) => entry.recipient_username === account.username)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const { data, error } = await client
    .from("oracat_notifications")
    .select("*")
    .eq("recipient_username", account.username)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) {
    throw error;
  }
  return data || [];
}

export async function markNotificationRead({ email, notificationId = "" }) {
  const account = await getAccountByEmail(email);
  if (!account) {
    return [];
  }

  const client = serverClient();
  if (!client) {
    const store = readFallbackStore();
    const targets = notificationId
      ? store.notifications.filter((entry) => entry.id === notificationId && entry.recipient_username === account.username)
      : store.notifications.filter((entry) => entry.recipient_username === account.username);
    targets.forEach((entry) => updateFallbackNotification(entry.id, { read_at: new Date().toISOString() }));
    return listNotifications(email);
  }

  let query = client
    .from("oracat_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_username", account.username);

  if (notificationId) {
    query = query.eq("id", notificationId);
  }

  const { error } = await query;
  if (error) {
    throw error;
  }
  return listNotifications(email);
}

export async function mutatePostInteraction({ postId, email, displayName, action, content = "" }) {
  const viewer = await ensureLocalAccount({
    email,
    displayName,
    request: {}
  });
  const client = serverClient();

  if (client && action === "vote") {
    const { data: localPost } = await client.from("oracat_posts").select("id,poll").eq("id", postId).maybeSingle();
    if (localPost?.poll?.options?.includes(content)) {
      await persistPollVote(client, {
        postSource: "local",
        postId,
        voterUsername: viewer.username,
        optionText: content
      });
      return localPost;
    }

    const { data: remotePost } = await client.from("oracat_remote_posts").select("id,poll").eq("id", postId).maybeSingle();
    if (remotePost?.poll?.options?.includes(content)) {
      await persistPollVote(client, {
        postSource: "remote",
        postId,
        voterUsername: viewer.username,
        optionText: content
      });
      return remotePost;
    }
  }

  if (!client) {
    const store = readFallbackStore();
    const localPost = store.posts.find((entry) => entry.id === postId);
    if (localPost) {
      const updated = applyLocalPostMutation(localPost, viewer.username, action, content);
      await createNotificationForMutation({ post: localPost, viewer, action, content, source: "local" });
      return updateFallbackPost(postId, updated);
    }

    const remotePost = store.remote_posts.find((entry) => entry.id === postId);
    if (!remotePost) {
      return null;
    }

    Object.assign(remotePost, applyRemotePostMutation(remotePost, viewer.username, action, content));
    return remotePost;
  }

  const { data: localPost } = await client.from("oracat_posts").select("*").eq("id", postId).maybeSingle();
  if (localPost) {
    const updatedPayload = applyLocalPostMutation(localPost, viewer.username, action, content);
    const { data, error } = await client
      .from("oracat_posts")
      .update(updatedPayload)
      .eq("id", postId)
      .select("*")
      .single();
    if (error) {
      throw error;
    }

    await createNotificationForMutation({ post: localPost, viewer, action, content, source: "local" });
    return data;
  }

  const { data: remotePost } = await client.from("oracat_remote_posts").select("*").eq("id", postId).maybeSingle();
  if (!remotePost) {
    return null;
  }

  const updatedPayload = applyRemotePostMutation(remotePost, viewer.username, action, content);
  const { data, error } = await client
    .from("oracat_remote_posts")
    .update(updatedPayload)
    .eq("id", postId)
    .select("*")
    .single();
  if (error) {
    throw error;
  }

  return data;
}

export async function searchRemoteAccount(query) {
  const normalized = String(query || "").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return importRemoteActor(normalized);
  }

  const acctMatch = normalized.replace(/^@/, "").match(/^([^@]+)@(.+)$/);
  if (!acctMatch) {
    return null;
  }

  const [, username, host] = acctMatch;
  const resource = `acct:${username}@${host}`;
  const response = await fetch(`https://${host}/.well-known/webfinger?resource=${encodeURIComponent(resource)}`, {
    headers: {
      Accept: "application/jrd+json, application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`WebFinger lookup failed: ${response.status}`);
  }

  const payload = await response.json();
  const selfLink = payload.links?.find((link) => link.rel === "self" && String(link.type || "").includes("activity+json"));
  if (!selfLink?.href) {
    throw new Error("No ActivityPub actor link in WebFinger response.");
  }

  return importRemoteActor(selfLink.href);
}

export function serializeRemoteActorForClient(actor, localUsername = "") {
  const host = safeHost(actor.actor_url);
  return {
    actorUrl: actor.actor_url,
    preferredUsername: actor.preferred_username,
    displayName: actor.display_name,
    handle: `@${actor.preferred_username}@${host}`,
    instanceHost: host,
    inboxUrl: actor.inbox_url,
    sharedInboxUrl: actor.shared_inbox_url || null,
    followingState: localUsername ? actor.following_state || "none" : "unknown"
  };
}

export function timelineSummary(posts) {
  const authors = new Set(posts.map((post) => post.author.handle));
  const instances = new Set(posts.map((post) => post.author.instance));

  return {
    posts: posts.length,
    authors: authors.size,
    instances: instances.size
  };
}

export async function listReports() {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().reports;
  }

  const { data, error } = await client.from("oracat_reports").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) {
    throw error;
  }
  return data || [];
}

export async function createReport({ reporterEmail, targetPostId = null, targetActor = null, reason, details = "" }) {
  const payload = {
    id: randomUUID(),
    reporter_email: String(reporterEmail || "").trim(),
    target_post_id: targetPostId ? String(targetPostId) : null,
    target_actor: targetActor ? String(targetActor) : null,
    reason: String(reason || "").trim(),
    details: String(details || "").trim(),
    state: "open",
    created_at: new Date().toISOString()
  };

  if (!payload.reporter_email || !payload.reason) {
    throw new Error("reporterEmail and reason are required.");
  }

  const client = serverClient();
  if (!client) {
    return pushFallbackReport(payload);
  }

  const { id: _id, ...insert } = payload;
  const { data, error } = await client.from("oracat_reports").insert(insert).select("*").single();
  if (error) {
    throw error;
  }
  return data;
}

export async function listModerationActions() {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().moderation_actions;
  }

  const { data, error } = await client.from("oracat_moderation_actions").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) {
    throw error;
  }
  return data || [];
}

export async function createModerationAction({ targetType, targetId, actionType, notes = "" }) {
  const payload = {
    id: randomUUID(),
    target_type: String(targetType || "").trim(),
    target_id: String(targetId || "").trim(),
    action_type: String(actionType || "").trim(),
    notes: String(notes || "").trim(),
    created_at: new Date().toISOString()
  };

  if (!payload.target_type || !payload.target_id || !payload.action_type) {
    throw new Error("targetType, targetId, actionType are required.");
  }

  const client = serverClient();
  if (!client) {
    return pushFallbackModerationAction(payload);
  }

  const { id: _id, ...insert } = payload;
  const { data, error } = await client.from("oracat_moderation_actions").insert(insert).select("*").single();
  if (error) {
    throw error;
  }
  return data;
}

export async function listInstanceRules() {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().instance_rules;
  }

  const { data, error } = await client.from("oracat_instance_rules").select("*").order("created_at", { ascending: true });
  if (error) {
    throw error;
  }
  return data || [];
}

export async function createInstanceRule({ title, body }) {
  const payload = {
    id: randomUUID(),
    title: String(title || "").trim(),
    body: String(body || "").trim(),
    created_at: new Date().toISOString()
  };

  if (!payload.title || !payload.body) {
    throw new Error("title and body are required.");
  }

  const client = serverClient();
  if (!client) {
    return pushFallbackInstanceRule(payload);
  }

  const { id: _id, ...insert } = payload;
  const { data, error } = await client.from("oracat_instance_rules").insert(insert).select("*").single();
  if (error) {
    throw error;
  }
  return data;
}

export async function listRiskEvents() {
  const client = serverClient();
  if (!client) {
    return readFallbackStore().risk_events;
  }

  const { data, error } = await client.from("oracat_risk_events").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) {
    throw error;
  }
  return data || [];
}

export async function createRiskEvent({ eventType, severity = "info", payload = {} }) {
  const insert = {
    id: randomUUID(),
    event_type: String(eventType || "").trim(),
    severity: String(severity || "info").trim() || "info",
    payload: payload && typeof payload === "object" ? payload : {},
    created_at: new Date().toISOString()
  };

  if (!insert.event_type) {
    throw new Error("eventType is required.");
  }

  const client = serverClient();
  if (!client) {
    return pushFallbackRiskEvent(insert);
  }

  const { id: _id, created_at: _createdAt, ...row } = insert;
  const { data, error } = await client.from("oracat_risk_events").insert(row).select("*").single();
  if (error) {
    throw error;
  }
  return data;
}

function uniqueUsername(existing, base) {
  if (!existing.includes(base)) {
    return base;
  }

  let index = 2;
  while (existing.includes(`${base}_${index}`)) {
    index += 1;
  }

  return `${base}_${index}`;
}

function serializeTimelinePost(post, author, host, viewerUsername = "", persistedPoll = null) {
  const published = new Date(post.published_at).getTime();
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
  const boostedBy = Array.isArray(post.boosted_by) ? post.boosted_by : [];
  const bookmarkedBy = Array.isArray(post.bookmarked_by) ? post.bookmarked_by : [];
  const poll = normalizePoll(persistedPoll || post.poll, viewerUsername);
  return {
    id: post.id,
    author: {
      name: author?.display_name || post.author_username,
      handle: `@${post.author_username}@${host}`,
      instance: host,
      badge: "Local",
      avatarUrl: author?.avatar_url || ""
    },
    audience: "Federated",
    minutesAgo: Math.max(0, Math.floor((Date.now() - published) / 60000)),
    content: post.content,
    visibility: post.visibility || "public",
    language: post.language || "",
    media: Array.isArray(post.media) ? post.media : [],
    poll,
    linkPreviews: Array.isArray(post.link_previews) ? post.link_previews : [],
    tags: extractTags(post.content),
    stats: { replies: comments.length, boosts: boostedBy.length, favorites: likedBy.length },
    source: "local",
    comments,
    viewerState: {
      liked: viewerUsername ? likedBy.includes(viewerUsername) : false,
      boosted: viewerUsername ? boostedBy.includes(viewerUsername) : false,
      bookmarked: viewerUsername ? bookmarkedBy.includes(viewerUsername) : false,
      canDelete: viewerUsername === post.author_username
    }
  };
}

function serializeRemoteTimelinePost(post, viewerUsername = "", persistedPoll = null) {
  const published = new Date(post.published_at).getTime();
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
  const boostedBy = Array.isArray(post.boosted_by) ? post.boosted_by : [];
  const bookmarkedBy = Array.isArray(post.bookmarked_by) ? post.bookmarked_by : [];
  const poll = normalizePoll(persistedPoll || post.poll, viewerUsername);
  return {
    id: post.id,
    author: {
      name: post.author_name,
      handle: post.author_handle,
      instance: post.instance_host,
      badge: "Federated",
      avatarUrl: post.avatar_url || ""
    },
    audience: "Federated",
    minutesAgo: Math.max(0, Math.floor((Date.now() - published) / 60000)),
    content: post.content,
    visibility: post.visibility || "public",
    language: post.language || "",
    media: Array.isArray(post.media) ? post.media : [],
    poll,
    linkPreviews: Array.isArray(post.link_previews) ? post.link_previews : [],
    tags: extractTags(post.content),
    stats: { replies: comments.length, boosts: boostedBy.length, favorites: likedBy.length },
    source: "remote",
    comments,
    viewerState: {
      liked: viewerUsername ? likedBy.includes(viewerUsername) : false,
      boosted: viewerUsername ? boostedBy.includes(viewerUsername) : false,
      bookmarked: viewerUsername ? bookmarkedBy.includes(viewerUsername) : false,
      canDelete: false
    }
  };
}

function extractTags(content) {
  const tags = Array.from(new Set((content.match(/#([a-z0-9_]+)/gi) || []).map((tag) => tag.slice(1).toLowerCase())));
  return tags.length > 0 ? tags : ["mintcat"];
}

function sortTimelinePosts(a, b) {
  return a.minutesAgo - b.minutesAgo;
}

export async function importRemoteActor(actorUrlValue) {
  const response = await fetch(actorUrlValue, {
    headers: {
      Accept: "application/activity+json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch remote actor: ${response.status}`);
  }

  const payload = await response.json();
  return {
    actor_url: payload.id,
    preferred_username: payload.preferredUsername || payload.name || "remote",
    display_name: payload.name || payload.preferredUsername || "Remote actor",
    inbox_url: payload.inbox,
    shared_inbox_url: payload.endpoints?.sharedInbox || null,
    public_key_pem: payload.publicKey?.publicKeyPem || null
  };
}

export async function getFollowingProfiles(localUsername) {
  const follows = await getFollowing(localUsername);
  const client = serverClient();

  if (!client) {
    const store = readFallbackStore();
    return follows
      .map((follow) => {
        const actor = store.remote_actors.find((entry) => entry.actor_url === follow.remote_actor_url);
        return actor ? serializeRemoteActorForClient({ ...actor, following_state: follow.state }, localUsername) : null;
      })
      .filter(Boolean);
  }

  const actorUrls = follows.map((entry) => entry.remote_actor_url);
  if (actorUrls.length === 0) {
    return [];
  }

  const { data: actors } = await client.from("oracat_remote_actors").select("*").in("actor_url", actorUrls);
  const actorMap = new Map((actors || []).map((entry) => [entry.actor_url, entry]));
  return follows
    .map((follow) => {
      const actor = actorMap.get(follow.remote_actor_url);
      return actor ? serializeRemoteActorForClient({ ...actor, following_state: follow.state }, localUsername) : null;
    })
    .filter(Boolean);
}

export async function enqueueCreateDeliveries({ account, post, request }) {
  const targets = await getDeliveryTargets(account.username);
  const baseUrl = getBaseUrl(request);
  const jobs = await Promise.all(
    targets.map((target) =>
      createDeliveryJob({
        type: "deliver_create",
        localUsername: account.username,
        payload: {
          account_username: account.username,
          post_id: post.id,
          inbox_url: target.inbox_url,
          base_url: baseUrl
        }
      })
    )
  );

  return jobs;
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch (_error) {
    return "remote";
  }
}

function applyLocalPostMutation(post, username, action, content) {
  const likedBy = toggleArray(post.liked_by, username, action === "like");
  const boostedBy = toggleArray(post.boosted_by, username, action === "boost");
  const bookmarkedBy = toggleArray(post.bookmarked_by, username, action === "bookmark");
  const comments = Array.isArray(post.comments) ? [...post.comments] : [];

  if (action === "comment" && content.trim()) {
    comments.push({
      id: randomUUID(),
      author: username,
      content: content.trim(),
      created_at: new Date().toISOString()
    });
  }

  if (action === "delete" && post.author_username === username) {
    return {
      ...post,
      content: "[deleted]",
      summary: "deleted"
    };
  }

  if (action === "vote" && post.poll && Array.isArray(post.poll.options)) {
    const nextPoll = {
      options: [...post.poll.options],
      votes: { ...(post.poll.votes || {}) }
    };
    if (nextPoll.options.includes(content)) {
      nextPoll.votes[username] = content;
    }
    return {
      liked_by: likedBy,
      boosted_by: boostedBy,
      bookmarked_by: bookmarkedBy,
      comments,
      poll: nextPoll
    };
  }

  return {
    liked_by: likedBy,
    boosted_by: boostedBy,
    bookmarked_by: bookmarkedBy,
    comments
  };
}

async function createNotificationForMutation({ post, viewer, action, content = "", source }) {
  if (!["like", "boost", "comment"].includes(action) || source !== "local") {
    return null;
  }

  if (!post?.author_username || post.author_username === viewer.username) {
    return null;
  }

  const notification = {
    id: randomUUID(),
    recipient_username: post.author_username,
    actor_username: viewer.username,
    actor_display_name: viewer.display_name || viewer.username,
    type: action,
    post_id: post.id,
    summary: action === "comment" ? String(content || "").trim().slice(0, 180) : "",
    read_at: null,
    created_at: new Date().toISOString()
  };

  const client = serverClient();
  if (!client) {
    return pushFallbackNotification(notification);
  }

  try {
    const { id: _id, ...insert } = notification;
    const { data, error } = await client.from("oracat_notifications").insert(insert).select("*").single();
    if (error) {
      throw error;
    }
    return data;
  } catch (_error) {
    return null;
  }
}

function applyRemotePostMutation(post, username, action, content) {
  const likedBy = toggleArray(post.liked_by, username, action === "like");
  const boostedBy = toggleArray(post.boosted_by, username, action === "boost");
  const bookmarkedBy = toggleArray(post.bookmarked_by, username, action === "bookmark");
  const comments = Array.isArray(post.comments) ? [...post.comments] : [];

  if (action === "comment" && content.trim()) {
    comments.push({
      id: randomUUID(),
      author: username,
      content: content.trim(),
      created_at: new Date().toISOString()
    });
  }

  if (action === "vote" && post.poll && Array.isArray(post.poll.options)) {
    const nextPoll = {
      options: [...post.poll.options],
      votes: { ...(post.poll.votes || {}) }
    };
    if (nextPoll.options.includes(content)) {
      nextPoll.votes[username] = content;
    }
    return {
      liked_by: likedBy,
      boosted_by: boostedBy,
      bookmarked_by: bookmarkedBy,
      comments,
      poll: nextPoll
    };
  }

  return {
    liked_by: likedBy,
    boosted_by: boostedBy,
    bookmarked_by: bookmarkedBy,
    comments
  };
}

function toggleArray(items = [], username, shouldToggle) {
  const next = Array.isArray(items) ? [...items] : [];
  const index = next.indexOf(username);

  if (!shouldToggle) {
    return next;
  }

  if (index >= 0) {
    next.splice(index, 1);
  } else {
    next.push(username);
  }

  return next;
}

function normalizePoll(poll, viewerUsername = "") {
  if (!poll || !Array.isArray(poll.options)) {
    return null;
  }

  const votes = poll.votes && typeof poll.votes === "object" ? poll.votes : {};
  const counts = poll.options.reduce((accumulator, option) => {
    accumulator[option] = 0;
    return accumulator;
  }, {});

  Object.values(votes).forEach((option) => {
    if (typeof counts[option] === "number") {
      counts[option] += 1;
    }
  });

  return {
    options: poll.options,
    counts,
    totalVotes: Object.keys(votes).length,
    viewerVote: viewerUsername ? votes[viewerUsername] || null : null
  };
}

async function getPollVoteMap(client, localPosts, remotePosts, viewerUsername = "") {
  const localIds = localPosts.filter((post) => Array.isArray(post.poll?.options)).map((post) => post.id);
  const remoteIds = remotePosts.filter((post) => Array.isArray(post.poll?.options)).map((post) => post.id);

  const map = {
    local: new Map(),
    remote: new Map()
  };

  if (localIds.length === 0 && remoteIds.length === 0) {
    return map;
  }

  const filters = [];
  if (localIds.length) {
    filters.push(`and(post_source.eq.local,post_id.in.(${localIds.join(",")}))`);
  }
  if (remoteIds.length) {
    filters.push(`and(post_source.eq.remote,post_id.in.(${remoteIds.join(",")}))`);
  }

  const { data: votes } = await client
    .from("oracat_poll_votes")
    .select("post_source,post_id,voter_username,option_text")
    .or(filters.join(","));

  for (const post of localPosts) {
    if (Array.isArray(post.poll?.options)) {
      map.local.set(post.id, normalizePollFromRows(post.poll, votes || [], "local", post.id, viewerUsername));
    }
  }

  for (const post of remotePosts) {
    if (Array.isArray(post.poll?.options)) {
      map.remote.set(post.id, normalizePollFromRows(post.poll, votes || [], "remote", post.id, viewerUsername));
    }
  }

  return map;
}

function normalizePollFromRows(poll, rows, source, postId, viewerUsername = "") {
  const filtered = rows.filter((row) => row.post_source === source && row.post_id === postId);
  const votes = {};
  for (const row of filtered) {
    votes[row.voter_username] = row.option_text;
  }
  return normalizePoll({ options: poll.options, votes }, viewerUsername);
}

async function persistPollVote(client, { postSource, postId, voterUsername, optionText }) {
  const { error } = await client.from("oracat_poll_votes").upsert(
    {
      post_source: postSource,
      post_id: postId,
      voter_username: voterUsername,
      option_text: optionText
    },
    { onConflict: "post_source,post_id,voter_username" }
  );

  if (error) {
    throw error;
  }
}
