import { NextResponse } from "next/server";
import { normalizeUsername } from "../../../lib/oracat/config";
import { getFollowerProfiles } from "../../../lib/oracat/repository";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ followers: [] });
  }
  const followers = await getFollowerProfiles(normalizeUsername(email));
  return NextResponse.json({ followers });
}