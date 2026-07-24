"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

const DEMO_STORAGE_KEY = "mintcat-auth-demo";

const copy = {
  en: {
    fallback:
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use real authentication. Until then, MintCat runs in local demo mode.",
    fullNameRequired: "Please enter your display name.",
    accountCreated:
      "Account created. If your Supabase project requires email confirmation, check your inbox before signing in.",
    demoCreated: "Demo account created locally. Add Supabase env vars when you are ready.",
    welcomeBack: "Welcome back. You are now signed in.",
    noDemoAccount: "No local demo account matches this email. Create one first or connect Supabase.",
    demoSignedIn: "Signed in with the local demo account.",
    signedOut: "You have been signed out.",
    eyebrow: "MintCat Access",
    join: "Join MintCat",
    welcome: "Welcome back",
    intro:
      "Use Supabase credentials to authenticate. If project keys are not configured yet, the forms still work in local demo mode so you can preview the federated MintCat experience.",
    signUp: "Sign up",
    signIn: "Sign in",
    fullName: "Display name",
    email: "Email",
    password: "Password",
    createPassword: "Create a secure password",
    enterPassword: "Enter your password",
    createAccount: "Create account",
    logIn: "Log in"
  },
  zh: {
    fallback:
      "添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 后即可启用真实认证；在此之前，MintCat 会以本地演示模式运行。",
    fullNameRequired: "请输入昵称。",
    accountCreated: "账号已创建。如果你的 Supabase 项目开启了邮箱验证，请先去邮箱完成验证再登录。",
    demoCreated: "演示账号已在本地创建，补上 Supabase 环境变量后即可切换到真实认证。",
    welcomeBack: "欢迎回来，你已成功登录。",
    noDemoAccount: "本地没有找到对应邮箱的演示账号，请先注册或接入 Supabase。",
    demoSignedIn: "已使用本地演示账号登录。",
    signedOut: "你已退出登录。",
    eyebrow: "MintCat 账户",
    join: "加入 MintCat",
    welcome: "欢迎回来",
    intro: "使用 Supabase 账号体系进行认证。如果还没有配置项目密钥，也可以先用本地演示模式体验 MintCat 的联邦社交功能。",
    signUp: "注册",
    signIn: "登录",
    fullName: "昵称",
    email: "邮箱",
    password: "密码",
    createPassword: "设置安全密码",
    enterPassword: "输入密码",
    createAccount: "创建账号",
    logIn: "登录"
  }
};

function createUserSnapshot(email, displayName) {
  return {
    email,
    displayName: displayName || String(email || "").split("@")[0] || "Member"
  };
}

export default function MintAuthExperience({ children, locale = "en" }) {
  const t = copy[locale] || copy.en;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("signup");
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({
    tone: "default",
    message: t.fallback
  });
  const [signUpValues, setSignUpValues] = useState({ displayName: "", email: "", password: "" });
  const [signInValues, setSignInValues] = useState({ email: "", password: "" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

  const supabase = useMemo(() => {
    if (!hasSupabaseConfig) {
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  }, [hasSupabaseConfig, supabaseAnonKey, supabaseUrl]);

  useEffect(() => {
    setStatus((current) => ({
      ...current,
      message: current.tone === "default" ? t.fallback : current.message
    }));
  }, [t]);

  useEffect(() => {
    if (!supabase) {
      const rawSession = window.localStorage.getItem(DEMO_STORAGE_KEY + "-session");
      if (rawSession) {
        setUser(JSON.parse(rawSession));
      }
      return;
    }

    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      const sessionUser = data.session?.user;
      if (sessionUser) {
        setUser(
          createUserSnapshot(
            sessionUser.email || "",
            sessionUser.user_metadata?.display_name || sessionUser.user_metadata?.full_name
          )
        );
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user;
      setUser(
        nextUser
          ? createUserSnapshot(
              nextUser.email || "",
              nextUser.user_metadata?.display_name || nextUser.user_metadata?.full_name
            )
          : null
      );
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  function openAuth(tab) {
    setActiveTab(tab);
    setIsOpen(true);
  }

  async function handleSignUp(event) {
    event.preventDefault();
    setStatusState("default", "");

    if (!signUpValues.displayName.trim()) {
      setStatusState("error", t.fullNameRequired);
      return;
    }

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: signUpValues.email.trim(),
        password: signUpValues.password,
        options: {
          data: {
            display_name: signUpValues.displayName.trim()
          }
        }
      });

      if (error) {
        setStatusState("error", error.message);
        return;
      }

      setUser(
        createUserSnapshot(
          data.user?.email || signUpValues.email,
          data.user?.user_metadata?.display_name || signUpValues.displayName
        )
      );
      setStatusState("success", t.accountCreated);
      setIsOpen(false);
      return;
    }

    const demoUser = createUserSnapshot(signUpValues.email.trim(), signUpValues.displayName.trim());
    window.localStorage.setItem(DEMO_STORAGE_KEY + "-account", JSON.stringify(demoUser));
    window.localStorage.setItem(DEMO_STORAGE_KEY + "-session", JSON.stringify(demoUser));
    setUser(demoUser);
    setStatusState("success", t.demoCreated);
    setIsOpen(false);
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setStatusState("default", "");

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInValues.email.trim(),
        password: signInValues.password
      });

      if (error) {
        setStatusState("error", error.message);
        return;
      }

      setUser(
        createUserSnapshot(
          data.user?.email || signInValues.email,
          data.user?.user_metadata?.display_name || data.user?.user_metadata?.full_name
        )
      );
      setStatusState("success", t.welcomeBack);
      setIsOpen(false);
      return;
    }

    const rawAccount = window.localStorage.getItem(DEMO_STORAGE_KEY + "-account");
    const localUser = rawAccount ? JSON.parse(rawAccount) : null;
    if (!localUser || localUser.email !== signInValues.email.trim()) {
      setStatusState("error", t.noDemoAccount);
      return;
    }

    window.localStorage.setItem(DEMO_STORAGE_KEY + "-session", JSON.stringify(localUser));
    setUser(localUser);
    setStatusState("success", t.demoSignedIn);
    setIsOpen(false);
  }

  async function signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setStatusState("error", error.message);
        return;
      }
    } else {
      window.localStorage.removeItem(DEMO_STORAGE_KEY + "-session");
    }

    setUser(null);
    setStatusState("success", t.signedOut);
  }

  function setStatusState(tone, message) {
    setStatus({
      tone,
      message: message || t.fallback
    });
  }

  return (
    <>
      {children({ openAuth, user, signOut })}
      <div className={`auth-modal${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
        <div className="auth-backdrop" onClick={() => setIsOpen(false)} />
        <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle">
          <button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsOpen(false)}>
            ×
          </button>
          <div className="auth-intro">
            <p className="eyebrow">{t.eyebrow}</p>
            <h2 id="authTitle">{activeTab === "signup" ? t.join : t.welcome}</h2>
            <p>{t.intro}</p>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Authentication forms">
            <button className={`auth-tab${activeTab === "signup" ? " is-active" : ""}`} type="button" onClick={() => setActiveTab("signup")}>
              {t.signUp}
            </button>
            <button className={`auth-tab${activeTab === "signin" ? " is-active" : ""}`} type="button" onClick={() => setActiveTab("signin")}>
              {t.signIn}
            </button>
          </div>
          {activeTab === "signup" ? (
            <form className="auth-form is-active" onSubmit={handleSignUp}>
              <label>
                <span>{t.fullName}</span>
                <input type="text" value={signUpValues.displayName} onChange={(event) => setSignUpValues({ ...signUpValues, displayName: event.target.value })} required />
              </label>
              <label>
                <span>{t.email}</span>
                <input type="email" placeholder="you@mintcat.world" value={signUpValues.email} onChange={(event) => setSignUpValues({ ...signUpValues, email: event.target.value })} required />
              </label>
              <label>
                <span>{t.password}</span>
                <input type="password" placeholder={t.createPassword} minLength="6" value={signUpValues.password} onChange={(event) => setSignUpValues({ ...signUpValues, password: event.target.value })} required />
              </label>
              <button className="button button-primary auth-submit" type="submit">
                {t.createAccount}
              </button>
            </form>
          ) : (
            <form className="auth-form is-active" onSubmit={handleSignIn}>
              <label>
                <span>{t.email}</span>
                <input type="email" placeholder="you@mintcat.world" value={signInValues.email} onChange={(event) => setSignInValues({ ...signInValues, email: event.target.value })} required />
              </label>
              <label>
                <span>{t.password}</span>
                <input type="password" placeholder={t.enterPassword} minLength="6" value={signInValues.password} onChange={(event) => setSignInValues({ ...signInValues, password: event.target.value })} required />
              </label>
              <button className="button button-primary auth-submit" type="submit">
                {t.logIn}
              </button>
            </form>
          )}
          <div className={`status-box${status.tone === "success" ? " is-success" : ""}${status.tone === "error" ? " is-error" : ""}`}>{status.message}</div>
        </div>
      </div>
    </>
  );
}