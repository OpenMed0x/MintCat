"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MintCatLogo from "./MintCatLogo";

const emojiLibrary = [
  "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳",
  "😏", "😒", "🙂‍↔️", "🙂‍↕️", "😬", "😮‍💨", "😌", "🥹", "😳", "🤩",
  "🤗", "🤭", "🫢", "🫣", "🤫", "🤔", "🫡", "🤐", "🤥", "😶",
  "😶‍🌫️", "😐", "😑", "😯", "😦", "😧", "😮", "😲", "🥱", "😴",
  "🤤", "😪", "😵", "😵‍💫", "🤯", "🥺", "😢", "😭", "😤", "😠",
  "😡", "🤬", "🤡", "👻", "💚", "🤍", "🩵", "💫", "✨", "🌿",
  "🍀", "🌱", "🌸", "🌼", "🌙", "⭐", "☁️", "🔥", "🎉", "🎈",
  "🎵", "🎧", "📷", "📚", "💻", "📝", "☕", "🍵", "🍰", "🧋",
  "🐱", "😺", "😸", "😹", "😻", "😼", "🙀", "😿", "😾", "🐾",
  "🫶", "👍", "👏", "🙏", "💡", "🚀", "🌍", "🪴", "🍃", "🕊️"
];

const paymentMethods = [
  {
    key: "alipay",
    label: "Alipay",
    zh: "支付宝",
    href: process.env.NEXT_PUBLIC_MINTCAT_ALIPAY_URL || "#"
  },
  {
    key: "wechat",
    label: "WeChat Pay",
    zh: "微信支付",
    href: process.env.NEXT_PUBLIC_MINTCAT_WECHAT_URL || "#"
  },
  {
    key: "stripe",
    label: "Stripe",
    zh: "Stripe",
    href: process.env.NEXT_PUBLIC_MINTCAT_STRIPE_URL || "#"
  },
  {
    key: "github",
    label: "GitHub Sponsors",
    zh: "GitHub 赞助",
    href: process.env.NEXT_PUBLIC_MINTCAT_GITHUB_URL || "#"
  },
  {
    key: "visa",
    label: "Visa / Card",
    zh: "Visa / 银行卡",
    href: process.env.NEXT_PUBLIC_MINTCAT_VISA_URL || "#"
  }
];

const copy = {
  en: {
    intro:
      "MintCat is a federated social platform for open participation, portable identity, and communities that can define their own norms.",
    instances: "Instances",
    authors: "Authors",
    posts: "Posts",
    home: "Home",
    local: "Local",
    picks: "Explore",
    notifications: "Notifications",
    lists: "Lists",
    followedTags: "Followed tags",
    favoritesTab: "Favorites",
    privateMentions: "Private mentions",
    more: "More",
    hotNow: "What's hot",
    bookmarks: "Bookmarks",
    settings: "Preferences",
    searchAll: "Search or paste a remote URL",
    searchTitle: "Remote discovery",
    searchPlaceholder: "@alice@example.social or https://example.social/users/alice",
    searchButton: "Search",
    follow: "Follow",
    following: "Following",
    compose: "Compose",
    composeTitle: "Write a new post",
    composePrompt: "What do you want to share?",
    charsLeft: "chars left",
    placeholder: "Share an update, article, or thought...",
    audience: "Public",
    visibility: "Visibility",
    language: "Language",
    allowQuote: "Allow quote posts",
    simplifiedChinese: "Simplified Chinese",
    image: "Image",
    emoji: "Emoji",
    poll: "Poll",
    pollOption: "Option",
    addOption: "Add option",
    domain: "Domain",
    publish: "Publish",
    timeline: "Timeline",
    profile: "Profile",
    avatarHint: "Upload avatar",
    support: "Support",
    supportTitle: "Community funding",
    supportBody:
      "MintCat is supported by the community with open funding paths instead of ad inventory.",
    supportCta: "Open support page",
    trendTitle: "Trending topics",
    trends: ["FederatedDesign", "OpenCommunities", "PortableIdentity"],
    queue: "Delivery queue",
    noJobs: "No federation jobs yet.",
    noFollowing: "No remote follows yet.",
    actions: {
      like: "Like",
      boost: "Boost",
      comment: "Reply",
      bookmark: "Save",
      delete: "Delete"
    },
    addComment: "Write a reply",
    postComment: "Reply",
    replies: "replies",
    boosts: "boosts",
    favorites: "likes",
    loading: "Loading...",
    published: "Published to your outbox.",
    publishing: "Publishing...",
    searchSearching: "Searching remote actor...",
    searchQueued: "Follow request queued.",
    searchFound: "Actor found.",
    searchMissing: "No actor found.",
    state: "State",
    attempts: "Attempts",
    paymentTitle: "Payment methods",
    paymentHint: "Connect hosted payment links for real checkout.",
    visitPayment: "Open",
    identity: "Identity routing",
    instance: "Home instance",
    instanceHint:
      "Switch lanes to compare local activity and the wider federated timeline.",
    menu: "Navigation",
    welcome: "Signed in as"
  },
  zh: {
    intro: "MintCat 是一个联邦社交平台，支持开放参与、身份迁移与社区自治。",
    instances: "实例",
    authors: "作者",
    posts: "帖子",
    home: "主页",
    local: "本地流",
    picks: "发现",
    notifications: "通知",
    lists: "列表",
    followedTags: "关注的话题",
    favoritesTab: "喜欢",
    privateMentions: "私下提及",
    more: "更多",
    hotNow: "当前热门",
    bookmarks: "书签",
    settings: "偏好设置",
    searchAll: "搜索或输入远程链接",
    searchTitle: "远程发现",
    searchPlaceholder: "@alice@example.social 或 https://example.social/users/alice",
    searchButton: "搜索",
    follow: "关注",
    following: "关注列表",
    compose: "发帖",
    composeTitle: "发布一条新的动态",
    composePrompt: "想写什么？",
    charsLeft: "字剩余",
    placeholder: "分享你的想法、作品、链接或社区更新...",
    audience: "公开",
    visibility: "可见范围",
    language: "语言",
    allowQuote: "允许转发引用",
    simplifiedChinese: "简体中文",
    image: "图片",
    emoji: "表情",
    poll: "投票",
    pollOption: "选项",
    addOption: "添加选项",
    domain: "域名",
    publish: "发布",
    timeline: "时间线",
    profile: "个人资料",
    avatarHint: "上传头像",
    support: "支持",
    supportTitle: "社区资助",
    supportBody: "MintCat 采用社区资助模式，通过开放的支付入口支持开发、维护与联邦基础设施。",
    supportCta: "打开支持页面",
    trendTitle: "热门话题",
    trends: ["联邦设计", "开放社区", "身份迁移"],
    queue: "投递队列",
    noJobs: "当前还没有联邦投递任务。",
    noFollowing: "你还没有关注远程账号。",
    actions: {
      like: "点赞",
      boost: "转发",
      comment: "评论",
      bookmark: "收藏",
      delete: "删除"
    },
    addComment: "写下评论",
    postComment: "发送",
    replies: "评论",
    boosts: "转发",
    favorites: "点赞",
    loading: "加载中...",
    published: "已发布到你的 outbox。",
    publishing: "正在发布...",
    searchSearching: "正在搜索远程账号...",
    searchQueued: "关注请求已加入队列。",
    searchFound: "已找到远程账号。",
    searchMissing: "没有找到远程账号。",
    state: "状态",
    attempts: "尝试次数",
    paymentTitle: "支付方式",
    paymentHint: "填入真实支付链接后，这里会直达对应收款页。",
    visitPayment: "前往",
    identity: "身份路由",
    instance: "归属实例",
    instanceHint: "切换不同实例，查看本地流与联邦流在不同社区中的表现。",
    menu: "导航",
    welcome: "当前登录"
  }
};

function relativeTime(minutesAgo, locale) {
  if (minutesAgo < 60) {
    return locale === "zh" ? `${minutesAgo} 分钟前` : `${minutesAgo}m`;
  }
  const hours = Math.floor(minutesAgo / 60);
  return locale === "zh" ? `${hours} 小时前` : `${hours}h`;
}

function avatarLabel(name = "") {
  return String(name).trim().slice(0, 1).toUpperCase() || "M";
}

function extractLinks(text = "") {
  return Array.from(new Set((String(text).match(/https?:\/\/[^\s]+/g) || []).map((url) => url.trim())));
}

function renderRichContent(text = "") {
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a className="content-link" href={part} key={`${part}-${index}`} rel="noreferrer" target="_blank">
          {part}
        </a>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function MintSocialExperience({ user, openAuth, locale = "zh" }) {
  const t = copy[locale] || copy.en;
  const [timeline, setTimeline] = useState([]);
  const [summary, setSummary] = useState({ posts: 0, authors: 0, instances: 0 });
  const [activeTab, setActiveTab] = useState("federated");
  const [instanceMode, setInstanceMode] = useState("mintcat.world");
  const [composerValue, setComposerValue] = useState("");
  const [submitState, setSubmitState] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [following, setFollowing] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ displayName: "", bio: "" });
  const [profileState, setProfileState] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [reportState, setReportState] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [composerVisibility, setComposerVisibility] = useState(locale === "zh" ? "公开，允许转发引用" : "Public, allow quote posts");
  const [composerLanguage, setComposerLanguage] = useState(locale === "zh" ? "简体中文" : "English");
  const [composerImages, setComposerImages] = useState([]);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [mediaUploadState, setMediaUploadState] = useState("");
  const composerImageInputRef = useRef(null);

  useEffect(() => {
    setComposerVisibility(locale === "zh" ? "公开，允许转发引用" : "Public, allow quote posts");
    setComposerLanguage(locale === "zh" ? "简体中文" : "English");
  }, [locale]);

  const normalizedPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);

  useEffect(() => {
    refreshTimeline();
  }, [user?.email]);

  useEffect(() => {
    if (user?.email) {
      refreshFollowing();
      refreshJobs();
      refreshProfile();
      refreshNotifications();
    } else {
      setFollowing([]);
      setJobs([]);
      setProfile(null);
      setNotifications([]);
    }
  }, [user?.email]);

  const visibleTimeline = useMemo(() => {
    if (activeTab === "local") {
      return timeline.filter((post) => post.source === "local" || post.author.instance === instanceMode);
    }
    return activeTab === "community" ? timeline.filter((post) => post.audience === "Community") : timeline;
  }, [activeTab, instanceMode, timeline]);

  async function refreshTimeline() {
    setLoading(true);
    try {
      const suffix = user?.email ? `?email=${encodeURIComponent(user.email)}` : "";
      const response = await fetch(`/api/timeline${suffix}`, { cache: "no-store" });
      const payload = await response.json();
      setTimeline(payload.posts || []);
      setSummary(payload.summary || { posts: 0, authors: 0, instances: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function refreshFollowing() {
    if (!user?.email) {
      return;
    }
    const response = await fetch(`/api/follow?email=${encodeURIComponent(user.email)}`, { cache: "no-store" });
    const payload = await response.json();
    setFollowing(payload.following || []);
  }

  async function refreshJobs() {
    if (!user?.email) {
      return;
    }
    const response = await fetch(`/api/federation/jobs?email=${encodeURIComponent(user.email)}`, { cache: "no-store" });
    const payload = await response.json();
    setJobs(payload.jobs || []);
  }

  async function refreshProfile() {
    if (!user?.email) {
      return;
    }
    const response = await fetch(`/api/profile?email=${encodeURIComponent(user.email)}`, { cache: "no-store" });
    const payload = await response.json();
    setProfile(payload.profile || null);
    setProfileDraft({
      displayName: payload.profile?.displayName || user.displayName || "",
      bio: payload.profile?.bio || "",
      avatarUrl: payload.profile?.avatarUrl || ""
    });
  }

  async function refreshNotifications() {
    if (!user?.email) {
      return;
    }
    const response = await fetch(`/api/notifications?email=${encodeURIComponent(user.email)}`, { cache: "no-store" });
    const payload = await response.json();
    setNotifications(payload.notifications || []);
  }

  async function saveProfile() {
    if (!user?.email) {
      openAuth("signup");
      return;
    }
    setProfileState(locale === "zh" ? "正在保存资料..." : "Saving profile...");
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        displayName: profileDraft.displayName,
        bio: profileDraft.bio,
        avatarUrl: profileDraft.avatarUrl
      })
    });
    setProfileState(response.ok ? (locale === "zh" ? "资料已更新。" : "Profile updated.") : "Error");
    refreshProfile();
    refreshTimeline();
  }

  async function markNotificationsRead() {
    if (!user?.email) {
      return;
    }
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email })
    });
    const payload = await response.json();
    setNotifications(payload.notifications || []);
  }

  async function handlePublish() {
    const content = composerValue.trim();
    if (!content) {
      return;
    }
    if (!user) {
      openAuth("signup");
      return;
    }

    setSubmitState(t.publishing);
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        email: user.email,
        displayName: user.displayName,
        visibility: composerVisibility,
        language: composerLanguage,
        media: composerImages,
        poll: pollEnabled && normalizedPollOptions.length >= 2 ? { options: normalizedPollOptions } : null
      })
    });

    if (!response.ok) {
      setSubmitState("Error");
      return;
    }

    setComposerValue("");
    setComposerImages([]);
    setPollEnabled(false);
    setPollOptions(["", ""]);
    setMediaUploadState("");
    setSubmitState(t.published);
    startTransition(() => {
      refreshTimeline();
      refreshJobs();
      refreshProfile();
    });
  }

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }
    setSearchState(t.searchSearching);
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
    const payload = await response.json();
    setSearchResult(payload.result || null);
    setSearchState(payload.result ? t.searchFound : t.searchMissing);
  }

  async function handleFollow() {
    if (!user) {
      openAuth("signup");
      return;
    }
    const query = searchResult?.actorUrl || searchQuery.trim();
    if (!query) {
      return;
    }
    const response = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        email: user.email,
        displayName: user.displayName
      })
    });
    if (!response.ok) {
      return;
    }
    setSearchState(t.searchQueued);
    startTransition(() => {
      refreshFollowing();
      refreshJobs();
    });
  }

async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !user?.email) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const avatarDataUrl = String(reader.result || "");

      // 1. 立即更新本地草稿与展示状态，确保用户在 UI 上能立刻看到自己刚上传的真实图片
      setProfileDraft((current) => ({
        ...current,
        avatarUrl: avatarDataUrl
      }));
      setProfile((current) => (current ? { ...current, avatarUrl: avatarDataUrl } : { avatarUrl: avatarDataUrl }));

      // 2. 异步提交到后端保存至数据库
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            avatarUrl: avatarDataUrl
          })
        });

        if (!response.ok) {
          throw new Error("Failed to save avatar to server");
        }

        // 3. 成功后同步拉取最新服务器状态与时间线
        await Promise.all([refreshProfile(), refreshTimeline()]);
      } catch (error) {
        console.error("Avatar upload sync error:", error);
      } finally {
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.onerror = () => {
      console.error("FileReader error occurred while reading avatar file.");
    };
    reader.readAsDataURL(file);
  }
  
async function mutatePost(postId, action, content = "") {
  if (!user) {
    openAuth("signup");
    return;
  }

  // 🚀 优化 1：如果是删除操作，前端直接本地过滤，防止误清空
  if (action === "delete") {
    setTimeline((current) => current.filter((post) => post.id !== postId));
  }

  await fetch(`/api/posts/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      displayName: user.displayName,
      action,
      content
    })
  });

  // 异步同步最新状态
  refreshTimeline();
  refreshNotifications();
}

  async function reportPost(post) {
    if (!user) {
      openAuth("signup");
      return;
    }
    const reason = window.prompt(locale === "zh" ? "举报原因" : "Report reason");
    if (!reason?.trim()) {
      return;
    }
    const response = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporterEmail: user.email,
        targetPostId: post.id,
        targetActor: post.author.handle,
        reason,
        details: post.content.slice(0, 240)
      })
    });
    setReportState(response.ok ? (locale === "zh" ? "举报已进入审核队列。" : "Report sent to moderation.") : "Error");
  }

  async function voteOnPoll(postId, option) {
    if (!user) {
      openAuth("signup");
      return;
    }
    await mutatePost(postId, "vote", option);
  }

  function insertEmoji(symbol) {
    setComposerValue((current) => `${current}${symbol}`);
    setEmojiPickerOpen(false);
  }

  function handleComposerImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    setMediaUploadState(locale === "zh" ? "正在上传图片..." : "Uploading images...");

    Promise.all(
      files.slice(0, 4).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error("upload failed");
        }

        const payload = await response.json();
        return {
          id: payload.id || `${file.name}-${file.lastModified}`,
          name: file.name,
          url: payload.url
        };
      })
    )
      .then((images) => {
        setComposerImages(images);
        setMediaUploadState(locale === "zh" ? "图片已上传。" : "Images uploaded.");
      })
      .catch(() => {
        setMediaUploadState(locale === "zh" ? "图片上传失败。" : "Image upload failed.");
      })
      .finally(() => {
        if (event.target) {
          event.target.value = "";
        }
      });
  }

  function updatePollOption(index, value) {
    setPollOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function toggleVisibility() {
    setComposerVisibility((current) =>
      current === (locale === "zh" ? "公开，允许转发引用" : "Public, allow quote posts")
        ? (locale === "zh" ? "仅关注者" : "Followers only")
        : (locale === "zh" ? "公开，允许转发引用" : "Public, allow quote posts")
    );
  }

  function toggleLanguage() {
    setComposerLanguage((current) =>
      current === (locale === "zh" ? "简体中文" : "English")
        ? (locale === "zh" ? "English" : "Simplified Chinese")
        : (locale === "zh" ? "简体中文" : "English")
    );
  }

  return (
    <div className="mastodon-shell">
      <aside className="mastodon-sidebar mastodon-sidebar-left">
        <section className="panel mastodon-search-panel">
          <div className="search-input-shell">
            <span className="search-icon">⌕</span>
            <input
              id="mintcat-global-search"
              className="search-input search-input-top"
              placeholder={t.searchAll}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="search-actions">
            <button className="button button-ghost" onClick={handleSearch} type="button">{t.searchButton}</button>
            <button className="button button-primary" onClick={handleFollow} type="button">{t.follow}</button>
          </div>
          {searchState ? <p className="inline-status">{searchState}</p> : null}
          {searchResult ? (
            <article className="actor-result-card">
              <strong>{searchResult.displayName}</strong>
              <span>{searchResult.handle}</span>
              <p>{searchResult.actorUrl}</p>
            </article>
          ) : null}
        </section>

        <section className="panel mastodon-profile-panel mastodon-profile-card">
          <div className="mastodon-profile-head">
            <div className="avatar-shell large">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName || user?.displayName || "MintCat"} className="avatar-image" />
              ) : (
                <span>{avatarLabel(profile?.displayName || user?.displayName)}</span>
              )}
            </div>
            <div>
              <strong>{profile?.displayName || user?.displayName || "MintCat"}</strong>
              <span>@{(profile?.username || user?.displayName || "mintcat").replace(/\s+/g, "").toLowerCase()}</span>
              <span>{instanceMode}</span>
            </div>
          </div>
          {user ? (
            <>
              <label className="avatar-upload mastodon-upload">
                <span>{t.avatarHint}</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              </label>
              <div className="profile-editor">
                <input
                  aria-label={locale === "zh" ? "昵称" : "Display name"}
                  value={profileDraft.displayName}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))}
                />
                <textarea
                  aria-label={locale === "zh" ? "简介" : "Bio"}
                  placeholder={locale === "zh" ? "写一句社区里的自我介绍" : "Add a short profile bio"}
                  rows={3}
                  value={profileDraft.bio}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
                />
                <button className="button button-ghost" onClick={saveProfile} type="button">
                  {locale === "zh" ? "保存资料" : "Save profile"}
                </button>
                {profileState ? <p className="inline-status">{profileState}</p> : null}
              </div>
            </>
          ) : (
            <button className="button button-primary mastodon-auth-button" onClick={() => openAuth("signup")} type="button">
              {t.profile}
            </button>
          )}
        </section>

        <section className="panel mastodon-compose-card mastodon-compose-card-priority">
          <div className="composer-toolbar">
            <button className="composer-chip" onClick={toggleVisibility} type="button">{composerVisibility}</button>
            <button className="composer-chip" onClick={toggleLanguage} type="button">{composerLanguage}</button>
          </div>
          <textarea
            className="composer-input composer-input-large"
            maxLength={500}
            placeholder={t.composePrompt}
            value={composerValue}
            onChange={(event) => setComposerValue(event.target.value)}
          />

          {composerImages.length ? (
            <div className="composer-media-grid">
              {composerImages.map((image) => (
                <div className="composer-media-card" key={image.id}>
                  <img alt={image.name} src={image.url} />
                </div>
              ))}
            </div>
          ) : null}

          {pollEnabled ? (
            <div className="poll-editor">
              {pollOptions.map((option, index) => (
                <input
                  className="poll-input"
                  key={`poll-${index}`}
                  placeholder={`${t.pollOption} ${index + 1}`}
                  value={option}
                  onChange={(event) => updatePollOption(index, event.target.value)}
                />
              ))}
              {pollOptions.length < 4 ? (
                <button className="button button-ghost poll-add-button" onClick={() => setPollOptions((current) => [...current, ""])} type="button">
                  {t.addOption}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="composer-footer">
            <div className="composer-tools">
              <button className="composer-icon-button" onClick={() => composerImageInputRef.current?.click()} type="button" title={t.image}>
                <span>🖼</span>
              </button>
              <input
                ref={composerImageInputRef}
                className="composer-file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleComposerImageUpload}
              />
              <button className="composer-icon-button" onClick={() => setPollEnabled((current) => !current)} type="button" title={t.poll}>▥</button>
              <div className="emoji-picker-shell">
                <button className={`composer-icon-button${emojiPickerOpen ? " is-active" : ""}`} onClick={() => setEmojiPickerOpen((current) => !current)} type="button" title={t.emoji}>☺</button>
                {emojiPickerOpen ? (
                  <div className="emoji-picker-panel">
                    {emojiLibrary.map((emoji) => (
                      <button className="emoji-option" key={emoji} onClick={() => insertEmoji(emoji)} type="button">
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="composer-submit-row">
              <span className="composer-counter">{500 - composerValue.length}</span>
              <button className="button button-primary composer-publish-button" onClick={handlePublish} type="button">{t.publish}</button>
            </div>
          </div>
          {mediaUploadState ? <p className="inline-status">{mediaUploadState}</p> : null}
          {submitState ? <p className="inline-status">{submitState}</p> : null}
        </section>

        <div className="panel mastodon-brand-panel">
          <div className="brand-block">
            <MintCatLogo />
            <div>
              <p className="brand-kicker">MintCat</p>
              <h1>MintCat</h1>
            </div>
          </div>
          <p className="rail-copy">{t.intro}</p>
          <div className="rail-metrics">
            <div><strong>{summary.instances}</strong><span>{t.instances}</span></div>
            <div><strong>{summary.authors}</strong><span>{t.authors}</span></div>
            <div><strong>{summary.posts}</strong><span>{t.posts}</span></div>
          </div>
        </div>

      </aside>

      <main className="mastodon-main">
        <section className="panel mastodon-timeline-header">
          <div>
            <p className="section-label">{t.timeline}</p>
            <h2>{activeTab === "federated" ? t.home : activeTab === "local" ? t.local : t.picks}</h2>
          </div>
          <div className="mastodon-header-meta">
            <div className="mastodon-instance-box">
              <span>{t.instance}</span>
              <select value={instanceMode} onChange={(event) => setInstanceMode(event.target.value)}>
                <option value="mintcat.world">mintcat.world</option>
                <option value="river.social">river.social</option>
                <option value="garden.city">garden.city</option>
              </select>
            </div>
            <span className="timeline-count">{loading ? t.loading : `${visibleTimeline.length} ${t.posts}`}</span>
          </div>
        </section>

        <section className="panel mastodon-feed-panel">
          <div className="feed-control-bar">
            <p className="helper-copy mastodon-feed-copy">{t.instanceHint}</p>
            <div className="feed-tabs" aria-label={t.timeline}>
              <button className={activeTab === "federated" ? "is-active" : ""} onClick={() => setActiveTab("federated")} type="button">{t.home}</button>
              <button className={activeTab === "local" ? "is-active" : ""} onClick={() => setActiveTab("local")} type="button">{t.local}</button>
              <button className={activeTab === "community" ? "is-active" : ""} onClick={() => setActiveTab("community")} type="button">{t.picks}</button>
            </div>
          </div>
          <div className="post-list">
            {visibleTimeline.map((post) => (
              <article className="post-card mastodon-post-card" key={post.id}>
                <div className="post-head">
                  <div className="post-author">
                    <div className="avatar-shell">
                      {post.author.avatarUrl ? <img src={post.author.avatarUrl} alt={post.author.name} className="avatar-image" /> : <span>{avatarLabel(post.author.name)}</span>}
                    </div>
                    <div>
                      <div className="post-title-row">
                        <strong>{post.author.name}</strong>
                        {post.author.badge ? <span className="pill-tag">{post.author.badge}</span> : null}
                      </div>
                      <p className="post-meta">{post.author.handle} · {relativeTime(post.minutesAgo, locale)}</p>
                    </div>
                  </div>
                  <span className="instance-badge">{post.author.instance}</span>
                </div>

                <p className="post-content">{renderRichContent(post.content)}</p>

                {extractLinks(post.content).length ? (
                  <div className="link-preview-list">
                    {extractLinks(post.content).map((url) => (
                      <a className="link-preview-card" href={url} key={`${post.id}-${url}`} rel="noreferrer" target="_blank">
                        <strong>{new URL(url).hostname}</strong>
                        <span>{url}</span>
                      </a>
                    ))}
                  </div>
                ) : null}

                {post.media?.length ? (
                  <div className="timeline-media-grid">
                    {post.media.map((image) => (
                      <div className="timeline-media-card" key={image.id || image.url}>
                        <img alt={image.name || "post media"} src={image.url} />
                      </div>
                    ))}
                  </div>
                ) : null}

                {post.poll?.options?.length ? (
                  <div className="timeline-poll">
                    {post.poll.options.map((option) => (
                      <button
                        className={`timeline-poll-option${post.poll.viewerVote === option ? " is-selected" : ""}`}
                        key={`${post.id}-${option}`}
                        onClick={() => voteOnPoll(post.id, option)}
                        type="button"
                      >
                        <span>{option}</span>
                        <strong>{post.poll.counts?.[option] || 0}</strong>
                      </button>
                    ))}
                    <p className="timeline-poll-total">{post.poll.totalVotes || 0} {locale === "zh" ? "票" : "votes"}</p>
                  </div>
                ) : null}

                {post.tags?.length ? (
                  <div className="tag-row">
                    {post.tags.map((tag) => (
                      <span className="hash-tag" key={`${post.id}-${tag}`}>#{tag}</span>
                    ))}
                  </div>
                ) : null}

                <div className="mastodon-action-row">
                  <button className={`ghost-action${post.viewerState?.commented ? " is-active" : ""}`} onClick={() => {}} type="button"><span>↩</span>{t.actions.comment}</button>
                  <button className={`ghost-action${post.viewerState?.boosted ? " is-active" : ""}`} onClick={() => mutatePost(post.id, "boost")} type="button"><span>↻</span>{post.stats.boosts}</button>
                  <button className={`ghost-action${post.viewerState?.liked ? " is-active" : ""}`} onClick={() => mutatePost(post.id, "like")} type="button"><span>♡</span>{post.stats.favorites}</button>
                  <button className={`ghost-action${post.viewerState?.bookmarked ? " is-active" : ""}`} onClick={() => mutatePost(post.id, "bookmark")} type="button"><span>⌑</span>{t.actions.bookmark}</button>
                  <button className="ghost-action" onClick={() => reportPost(post)} type="button"><span>!</span>{locale === "zh" ? "举报" : "Report"}</button>
                  {post.viewerState?.canDelete ? <button className="ghost-action is-danger" onClick={() => mutatePost(post.id, "delete")} type="button">{t.actions.delete}</button> : null}
                </div>
                {reportState ? <p className="inline-status">{reportState}</p> : null}

                <div className="post-stats">
                  <span>{post.stats.replies} {t.replies}</span>
                  <span>{post.stats.boosts} {t.boosts}</span>
                  <span>{post.stats.favorites} {t.favorites}</span>
                </div>

                <div className="comment-box">
                  <input
                    className="comment-input"
                    placeholder={t.addComment}
                    value={commentDrafts[post.id] || ""}
                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                  />
                  <button
                    className="button button-ghost"
                    onClick={() => {
                      mutatePost(post.id, "comment", commentDrafts[post.id] || "");
                      setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
                    }}
                    type="button"
                  >
                    {t.postComment}
                  </button>
                </div>

                {post.comments?.length ? (
                  <div className="comment-list">
                    {post.comments.map((comment) => (
                      <div className="comment-item" key={comment.id}>
                        <strong>{comment.author}</strong>
                        <p>{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {!loading && !visibleTimeline.length ? (
              <div className="empty-feed">
                <strong>{locale === "zh" ? "这里暂时还没有帖子" : "No posts in this lane yet"}</strong>
                <span>{locale === "zh" ? "换一个时间线，或者发布第一条动态。" : "Switch lanes, or publish the first update."}</span>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <aside className="mastodon-sidebar mastodon-sidebar-right">
        <section className="mastodon-side-brand">
          <MintCatLogo small className="mintcat-logo small" />
          <strong>MintCat</strong>
        </section>

        <section className="mastodon-nav-panel mastodon-nav-panel-right">
          <nav className="mastodon-nav">
            <button className={`mastodon-nav-link${activeTab === "federated" ? " is-active" : ""}`} onClick={() => setActiveTab("federated")} type="button">
              <span className="nav-glyph">⌂</span>{t.home}
            </button>
            <button className={`mastodon-nav-link${activeTab === "local" ? " is-active" : ""}`} onClick={() => setActiveTab("local")} type="button">
              <span className="nav-glyph">◍</span>{t.local}
            </button>
            <button className={`mastodon-nav-link${activeTab === "community" ? " is-active" : ""}`} onClick={() => setActiveTab("community")} type="button">
              <span className="nav-glyph">⌁</span>{t.hotNow}
            </button>
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">◌</span>{t.notifications}</button>
            <div className="mastodon-nav-divider" />
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">▣</span>{t.lists}</button>
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">#</span>{t.followedTags}</button>
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">☆</span>{t.favoritesTab}</button>
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">⌑</span>{t.bookmarks}</button>
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">@</span>{t.privateMentions}</button>
            <div className="mastodon-nav-divider" />
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">⚙</span>{t.settings}</button>
            <button className="mastodon-nav-link" type="button"><span className="nav-glyph">⋯</span>{t.more}</button>
          </nav>
        </section>

        <section className="mastodon-side-panel mastodon-trend-panel">
          <p className="section-label">{t.hotNow}</p>
          <div className="trend-list">
            {t.trends.map((trend, index) => (
              <article className="trend-card" key={trend}>
                <strong>#{trend}</strong>
                <span>{locale === "zh" ? `过去 2 天 ${96 + index * 38} 人讨论` : `${96 + index * 38} people talking`}</span>
                <i className={`trend-spark trend-spark-${index + 1}`} aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section className="panel mastodon-side-panel">
          <div className="side-panel-head">
            <p className="section-label">{t.notifications}</p>
            {notifications.some((entry) => !entry.read_at) ? (
              <button className="mini-action" onClick={markNotificationsRead} type="button">
                {locale === "zh" ? "全部已读" : "Mark read"}
              </button>
            ) : null}
          </div>
          <div className="notification-list">
            {notifications.length ? notifications.slice(0, 6).map((entry) => (
              <article className={`notification-card${entry.read_at ? "" : " is-unread"}`} key={entry.id}>
                <strong>{entry.actor_display_name || entry.actor_username}</strong>
                <span>
                  {entry.type === "comment"
                    ? (locale === "zh" ? "评论了你的帖子" : "replied to your post")
                    : entry.type === "boost"
                      ? (locale === "zh" ? "转发了你的帖子" : "boosted your post")
                      : (locale === "zh" ? "赞了你的帖子" : "liked your post")}
                </span>
                {entry.summary ? <p>{entry.summary}</p> : null}
              </article>
            )) : <p className="empty-state">{locale === "zh" ? "还没有通知。" : "No notifications yet."}</p>}
          </div>
        </section>

        <section className="mastodon-side-panel mastodon-follow-panel">
          <p className="section-label">{t.following}</p>
          <div className="community-list">
            {following.length ? following.map((account) => (
              <article className="community-card mastodon-follow-card" key={account.actorUrl}>
                <strong>{account.displayName}</strong>
                <span>{account.handle}</span>
                <p>{t.state}: {account.followingState}</p>
              </article>
            )) : <p className="empty-state">{t.noFollowing}</p>}
          </div>
        </section>

        <section className="panel mastodon-side-panel">
          <p className="section-label">{t.paymentTitle}</p>
          <h3>{t.supportTitle}</h3>
          <p className="empty-state">{t.supportBody}</p>
          <div className="payment-grid">
            {paymentMethods.map((method) => (
              <a
                className={`payment-chip${method.href === "#" ? " is-disabled" : ""}`}
                href={method.href}
                key={method.key}
                target={method.href.startsWith("http") ? "_blank" : undefined}
                rel={method.href.startsWith("http") ? "noreferrer" : undefined}
              >
                <strong>{locale === "zh" ? method.zh : method.label}</strong>
                <span>{method.href === "#" ? "Pending" : t.visitPayment}</span>
              </a>
            ))}
          </div>
          <div className="payment-actions">
            <Link className="button button-primary support-link" href="/support">{t.supportCta}</Link>
            <a className="button button-ghost" href="/support">{locale === "zh" ? "配置支付方式" : "Configure payments"}</a>
          </div>
          <p className="support-mini-note">{t.paymentHint}</p>
        </section>

        <section className="panel mastodon-side-panel">
          <p className="section-label">{t.queue}</p>
          <h3>{t.queue}</h3>
          <div className="community-list">
            {jobs.length ? jobs.map((job) => (
              <article className="community-card" key={job.id}>
                <strong>{job.job_type}</strong>
                <span>{job.state}</span>
                <p>{t.attempts}: {job.attempt_count} / {job.max_attempts}</p>
              </article>
            )) : <p className="empty-state">{t.noJobs}</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}