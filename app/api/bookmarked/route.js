import { NextResponse } from "next/server";
import { listBookmarkedPosts } from "../../../lib/oracat/repository";

export const dynamic = "force-dynamic";


export async function GET(request){

  const email =
    request.nextUrl.searchParams.get("email") || "";


  const username =
    email.split("@")[0];


  const posts = await listBookmarkedPosts(
    username,
    request
  );


  return NextResponse.json({
    posts
  });

}