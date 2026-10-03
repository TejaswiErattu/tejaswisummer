// ============================================================================
// ASSISTANT SIGN-IN — piggybacks on the tracker's Firebase Google sign-in.
//
// There is exactly one Google sign-in on the page: the tracker's Firebase
// popup (firebase-sync.js). The panel unlocks when that Firebase user exists
// and their email is on ALLOWED_EMAILS; signing out of the tracker locks the
// panel, and the panel's "Sign out" signs out of the tracker.
//
// In direct mode (Anthropic key in localStorage) this is a UI LOCK, NOT A
// SECURITY BOUNDARY — the checks run in the browser. In proxy mode the Firebase
// ID token is verified server-side by proxy/worker.js (signature, issuer,
// audience, expiry, allowlist), and that IS a real boundary.
// ============================================================================

import { ALLOWED_EMAILS } from "./auth-config.js?v=20261002a";
import { registerIdTokenGetter } from "./api.js?v=20261002a";

let session = null;              // { email, name, picture }
const listeners = new Set();
let onRejected = null;
let watching = false;

export function onAuthChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach(cb => { try { cb(getSession()); } catch (e) { console.warn("[chatbot auth]", e); } });
}

export function setRejectionHandler(fn) { onRejected = fn; }

function firebaseAuth() {
  try { return window.firebase && window.firebase.auth ? window.firebase.auth() : null; } catch { return null; }
}

function emailAllowed(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  return ALLOWED_EMAILS.some(a => String(a).trim().toLowerCase() === e);
}

function fromUser(user) {
  if (!user) return null;
  if (!emailAllowed(user.email)) {
    onRejected?.(`This account is not authorized for the assistant (${user.email || "no email"}).`);
    return null;
  }
  return { email: user.email, name: user.displayName || user.email, picture: user.photoURL || "" };
}

export function getSession() {
  const auth = firebaseAuth();
  const user = auth ? auth.currentUser : null;
  if (!user) { session = null; return null; }
  if (!session || session.email !== user.email) session = fromUser(user);
  return session;
}

export function isSignedIn() { return !!getSession(); }

// Called on every send: no Firebase user (or a non-allowlisted one) re-locks
// the panel instead of letting the request fail.
export function requireValidSession() {
  const s = getSession();
  if (!s) { emit(); return { ok: false, reason: "signed_out" }; }
  return { ok: true, session: s };
}

// Signing out of the assistant signs out of the tracker. Clicking the tracker's
// own button (rather than calling signOutFirebase directly) keeps js/auth-gate.js
// in the loop so local progress is flushed and purged exactly as usual.
export function signOut() {
  const btn = document.getElementById("auth-signout-btn");
  if (btn) btn.click();
  else if (typeof window.signOutFirebase === "function") window.signOutFirebase();
}

// Starts following the Firebase user. Renders a short note into `container`
// while signed out (the tracker's gate normally covers the page then anyway).
export function mountSignIn(container) {
  const auth = firebaseAuth();
  if (!auth) {
    container.innerHTML = "";
    const p = document.createElement("p");
    p.className = "cb-auth-note cb-auth-warn";
    p.textContent = "Firebase didn't load, so sign-in isn't available. Check your connection and reload.";
    container.appendChild(p);
    return "unavailable";
  }
  if (!watching) {
    watching = true;
    auth.onAuthStateChanged(() => { session = null; emit(); });
  }
  container.innerHTML = "";
  const p = document.createElement("p");
  p.className = "cb-auth-note";
  p.textContent = "Sign in to the tracker with Google (top bar) to unlock the assistant.";
  container.appendChild(p);
  if (getSession()) emit();
  return auth.currentUser ? "signed_in" : "waiting";
}

// Proxy mode sends a fresh Firebase ID token with every request. getIdToken()
// returns the cached token and transparently refreshes it when it's near its
// one-hour expiry.
registerIdTokenGetter(async () => {
  const auth = firebaseAuth();
  const user = auth ? auth.currentUser : null;
  if (!user || !emailAllowed(user.email)) return null;
  return user.getIdToken();
});

