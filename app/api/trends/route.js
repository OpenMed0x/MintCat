import { NextResponse } from "next/server";
import { listTimeline } from "../../../lib/oracat/repository";

export const dynamic = "force-dynamic";

export async function GET(request) {

  const posts = await listTimeline(request);

  const counter = {};
  posts.forEach((post) => {

  const tags = post.tags || [];

  const favorites = post.stats?.favorites || 0;
  const boosts = post.stats?.boosts || 0;
  const replies = post.stats?.replies || 0;


  // 基础互动分
  const engagementScore =
    favorites * 2 +
    boosts * 4 +
    replies * 3;


  // 时间衰减
  const ageHours =
    (Date.now() - new Date(post.publishedAt).getTime()) 
    / (1000 * 60 * 60);


  const freshnessScore =
    Math.max(0.1, 1 / (1 + ageHours / 24));


  const postScore =
    (1 + engagementScore) * freshnessScore;


  tags.forEach((tag)=>{

    const key = tag.toLowerCase();

    counter[key] =
      (counter[key] || 0) + postScore;

  });

});


 const trends = Object.entries(counter)
  .map(([tag,score])=>({
    tag,
    score: Number(score.toFixed(2))
  }))
  .sort((a,b)=>b.score-a.score)
  .slice(0,10);


  return NextResponse.json({
  trends
});

}