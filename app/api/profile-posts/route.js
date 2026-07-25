import { NextResponse } from "next/server";
import { listUserPosts } from "../../../lib/oracat/repository";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ account: null, posts: [] });
  }
  const result = await listUserPosts(username, request);
  return NextResponse.json(result);
}