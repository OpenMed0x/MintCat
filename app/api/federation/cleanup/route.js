import { NextResponse } from "next/server";
import { serverClient } from "../../../../lib/oracat/supabase-server";
export const dynamic = "force-dynamic";
export async function POST(request) {
  const token = process.env.ORACAT_QUEUE_TOKEN;
  if (token && request.headers.get("x-oracat-queue-token") !== token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const client = serverClient();
  if (!client) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { error: remoteError, count: remoteCount } = await client
    .from("oracat_remote_posts")
    .delete({ count: "exact" })
    .lt("published_at", cutoff);
  return NextResponse.json({
    ok: true,
    deletedRemotePosts: remoteCount || 0,
    errors: [remoteError?.message].filter(Boolean)
  });
}