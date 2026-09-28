// ============================================================================
// ANTHROPIC API CLIENT - Mode A (direct browser) and Mode B (proxy)
//
// The API key is read from localStorage at call time and placed only in a
// request header. It is never logged, never interpolated into a URL, never put
// in an error message, and never persisted anywhere but that one key.
// ============================================================================

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export const SETTINGS_KEY = "chatbot_settings_v1";
export const API_KEY_STORAGE_KEY = "chatbot_anthropic_api_key";

// Adding a model later is a one-line change here.
export const MODELS = [
  { id: "claude-sonnet-5",           label: "Sonnet 5 (default, balanced)", inputPerMTok: 2, outputPerMTok: 10 },
  { id: "claude-haiku-4-5",           label: "Haiku 4.5 (cheapest)",         inputPerMTok: 1, outputPerMTok: 5 },
  { id: "claude-opus-5",             label: "Opus 5 (most accurate, pricey)", inputPerMTok: 5, outputPerMTok: 25 }
];

export const DEFAULT_MODEL = "claude-sonnet-5";

export function getModel(id) {
  return MODELS.find(m => m.id === id) || MODELS[0];
}

// --- Settings ---------------------------------------------------------------
const DEFAULT_SETTINGS = {
  mode: "direct",        // "direct" (Mode A) | "proxy" (Mode B)
  model: DEFAULT_MODEL,
  proxyUrl: "",
  maxTokens: 2048
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// A proxy URL must parse and use https:. Plain http: is only for a proxy on
// this machine (wrangler dev). Returns null when fine, else a message.
export function validateProxyUrl(value) {
  let u;
  try { u = new URL(String(value || "").trim()); } catch { return "That isn't a valid URL."; }
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]" || u.hostname === "::1";
  if (u.protocol === "https:") return null;
  if (u.protocol === "http:" && local) return null;
  return "The proxy URL must start with https:// (http:// is only allowed for localhost).";
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  return next;
}

// The key lives on its own so it is never accidentally serialised alongside
// anything we might export, log, or sync.
export function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE_KEY) || ""; } catch { return ""; }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    else localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {}
}

export function hasApiKey() { return !!getApiKey(); }

// --- Cost tracking ----------------------------------------------------------
export function estimateCost(modelId, inputTokens, outputTokens) {
  const m = getModel(modelId);
  return (inputTokens / 1e6) * m.inputPerMTok + (outputTokens / 1e6) * m.outputPerMTok;
}

// --- Error type -------------------------------------------------------------
export class ChatbotApiError extends Error {
  constructor(kind, message, detail) {
    super(message);
    this.name = "ChatbotApiError";
    this.kind = kind;      // no_key | auth | forbidden | rate_limit | overloaded | network | bad_request | unknown
    this.detail = detail;  // never contains the API key
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const MAX_RETRY_AFTER_SECONDS = 30;

// --- The call ---------------------------------------------------------------
// messages: [{ role: "user"|"assistant", content: string }]
// Returns { text, usage: { input_tokens, output_tokens }, model }
export async function callModel({ system, messages, signal, onRetry }) {
  const settings = loadSettings();
  const usingProxy = settings.mode === "proxy" && !!settings.proxyUrl;

  if (!usingProxy && !hasApiKey()) {
    throw new ChatbotApiError("no_key",
      "No API key is set. Open the settings gear in this panel and paste your Anthropic API key.");
  }
  if (settings.mode === "proxy" && !settings.proxyUrl) {
    throw new ChatbotApiError("no_key",
      "Proxy mode is on but no proxy URL is set. Open settings and add your Worker URL, or switch back to direct mode.");
  }
  if (usingProxy) {
    const urlProblem = validateProxyUrl(settings.proxyUrl);
    if (urlProblem) throw new ChatbotApiError("bad_request", `Proxy URL rejected: ${urlProblem}`);
  }

  const body = {
    model: settings.model,
    max_tokens: settings.maxTokens,
    system,
    messages
  };

  const url = usingProxy ? settings.proxyUrl : API_URL;
  const headers = { "content-type": "application/json" };

  if (usingProxy) {
    // Mode B: no Anthropic key ever leaves this browser. The Worker holds it.
    // We send the Firebase ID token (auto-refreshed by the Firebase SDK) so
    // the Worker can verify who is calling.
    const idToken = await getIdTokenForProxy();
    if (!idToken) {
      throw new ChatbotApiError("auth", "You're not signed in, so the proxy can't verify you. Sign in again.");
    }
    headers["authorization"] = `Bearer ${idToken}`;
  } else {
    // Mode A: the key goes in a header, and only in a header.
    headers["x-api-key"] = getApiKey();
    headers["anthropic-version"] = API_VERSION;
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const MAX_ATTEMPTS = 3;
  const MAX_TOKENS_CEILING = 8192;
  let lastErr = null;
  let truncationRetried = false;
  const usageTotal = { input_tokens: 0, output_tokens: 0 };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
    } catch (e) {
      if (e && e.name === "AbortError") throw e;
      // fetch() rejects for both genuine network failures and CORS rejections;
      // the browser deliberately does not tell us which.
      lastErr = new ChatbotApiError("network",
        usingProxy
          ? "The request never reached the API. Your proxy may be down, unreachable, or missing CORS headers."
          : "The request never reached the API. Check your internet connection - this can also be a CORS rejection.",
        e && e.message);
      if (attempt < MAX_ATTEMPTS) { onRetry?.(attempt, "network"); await sleep(500 * 2 ** (attempt - 1)); continue; }
      throw lastErr;
    }

    if (res.ok) {
      let json;
      try { json = await res.json(); }
      catch (e) {
        throw new ChatbotApiError("unknown", "The API returned a response that wasn't valid JSON.", e && e.message);
      }
      const text = (json.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");
      usageTotal.input_tokens += (json.usage && json.usage.input_tokens) || 0;
      usageTotal.output_tokens += (json.usage && json.usage.output_tokens) || 0;

      // Cut off by the output limit: retry once with double max_tokens (up to
      // 8192). If it still truncates, hand the text back flagged so the caller
      // can tell the user. This doesn't use up one of the network/5xx attempts.
      if (json.stop_reason === "max_tokens" && !truncationRetried && body.max_tokens < MAX_TOKENS_CEILING) {
        truncationRetried = true;
        body.max_tokens = Math.min(body.max_tokens * 2, MAX_TOKENS_CEILING);
        onRetry?.(attempt, "truncated");
        attempt -= 1;
        continue;
      }
      return {
        text,
        usage: usageTotal,
        model: json.model || settings.model,
        truncated: json.stop_reason === "max_tokens"
      };
    }

    // --- Non-OK responses ---
    const detail = await safeErrorText(res);

    if (usingProxy && res.status === 401) {
      throw new ChatbotApiError("auth",
        "Your sign-in has expired or is invalid. Sign in to the tracker again, then retry.", detail);
    }
    if (usingProxy && res.status === 403) {
      throw new ChatbotApiError("forbidden",
        "The proxy refused this request: this site's origin or your email isn't on its allowlist. Check ALLOWED_ORIGINS and ALLOWED_EMAILS on the Worker.", detail);
    }
    if (res.status === 401 || res.status === 403) {
      throw new ChatbotApiError("auth", "Your API key was rejected. Check it in settings.", detail);
    }

    if (res.status === 429) {
      lastErr = new ChatbotApiError("rate_limit",
        "You hit the API rate limit. Wait a moment and try again.", detail);
      if (attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter, MAX_RETRY_AFTER_SECONDS) * 1000
          : 1000 * 2 ** (attempt - 1);
        onRetry?.(attempt, "rate_limit");
        await sleep(wait);
        continue;
      }
      throw lastErr;
    }

    if (res.status === 529 || res.status >= 500) {
      lastErr = new ChatbotApiError("overloaded",
        "The API is having trouble right now. Try again in a minute.", detail);
      if (attempt < MAX_ATTEMPTS) { onRetry?.(attempt, "overloaded"); await sleep(1000 * 2 ** (attempt - 1)); continue; }
      throw lastErr;
    }

    if (res.status === 413) {
      throw new ChatbotApiError("bad_request",
        "That request was too large to send. Try a shorter message.", detail);
    }

    throw new ChatbotApiError("bad_request",
      `The API rejected the request (HTTP ${res.status}).`, detail);
  }

  throw lastErr || new ChatbotApiError("unknown", "The request failed for an unknown reason.");
}

async function safeErrorText(res) {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch { return ""; }
}

// Set by auth.js so api.js has no import cycle with it.
// The getter may be async (Firebase's getIdToken refreshes an expired token).
let _idTokenGetter = async () => null;
export function registerIdTokenGetter(fn) { _idTokenGetter = fn; }
async function getIdTokenForProxy() {
  try { return await _idTokenGetter(); } catch { return null; }
}
