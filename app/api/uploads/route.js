import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { checkRateLimit } from "../../../lib/oracat/rate-limit";
import { recordRiskEvent } from "../../../lib/oracat/risk-events";

export const dynamic = "force-dynamic";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request) {
  const rate = checkRateLimit(request, "uploads:create", { limit: 30, windowMs: 10 * 60_000 });
  if (!rate.ok) {
    await recordRiskEvent("rate_limit_triggered", {
      route: "/api/uploads",
      retryAfter: rate.retryAfter
    }, "warning");
    return NextResponse.json({ error: "Rate limit exceeded.", retryAfter: rate.retryAfter }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  if (!String(file.type || "").startsWith("image/")) {
    await recordRiskEvent("upload_rejected", {
      route: "/api/uploads",
      reason: "invalid_type",
      fileType: file.type || "unknown"
    }, "warning");
    return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    await recordRiskEvent("upload_rejected", {
      route: "/api/uploads",
      reason: "file_too_large",
      fileSize: file.size
    }, "warning");
    return NextResponse.json({ error: "Image size must be 5MB or smaller." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const client = serverClient();

  if (!client) {
    const mimeType = file.type || "application/octet-stream";
    const url = `data:${mimeType};base64,${buffer.toString("base64")}`;
    return NextResponse.json({
      ok: true,
      id: randomUUID(),
      url
    });
  }

  const bucket = process.env.MINTCAT_MEDIA_BUCKET || "mintcat-media";
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `posts/${Date.now()}-${randomUUID()}.${extension}`;
  const contentType = file.type || "application/octet-stream";

  const { error } = await client.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false
  });

  if (error) {
    await recordRiskEvent("upload_failed", {
      route: "/api/uploads",
      bucket,
      message: error.message
    }, "critical");
    return NextResponse.json(
      {
        error: `Upload failed. Ensure bucket "${bucket}" exists and storage is configured.`
      },
      { status: 500 }
    );
  }


  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    ok: true,
    id: path,
    url: data.publicUrl
  });
}
