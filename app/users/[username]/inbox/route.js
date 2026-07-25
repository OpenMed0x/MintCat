import { NextResponse } from "next/server";
import { deliverFollowAccept } from "../../../../lib/oracat/delivery";
import { buildDigest, buildSigningString, verifySignature } from "../../../../lib/oracat/http-signatures";
import { getBaseUrl } from "../../../../lib/oracat/config";
import {
  acceptFollow,
  getAccountByUsername,
  importRemoteActor,
  markFollowingAccepted,
  saveInboxActivity,
  saveRemotePost,
  upsertRemoteActor,
  createFollowNotification,
  applyRemoteInteractionToLocalPost
} from "../../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { username } = await params;
  const localAccount = await getAccountByUsername(username);
  if (!localAccount) {
    return NextResponse.json({ error: "Unknown actor." }, { status: 404 });
  }

  const rawBody = await request.text();
  const activity = JSON.parse(rawBody || "{}");
  const remoteActor = activity.actor ? await safeImportRemoteActor(activity.actor) : null;
  const digest = request.headers.get("digest") || buildDigest(rawBody);
  const signingString = buildSigningString({
    path: request.nextUrl.pathname,
    host: request.headers.get("host") || request.nextUrl.host,
    date: request.headers.get("date") || "",
    digest
  });
  const verified = verifySignature({
    publicKeyPem: remoteActor?.public_key_pem,
    signatureHeader: request.headers.get("signature"),
    signingString
  });

  await saveInboxActivity({
    localUsername: username,
    activity,
    verified
  });

  if (remoteActor) {
    await upsertRemoteActor(remoteActor);
  }

  if (activity.type === "Follow" && remoteActor) {
    await acceptFollow({
      localUsername: username,
      remoteActor
    });
    await createFollowNotification({
    recipientUsername: username,
    actorUsername: remoteActor.preferred_username,
    actorDisplayName: remoteActor.display_name
  });
    deliverFollowAccept({
      localAccount,
      remoteActor,
      followActivity: activity,
      baseUrl: getBaseUrl(request)
    }).catch(() => {});
  }

  if (activity.type === "Create" && activity.object?.type === "Note") {
    await saveRemotePost({
      id: activity.object.id || activity.id,
      actor_url: activity.actor,
      author_name: remoteActor?.display_name || remoteActor?.preferred_username || "Remote actor",
      author_handle: remoteActor
        ? `@${remoteActor.preferred_username}@${new URL(remoteActor.actor_url).host}`
        : activity.actor,
      instance_host: remoteActor ? new URL(remoteActor.actor_url).host : "remote",
      content: stripHtml(activity.object.content || activity.object.name || ""),
      published_at: activity.object.published || new Date().toISOString(),
      raw_object: activity.object
    });
  }
  if (activity.type === "Like") {
    const postId = extractPostIdFromObject(activity.object, username);
    if (postId) {
      const actorHandle = remoteActor
        ? `${remoteActor.preferred_username}@${new URL(remoteActor.actor_url).host}`
        : activity.actor;
      await applyRemoteInteractionToLocalPost({ postId, actorHandle, action: "like" });
    }
  }
  if (activity.type === "Announce") {
    const postId = extractPostIdFromObject(activity.object, username);
    if (postId) {
      const actorHandle = remoteActor
        ? `${remoteActor.preferred_username}@${new URL(remoteActor.actor_url).host}`
        : activity.actor;
      await applyRemoteInteractionToLocalPost({ postId, actorHandle, action: "boost" });
    }
  }

  if (activity.type === "Accept") {
    const acceptedActorUrl =
      typeof activity.object === "string" ? activity.object : activity.object?.object || activity.object?.id || activity.actor;

    if (acceptedActorUrl) {
      await markFollowingAccepted({
        localUsername: username,
        remoteActorUrl: activity.actor
      });
    }
  }

  return new NextResponse(null, { status: acceptedStatus() });
}

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function safeImportRemoteActor(actorUrl) {
  return importRemoteActor(actorUrl).catch(() => null);
}

function acceptedStatus() {
  return 202;
}
// 加一个解析帖子id的工具函数
function extractPostIdFromObject(object, username) {
  const objectUrl = typeof object === "string" ? object : object?.id;
  if (!objectUrl) {
    return null;
  }
  const marker = `/users/${username}/statuses/`;
  const index = objectUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return objectUrl.slice(index + marker.length);
}