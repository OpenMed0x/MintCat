"use client";

import { useState } from "react";
import MintAuthExperience from "../components/MintAuthExperience";
import MintSocialExperience from "../components/MintSocialExperience";
import MintCatLogo from "../components/MintCatLogo";
import Link from "next/link";

const copy = {
  en: {
    productTag: "Federated social platform",
    signOut: "Sign out",
    signIn: "Sign in",
    join: "Join MintCat",
    language: "中文",
    support: "Support"
  },
  zh: {
    productTag: "联邦社交平台",
    signOut: "退出登录",
    signIn: "登录",
    join: "加入 MintCat",
    language: "EN",
    support: "支持"
  }
};

export default function Page() {
  const [locale, setLocale] = useState("zh");
  const t = copy[locale];

  return (
    <MintAuthExperience locale={locale}>
      {({ openAuth, user, signOut }) => (
        <div className="site-shell">
          <header className="topbar">
            <div className="topbar-brand">
              <MintCatLogo small className="mintcat-logo small" />
              <div>
                <strong>MintCat</strong>
                <span>{t.productTag}</span>
              </div>
            </div>
            <div className="topbar-actions">
              <button className="locale-toggle" onClick={() => setLocale(locale === "zh" ? "en" : "zh")} type="button">{t.language}</button>
              <Link className="button button-ghost support-nav-link" href="/support">
                {t.support}
              </Link>
              {user ? (
                <>
                  <span className="welcome-pill">{user.displayName}</span>
                  <button className="button button-ghost" onClick={signOut} type="button">{t.signOut}</button>
                </>
              ) : (
                <>
                  <button className="button button-ghost" onClick={() => openAuth("signin")} type="button">{t.signIn}</button>
                  <button className="button button-primary" onClick={() => openAuth("signup")} type="button">{t.join}</button>
                </>
              )}
            </div>
          </header>
          <MintSocialExperience locale={locale} openAuth={openAuth} user={user} />
        </div>
      )}
    </MintAuthExperience>
  );
}
