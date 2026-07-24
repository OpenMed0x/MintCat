import { normalizeUsername } from "../../../lib/oracat/config";
import { NextResponse } from "next/server";
import {
  createDeliveryJob,
  ensureLocalAccount,
  followRemoteActor,
  getFollowingProfiles,
  searchRemoteAccount,
  serializeRemoteActorForClient,
  upsertRemoteActor,
  unfollowRemoteActor
} from "../../../lib/oracat/repository";
import { getBaseUrl } from "../../../lib/oracat/config";
export const dynamic = "force-dynamic";
export async function POST(request) {
  const body = await request.json();
  const query = String(body.query || body.actorUrl || "").trim();
  const email = String(body.email || "").trim();
  const displayName = String(body.displayName || "").trim();
  if (!query || !email || !displayName) {
    return NextResponse.json({ error: "query, email and displayName are required." }, { status: 400 });
  }
  const localAccount = await ensureLocalAccount({
    email,
    displayName,
    request
  });
  const remoteActor = await searchRemoteAccount(query);
  if (!remoteActor) {
    return NextResponse.json({ error: "Remote actor not found." }, { status: 404 });
  }
  const storedActor = await upsertRemoteActor(remoteActor);
  await followRemoteActor({
    localUsername: localAccount.username,
    remoteActor: storedActor
  });
  await createDeliveryJob({
    type: "deliver_follow",
    localUsername: localAccount.username,
    payload: {
      account_username: localAccount.username,
      remote_actor_url: storedActor.actor_url,
      base_url: getBaseUrl(request)
    }
  });
  return NextResponse.json({
    ok: true,
    actor: serializeRemoteActorForClient({ ...storedActor, following_state: "pending" })
  });
}
export async function DELETE(request) {
  const body = await request.json();
  const actorUrl = String(body.actorUrl || "").trim();
  const email = String(body.email || "").trim();
  const displayName = String(body.displayName || "").trim();
  if (!actorUrl || !email) {
    return NextResponse.json({ error: "actorUrl and email are required." }, { status: 400 });
  }
  const localAccount = await ensureLocalAccount({
    email,
    displayName,
    request
  });
  await unfollowRemoteActor({
    localUsername: localAccount.username,
    remoteActorUrl: actorUrl
  });
  await createDeliveryJob({
    type: "deliver_unfollow",
    localUsername: localAccount.username,
    payload: {
      account_username: localAccount.username,
      remote_actor_url: actorUrl,
      base_url: getBaseUrl(request)
    }
  });
  return NextResponse.json({ ok: true });
}
export async function GET(request) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ following: [] });
  }
  const following = await getFollowingProfiles(normalizeUsername(email));
  return NextResponse.json({ following });
}