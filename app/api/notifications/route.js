import { NextResponse } from "next/server";
import { listNotifications, markNotificationRead } from "../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const email = request.nextUrl.searchParams.get("email") || "";
  if (!email) {
    return NextResponse.json({ notifications: [] });
  }

  try {
    const notifications = await listNotifications(email);
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load notifications." }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const email = String(body.email || "").trim();
  const notificationId = String(body.notificationId || "").trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const notifications = await markNotificationRead({ email, notificationId });
    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update notifications." }, { status: 500 });
  }
}
