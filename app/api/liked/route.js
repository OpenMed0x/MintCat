import { NextResponse } from "next/server";
import { listLikedPosts } from "../../../lib/oracat/repository";

export const dynamic = "force-dynamic";


export async function GET(request) {

  const email =
    request.nextUrl.searchParams.get("email") || "";


  const username =
    email.split("@")[0];


  const posts = await listLikedPosts(
    username,
    request
  );


  return NextResponse.json({
    posts
  });

}