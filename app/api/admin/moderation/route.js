import { NextResponse } from "next/server";
import { createModerationAction, listModerationActions } from "../../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actions = await listModerationActions();
    return NextResponse.json({ actions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  try {
    const action = await createModerationAction(body);
    return NextResponse.json({ ok: true, action });
  } catch (error) {
    const status = /required/.test(error.message || "") ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
