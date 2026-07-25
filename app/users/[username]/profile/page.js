"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState({ account: null, posts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profile-posts?username=${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return <div style={{ padding: "2rem" }}>加载中...</div>;
  }

  if (!data.account) {
    return <div style={{ padding: "2rem" }}>找不到这个用户。</div>;
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "#ddd" }}>
          {data.account.avatar_url ? (
            <img src={data.account.avatar_url} alt={data.account.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{data.account.display_name}</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>@{data.account.username}</p>
          {data.account.bio ? <p style={{ marginTop: "0.5rem" }}>{data.account.bio}</p> : null}
        </div>
      </div>
      <h2>历史帖子（{data.posts.length}）</h2>
      <div>
        {data.posts.map((post) => (
          <article key={post.id} style={{ borderBottom: "1px solid #eee", padding: "1rem 0" }}>
            <p>{post.content}</p>
            <span style={{ fontSize: "0.85em", opacity: 0.6 }}>{post.minutesAgo} 分钟前</span>
          </article>
        ))}
      </div>
    </div>
  );
}