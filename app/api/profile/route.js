import { NextResponse } from "next/server";
import { getAccountByEmail, updateProfile } from "../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const email = request.nextUrl.searchParams.get("email") || "";
  if (!email) {
    return NextResponse.json({ profile: null });
  }

  const profile = await getAccountByEmail(email);
  return NextResponse.json({
    profile: profile
      ? {
          email: profile.email,
          displayName: profile.display_name,
          username: profile.username,
          avatarUrl: profile.avatar_url || "",
          bio: profile.bio || ""
        }
      : null
  });
}

export async function POST(request) {
  const body = await request.json();
  const email = String(body.email || "").trim();
  const updates = {};
  if ("avatarUrl" in body) {
    updates.avatarUrl = String(body.avatarUrl || "").trim();
  }
  if ("displayName" in body) {
    updates.displayName = String(body.displayName || "").trim();
  }
  if ("bio" in body) {
    updates.
    bio = String(body.bio || "").trim();
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const profile = await updateProfile({
    email,
    ...updates
  });

  return NextResponse.json({
    ok: true,
    profile: profile
      ? {
          email: profile.email,
          displayName: profile.display_name,
          username: profile.username,
          avatarUrl: profile.avatar_url || "",
          bio: profile.bio || ""
        }
      : null
  });
}
