// ============================================================================
// GOOGLE SIGN-IN (Google Identity Services)
//
// Uses the current GIS library (accounts.google.com/gsi/client), not the
// deprecated gapi.auth2 / "Google Sign-In for Websites" library.
//
// ***  READ THIS BEFORE TRUSTING THIS FILE  ***
// In Mode A (direct browser calls, Anthropic key in localStorage) this is a
// UI LOCK, NOT A SECURITY BOUNDARY. All of the checks below run in the browser,
// so anyone with DevTools open can bypass them - and they would not even need
// to, because in Mode A the Anthropic key is sitting in localStorage in the
// same browser profile and can simply be read. This gate stops a passer-by from
// using the chatbot on an unlocked laptop. It stops nothing else.
//
// In Mode B (Cloudflare Worker proxy) the SAME ID token is verified server-side
// in proxy/worker.js - signature against Google's JWKS, audience, expiry, and
// allowlist - and that check IS a real boundary, because the Anthropic key
// never leaves the Worker.
// ============================================================================

import {
  GOOGLE_CLIENT_ID, ALLOWED_EMAILS, ALLOW_LOCALHOST_BYPASS, isLocalhost, isConfigured
} from "./auth-config.js?v=20260916a";
import { registerIdTokenGetter } from "./api.js?v=20260916a";

const GIS_SRC = "https://accounts.google.com/gsi/client";

// sessionStorage, deliberately: the session dies when the browser closes rather
// than persisting indefinitely the way localStorage would.
const SESSION_KEY = "chatbot_google_session";

let gisLoaded = false;
let session = null;              // { idToken, email, name, picture, exp }
const listeners = new Set();

export function onAuthChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach(cb => { try { cb(getSession()); } catch (e) { console.warn("[chatbot auth]", e); } });
}

// --- JWT decoding -----------------------------------------------------------
// NOTE: this decodes WITHOUT verifying the signature. That is fine for what we
// use it for here - populating the UI and checking the allowlist to decide
// whether to unlock the panel - and it is NOT sufficient for authorization.
// Real verification happens server-side in proxy/worker.js (Mode B).
export function decodeJwt(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(pad).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function emailAllowed(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  return ALLOWED_EMAILS.some(a => String(a).trim().toLowerCase() === e);
}

// --- Session ----------------------------------------------------------------
function persist(s) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.exp) return null;
    // A real session must carry a token; the localhost dev bypass has none.
    if (!s.devBypass && !s.idToken) return null;
    if (isExpired(s)) { persist(null); return null; }
    if (!s.devBypass && !emailAllowed(s.email)) { persist(null); return null; }
    return s;
  } catch { return null; }
}

function isExpired(s) {
  if (!s || !s.exp) return true;
  // 30s of slack so we re-prompt slightly early rather than failing mid-request.
  return Date.now() / 1000 >= (s.exp - 30);
}

export function getSession() {
  if (session && isExpired(session)) {
    session = null;
    persist(null);
  }
  return session;
}

export function isSignedIn() { return !!getSession(); }

export function signOut() {
  session = null;
  persist(null);
  try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
  emit();
}

// Called on every send: an expired token re-locks the panel instead of
// letting the request fail silently.
export function requireValidSession() {
  const s = getSession();
  if (!s) {
    emit();
    return { ok: false, reason: "signed_out" };
  }
  return { ok: true, session: s };
}

// --- GIS bootstrap ----------------------------------------------------------
function loadGis() {
  if (gisLoaded) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) { gisLoaded = true; return resolve(true); }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => { gisLoaded = true; resolve(true); };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

let onRejected = null;
export function setRejectionHandler(fn) { onRejected = fn; }

// Exported so Google One Tap (or a test) can feed a credential response in.
export function handleCredential(response) {
  const token = response && response.credential;
  if (!token) return;
  const claims = decodeJwt(token);
  if (!claims || !claims.email) {
    onRejected?.("Google returned a token we couldn't read. Try signing in again.");
    return;
  }

  if (!emailAllowed(claims.email)) {
    // Never log the token. The email is shown back to the user so they know
    // which account was refused.
    session = null;
    persist(null);
    try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
    onRejected?.(`This account is not authorized (${claims.email}).`);
    emit();
    return;
  }

  session = {
    idToken: token,
    email: claims.email,
    name: claims.name || claims.given_name || claims.email,
    picture: claims.picture || "",
    exp: claims.exp
  };
  persist(session);
  emit();
}

// Renders the Google button into `container`. Returns a status string so the
// panel can explain itself when sign-in isn't available.
export async function mountSignIn(container) {
  session = session || loadPersisted();
  if (session) { emit(); return "signed_in"; }

  // Local development escape hatch. Ignored on any non-localhost host, so it
  // can never accidentally unlock the deployed site.
  if (ALLOW_LOCALHOST_BYPASS && isLocalhost()) {
    container.innerHTML = "";
    const btn = document.createElement("button");
    btn.className = "cb-btn cb-btn-primary cb-signin-dev";
    btn.textContent = "Continue (localhost dev bypass)";
    btn.addEventListener("click", () => {
      session = {
        idToken: null,
        email: (ALLOWED_EMAILS[0] || "dev@localhost"),
        name: "Local Dev",
        picture: "",
        exp: Math.floor(Date.now() / 1000) + 3600,
        devBypass: true
      };
      persist(session);
      emit();
    });
    container.appendChild(btn);
    const note = document.createElement("p");
    note.className = "cb-auth-note";
    note.textContent = "Localhost only. On the deployed site, Google sign-in is required.";
    container.appendChild(note);
    return "dev_bypass";
  }

  if (!isConfigured()) {
    container.innerHTML =
      '<p class="cb-auth-note cb-auth-warn">Google sign-in is not configured yet. ' +
      'Add your OAuth client ID to <code>js/chatbot/auth-config.js</code> ' +
      '(setup steps are in that file).</p>';
    return "unconfigured";
  }

  const ok = await loadGis();
  if (!ok || !window.google?.accounts?.id) {
    container.innerHTML =
      '<p class="cb-auth-note cb-auth-warn">Couldn\'t load Google sign-in. ' +
      'Check your connection or any content blockers.</p>';
    return "gis_failed";
  }

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true
    });
    container.innerHTML = "";
    const slot = document.createElement("div");
    container.appendChild(slot);
    window.google.accounts.id.renderButton(slot, {
      theme: "filled_black",
      size: "large",
      shape: "rectangular",
      text: "signin_with",
      width: 240
    });
    return "rendered";
  } catch (e) {
    container.innerHTML =
      '<p class="cb-auth-note cb-auth-warn">Google sign-in failed to initialise. ' +
      'Check that this origin is listed in your OAuth client\'s authorized JavaScript origins.</p>';
    return "init_failed";
  }
}

// Mode B sends this to the Worker, which verifies it properly.
// Returns null under the dev bypass, since there is no real token then.
registerIdTokenGetter(() => {
  const s = getSession();
  return s && s.idToken ? s.idToken : null;
});

export { ALLOWED_EMAILS };
