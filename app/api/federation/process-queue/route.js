import { NextResponse } from "next/server";
import { deliverCreateToFollowers, deliverFollow,deliverUnfollow, deliverFollowAccept } from "../../../../lib/oracat/delivery";
import { recordRiskEvent } from "../../../../lib/oracat/risk-events";
import {
  claimPendingDeliveryJobs,
  getAccountByUsername,
  getPostById,
  importRemoteActor,
  markDeliveryJobFailed,
  markDeliveryJobSucceeded
} from "../../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const token = process.env.ORACAT_QUEUE_TOKEN;
  if (token && request.headers.get("x-oracat-queue-token") !== token) {
    await recordRiskEvent("queue_unauthorized", {
      route: "/api/federation/process-queue"
    }, "warning");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const jobs = await claimPendingDeliveryJobs(20);
  const results = [];

  for (const job of jobs) {
    if (job.job_type === "deliver_follow_accept") {
  const account = await getAccountByUsername(job.payload.account_username);
  if (!account) {
    throw new Error("Local account missing.");
  }
  const remoteActor = await importRemoteActor(job.payload.remote_actor_url, account);
  await deliverFollowAccept({
    localAccount: account,
    remoteActor,
    followActivity: job.payload.follow_activity,
    baseUrl: job.payload.base_url
  });
  return;
}
    try {
      await processJob(job);
      await markDeliveryJobSucceeded(job.id);
      results.push({ id: job.id, state: "completed" });
    } catch (error) {
      await markDeliveryJobFailed(job, error.message);
      await recordRiskEvent("queue_job_failed", {
        jobId: job.id,
        jobType: job.job_type,
        message: error.message
      }, Number(job.attempt_count || 0) + 1 >= Number(job.max_attempts || 8) ? "critical" : "warning");
      results.push({ id: job.id, state: "failed", error: error.message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results
  });
}

async function processJob(job) {
  if (job.job_type === "deliver_create") {
    const account = await getAccountByUsername(job.payload.account_username);
    const post = await getPostById(job.payload.post_id);
    if (!account || !post) {
      throw new Error("Local account or post missing.");
    }

    await deliverCreateToFollowers({
      account,
      post,
      baseUrl: job.payload.base_url,
      targets: [{ inbox_url: job.payload.inbox_url }]
    });
    return;
  }
if (job.job_type === "deliver_follow") {
  const account = await getAccountByUsername(job.payload.account_username);
  if (!account) {
    throw new Error("Local account missing.");
  }
  const remoteActor = await importRemoteActor(job.payload.remote_actor_url, account);
  await deliverFollow({
    localAccount: account,
    remoteActor,
    baseUrl: job.payload.base_url
  });
  return;
}

  if (job.job_type === "deliver_unfollow") {
    const account = await getAccountByUsername(job.payload.account_username);
    if (!account) {
      throw new Error("Local account missing.");
    }
    const remoteActor = await importRemoteActor(job.payload.remote_actor_url, account);
    await deliverUnfollow({
      localAccount: account,
      remoteActor,
      originalFollowId: `${account.username}#follows/undo`,
      baseUrl: job.payload.base_url
    });
    return;
  }

  throw new Error(`Unsupported job type: ${job.job_type}`);
}
