import { randomUUID } from "node:crypto";
import {
  ACTIVITY_STREAMS_CONTEXT,
  PUBLIC_ADDRESS,
  activityUrl,
  actorUrl,
  followersUrl,
  followingUrl,
  inboxUrl,
  noteUrl,
  outboxUrl
} from "./config";

export function actorDocument(baseUrl, account) {
  const id = actorUrl(baseUrl, account.username);

  return {
    "@context": [
      ACTIVITY_STREAMS_CONTEXT,
      "https://w3id.org/security/v1"
    ],
    id,
    type: "Person",
    preferredUsername: account.username,
    name: account.display_name,
    summary: account.bio || "",
    inbox: inboxUrl(baseUrl, account.username),
    outbox: outboxUrl(baseUrl, account.username),
    followers: followersUrl(baseUrl, account.username),
    following: followingUrl(baseUrl, account.username),
    discoverable: true,
    published: account.created_at,
    ...(account.avatar_url ? {
      icon: {
        type: "Image",
        mediaType: "image/jpeg",
        url: account.avatar_url
      }
    } : {}),
    publicKey: {
      id: `${id}#main-key`,
      owner: id,
      publicKeyPem: account.public_key_pem
    }
  };
}

export function noteObject(baseUrl, account, post) {
  const actor = actorUrl(baseUrl, account.username);
  const id = noteUrl(baseUrl, account.username, post.id);

  return {
    "@context": ACTIVITY_STREAMS_CONTEXT,
    id,
    type: "Note",
    attributedTo: actor,
    to: [PUBLIC_ADDRESS],
    cc: [followersUrl(baseUrl, account.username)],
    published: post.published_at,
    summary: post.summary || null,
    content: `<p>${escapeHtml(post.content).replace(/\n/g, "<br>")}</p>`,
    contentMap: {
      en: post.content
    }
  };
}

export function createActivity(baseUrl, account, post) {
  return {
    "@context": ACTIVITY_STREAMS_CONTEXT,
    id: activityUrl(baseUrl, account.username, post.id),
    type: "Create",
    actor: actorUrl(baseUrl, account.username),
    to: [PUBLIC_ADDRESS],
    cc: [followersUrl(baseUrl, account.username)],
    published: post.published_at,
    object: noteObject(baseUrl, account, post)
  };
}

export function orderedCollection(id, items) {
  return {
    "@context": ACTIVITY_STREAMS_CONTEXT,
    id,
    type: "OrderedCollection",
    totalItems: items.length,
    orderedItems: items
  };
}

export function followAcceptActivity(baseUrl, localAccount, remoteActor, followActivity) {
  return {
    "@context": ACTIVITY_STREAMS_CONTEXT,
    id: `${actorUrl(baseUrl, localAccount.username)}#accepts/${randomUUID()}`,
    type: "Accept",
    actor: actorUrl(baseUrl, localAccount.username),
    object: followActivity,
    to: [remoteActor.actor_url]
  };
}

export function followActivity(baseUrl, localAccount, remoteActor) {
  const actor = actorUrl(baseUrl, localAccount.username);

  return {
    "@context": ACTIVITY_STREAMS_CONTEXT,
    id: `${actor}#follows/${randomUUID()}`,
    type: "Follow",
    actor,
    object: remoteActor.actor_url,
    to: [remoteActor.actor_url]
  };
}

export function webfingerDocument(resource, actor) {
  return {
    subject: resource,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: actor.id
      }
    ]
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
