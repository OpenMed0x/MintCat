const bucketStore = globalThis.__mintcatRateLimitStore || new Map();
globalThis.__mintcatRateLimitStore = bucketStore;

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "local";
}

export function checkRateLimit(request, scope, { limit, windowMs }) {
  // 本地开发环境直接放行，避免频繁调试、热重载或测试时被限流误伤
  if (process.env.NODE_ENV === "development") {
    return { ok: true };
  }

  const key = `${scope}:${getClientIp(request)}`;
  const now = Date.now();
  const current = bucketStore.get(key);

  if (!current || current.resetAt <= now) {
    bucketStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return { ok: true };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  return { ok: true };
}