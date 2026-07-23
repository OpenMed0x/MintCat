import { NextResponse } from "next/server";
import { createInstanceRule, listInstanceRules } from "../../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rules = await listInstanceRules();
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  try {
    const rule = await createInstanceRule(body);
    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    const status = /required/.test(error.message || "") ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
