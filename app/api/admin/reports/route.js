import { NextResponse } from "next/server";
import { createReport, listReports } from "../../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reports = await listReports();
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  try {
    const report = await createReport(body);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const status = /required/.test(error.message || "") ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
