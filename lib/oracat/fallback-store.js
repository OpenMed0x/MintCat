import { generateKeyPairSync, randomUUID } from "node:crypto";

function getStore() {
  if (!globalThis.__oracatFallbackStore) {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    globalThis.__oracatFallbackStore = {
      accounts: [
        {
          id: randomUUID(),
          username: "mintcat",
          email: "team@mintcat.local",
          display_name: "MintCat Studio",
          bio: "Core account for the federated MintCat demo instance.",
          avatar_url: "",
          public_key_pem: publicKey,
          private_key_pem: privateKey,
          created_at: new Date().toISOString()
        }
      ],
      posts: [
        {
          id: "seed-local-1",
          author_username: "mintcat",
          content:
            "MintCat now exposes WebFinger, Actor, Inbox, and Outbox endpoints so the app can evolve into a real federated social platform instead of a static mock.",
          summary: "",
          visibility: "public",
          liked_by: [],
          boosted_by: [],
          bookmarked_by: [],
          comments: [],
          published_at: new Date(Date.now() - 1000 * 60 * 18).toISOString()
        }
      ],
      remote_actors: [],
      follows: [],
      following: [],
      inbox_activities: [],
      remote_posts: [],
      delivery_jobs: [],
      notifications: [],
      reports: [],
      moderation_actions: [],
      instance_rules: [
        {
          id: randomUUID(),
          title: "Respect community boundaries",
          body: "No harassment, targeted abuse, spam, or coordinated manipulation.",
          created_at: new Date().toISOString()
        }
      ],
      risk_events: []
    };
  }

  return globalThis.__oracatFallbackStore;
}

export function readFallbackStore() {
  return getStore();
}

export function createFallbackAccount(account) {
  const store = getStore();
  store.accounts.push(account);
  return account;
}

export function updateFallbackAccount(username, updater) {
  const store = getStore();
  const index = store.accounts.findIndex((entry) => entry.username === username);
  if (index === -1) {
    return null;
  }

  store.accounts[index] = {
    ...store.accounts[index],
    ...updater
  };

  return store.accounts[index];
}

export function pushFallbackPost(post) {
  const store = getStore();
  store.posts.unshift(post);
  return post;
}

export function updateFallbackPost(id, updater) {
  const store = getStore();
  const index = store.posts.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return null;
  }

  store.posts[index] = {
    ...store.posts[index],
    ...updater
  };

  return store.posts[index];
}

export function pushFallbackInboxActivity(activity) {
  const store = getStore();
  store.inbox_activities.unshift(activity);
  return activity;
}

export function pushFallbackRemoteActor(actor) {
  const store = getStore();
  const existing = store.remote_actors.find((entry) => entry.actor_url === actor.actor_url);
  if (existing) {
    Object.assign(existing, actor);
    return existing;
  }

  store.remote_actors.push(actor);
  return actor;
}

export function pushFallbackFollow(follow) {
  const store = getStore();
  const existing = store.follows.find(
    (entry) => entry.local_username === follow.local_username && entry.remote_actor_url === follow.remote_actor_url
  );

  if (existing) {
    Object.assign(existing, follow);
    return existing;
  }

  store.follows.push(follow);
  return follow;
}

export function pushFallbackRemotePost(post) {
  const store = getStore();
  store.remote_posts.unshift(post);
  return post;
}

export function pushFallbackFollowing(following) {
  const store = getStore();
  const existing = store.following.find(
    (entry) => entry.local_username === following.local_username && entry.remote_actor_url === following.remote_actor_url
  );

  if (existing) {
    Object.assign(existing, following);
    return existing;
  }

  store.following.push(following);
  return following;
}

export function pushFallbackDeliveryJob(job) {
  const store = getStore();
  store.delivery_jobs.push(job);
  return job;
}

export function updateFallbackDeliveryJob(id, updater) {
  const store = getStore();
  const index = store.delivery_jobs.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return null;
  }

  store.delivery_jobs[index] = {
    ...store.delivery_jobs[index],
    ...updater
  };

  return store.delivery_jobs[index];
}

export function pushFallbackNotification(notification) {
  const store = getStore();
  store.notifications.unshift(notification);
  return notification;
}

export function updateFallbackNotification(id, updater) {
  const store = getStore();
  const index = store.notifications.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return null;
  }

  store.notifications[index] = {
    ...store.notifications[index],
    ...updater
  };

  return store.notifications[index];
}

export function pushFallbackReport(report) {
  const store = getStore();
  store.reports.unshift(report);
  return report;
}

export function pushFallbackModerationAction(action) {
  const store = getStore();
  store.moderation_actions.unshift(action);
  return action;
}

export function pushFallbackInstanceRule(rule) {
  const store = getStore();
  store.instance_rules.push(rule);
  return rule;
}

export function pushFallbackRiskEvent(event) {
  const store = getStore();
  store.risk_events.unshift(event);
  return event;
}
