import { NextResponse } from "next/server";
import { createRiskEvent, listRiskEvents } from "../../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await listRiskEvents();
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();

  let payload = {};
  if (typeof body.payload === "string" && body.payload.trim()) {
    try {
      payload = JSON.parse(body.payload);
    } catch (_error) {
      return NextResponse.json({ error: "payload must be valid JSON." }, { status: 400 });
    }
  } else if (body.payload && typeof body.payload === "object") {
    payload = body.payload;
  }

  try {
    const event = await createRiskEvent({
      eventType: body.eventType,
      severity: body.severity,
      payload
    });
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    const status = /required/.test(error.message || "") ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
