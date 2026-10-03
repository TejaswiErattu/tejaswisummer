// Firebase Sync Engine — Google Auth + Firestore cloud save/load

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// Demo mode (app.js) holds invented state in memory. Nothing in this file may
// run while it is set: no sign-in, no Firestore read, no Firestore write.
function inDemoMode() { return typeof isDemoMode === "function" && isDemoMode(); }

// ── SIGN IN / OUT ─────────────────────────────────────────────
function signInWithGoogle() {
  // The load path merges in-memory state into the cloud on sign-in, so the
  // sample state has to be gone first. Reload; sign-in happens from the gate.
  if (inDemoMode()) { location.reload(); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    console.error("Sign-in error:", err.code, err.message);
    if (err.code === "auth/unauthorized-domain") {
      showAuthToast("❌ Domain not authorized in Firebase. See setup instructions.", "error");
      alert('Firebase setup needed!\n\n1. Go to: https://console.firebase.google.com/project/tejaswisummer/authentication/settings\n2. Scroll to "Authorized domains"\n3. Click "Add domain"\n4. Add: tejaswierattu.github.io\n5. Click Save — then try again!');
    } else if (err.code === "auth/popup-blocked") {
      showAuthToast("❌ Popup blocked — please allow popups for this site.", "error");
    } else {
      showAuthToast(`❌ Sign-in failed: ${err.code}`, "error");
    }
  });
}

async function signOutFirebase() {
  if (inDemoMode()) return;
  // Push any debounced change up before the session ends. js/auth-gate.js wipes
  // local progress right after sign-out, so anything not flushed here is lost.
  try {
    if (currentUser) {
      if (typeof _saveTimer !== "undefined") clearTimeout(_saveTimer);
      await saveStateToFirestore();
    }
  } catch (e) {
    console.error("Pre-sign-out flush failed:", e);
  }
  auth.signOut().then(() => {
    showAuthToast("Signed out. Progress is safe in your Google account.", "info");
  }).catch(err => {
    console.error("Sign-out error:", err);
    // Otherwise auth-gate keeps treating the next null-auth event as this
    // sign-out and purges local progress.
    if (window.authGate) window.authGate.cancelSignOut();
    showAuthToast("❌ Sign-out failed. You're still signed in — try again.", "error");
  });
}

// ── AUTH STATE LISTENER ───────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  // A user appearing mid-demo (e.g. signed in from another tab): drop the
  // sample state by reloading before anything can load, merge or save.
  if (inDemoMode()) {
    if (user) location.reload();
    return;
  }
  currentUser = user;
  updateAuthUI(user);

  if (user) {
    // User just signed in — load their cloud state
    showAuthToast("Loading your cloud save...", "info");
    await loadStateFromFirestore();
    stateReady = true;
    runStatePipeline();
    saveState();
    initUI();
    window.__appStateLoaded = true;
    window.dispatchEvent(new Event("app:state-loaded"));
    showAuthToast(`Synced ☁️ Welcome back, ${user.displayName?.split(' ')[0] || 'hacker'}!`, "success");
  }
});

// ── SYNC BOOKKEEPING ──────────────────────────────────────────
// Merge rule and cloud layout: see js/sync-core.js.
const SYNC_LOCAL_KEY = "cyber_sync_state_v1";   // { uid, lastSyncedAt }
const MAX_PIECE_CHARS = 900000;                  // stay under Firestore's 1 MiB/doc

// What this device last saw in the cloud, so only changed months get written.
let cloudCache = { meta: null, root: null, months: {}, notes: null, legacy: false };
let saveInFlight = null;
let saveAgain = false;
let syncStatus = "synced";

function readSyncLocal() {
  try { return JSON.parse(localStorage.getItem(SYNC_LOCAL_KEY)) || {}; } catch (e) { return {}; }
}
function getLastSyncedAt() {
  const s = readSyncLocal();
  return currentUser && s.uid === currentUser.uid ? (s.lastSyncedAt || 0) : 0;
}
function setLastSyncedAt(ms) {
  if (!currentUser) return;
  try { localStorage.setItem(SYNC_LOCAL_KEY, JSON.stringify({ uid: currentUser.uid, lastSyncedAt: ms })); } catch (e) {}
}

function setSyncStatus(status) {
  syncStatus = status;
  const el = document.getElementById("sync-indicator");
  if (!el) return;
  const labels = { synced: "Synced", saving: "Saving…", offline: "Offline", error: "Sync error" };
  el.dataset.state = status;
  el.textContent = labels[status] || status;
  el.title = status === "offline" ? "Changes are saved on this device and will upload when you're back online."
    : status === "error" ? "Cloud save failed. Changes are saved on this device."
    : "";
}
window.setSyncStatus = setSyncStatus;

function isOfflineError(e) {
  return (typeof navigator !== "undefined" && navigator.onLine === false) ||
    (e && (e.code === "unavailable" || e.code === "deadline-exceeded"));
}

function userRef() { return db.collection("users").doc(currentUser.uid); }

// Reads the full cloud copy. Returns { state, pieces, legacy } or null.
async function readCloud(rootSnap) {
  if (inDemoMode()) return null;
  const snap = rootSnap || await userRef().get({ source: "server" });
  if (!snap.exists) return null;
  const data = snap.data();
  if (data.schema === SyncCore.SCHEMA) {
    const keys = Array.isArray(data.months) ? data.months : [];
    const monthSnaps = await Promise.all(keys.map(m => userRef().collection("months").doc(m).get({ source: "server" })));
    const notesSnap = await userRef().collection("notes").doc("main").get({ source: "server" });
    const pieces = {
      meta: data.meta || null,
      root: data.root || "{}",
      months: {},
      notes: notesSnap.exists ? notesSnap.data().notes : "{}"
    };
    monthSnaps.forEach((s, i) => { if (s.exists) pieces.months[keys[i]] = s.data().days; });
    return { state: SyncCore.join(pieces), pieces, legacy: false };
  }
  if (data.state) {
    // Old single-document format: migrated by the next save, which writes the
    // split docs and deletes the `state` field in the same batch.
    const state = JSON.parse(data.state);
    return { state, pieces: { meta: null, root: null, months: {}, notes: null }, legacy: true };
  }
  return null;
}

// Applies the merge rule between appState and a cloud copy. Returns the choice.
function reconcileWithCloud(cloud) {
  if (inDemoMode()) return "local";
  const choice = SyncCore.decide(appState, cloud && cloud.state, getLastSyncedAt(), cloud && cloud.legacy);
  if (cloud) {
    cloudCache = { meta: cloud.pieces.meta, root: cloud.pieces.root, months: cloud.pieces.months, notes: cloud.pieces.notes, legacy: cloud.legacy };
  }
  if (choice === "cloud") {
    appState = cloud.state;
    setLastSyncedAt(cloud.state.meta ? cloud.state.meta.updatedAt : 0);
  } else if (choice === "merge") {
    appState = SyncCore.merge(appState, cloud.state, Date.now(), SyncCore.getDeviceId(localStorage));
  }
  if (choice !== "local") {
    if (typeof resetTaskFingerprints === "function") resetTaskFingerprints();
    const { rolloverUndoSnapshot, ...persistable } = appState;
    localStorage.setItem("cyber_study_plan_state_2026", JSON.stringify(persistable));
  }
  return choice;
}

// ── SAVE TO FIRESTORE ─────────────────────────────────────────
// Never drops a save: a call made while one is in flight marks the state dirty
// and the running save loops once more when it finishes. The returned promise
// settles after every queued pass is done (signOutFirebase relies on this).
function saveStateToFirestore() {
  if (inDemoMode()) return Promise.resolve();
  if (!currentUser) return Promise.resolve();
  if (saveInFlight) { saveAgain = true; return saveInFlight; }
  saveInFlight = (async () => {
    do {
      saveAgain = false;
      await writeOnce();
    } while (saveAgain && currentUser && !inDemoMode());
  })().finally(() => { saveInFlight = null; });
  return saveInFlight;
}

async function writeOnce() {
  if (inDemoMode()) return;
  setSyncStatus("saving");
  try {
    // A server read first: it fails fast when offline (instead of a write that
    // hangs until reconnect) and tells us whether another device saved since
    // our last sync, in which case we merge before overwriting anything.
    const rootSnap = await userRef().get({ source: "server" });
    // Demo may have started while that read was in flight (session expired,
    // then "View demo"): appState is sample data now, so stop here.
    if (inDemoMode()) return;
    const cloudTs = rootSnap.exists && rootSnap.data().meta ? rootSnap.data().meta.updatedAt || 0 : 0;
    const cachedTs = cloudCache.meta ? cloudCache.meta.updatedAt || 0 : 0;
    if (rootSnap.exists && (cloudTs !== cachedTs || rootSnap.data().state)) {
      const cloud = await readCloud(rootSnap);
      if (inDemoMode()) return;
      const choice = reconcileWithCloud(cloud);
      if (choice !== "local" && stateReady) {
        if (typeof runStatePipeline === "function") runStatePipeline();
        if (typeof initUI === "function") initUI();
      }
      if (choice === "cloud") { setSyncStatus("synced"); return; }
    }

    const pieces = SyncCore.split(appState);
    const tooBig = [pieces.root, pieces.notes].concat(Object.values(pieces.months)).some(s => s.length > MAX_PIECE_CHARS);
    if (tooBig) throw Object.assign(new Error("A sync document is over the size limit."), { code: "too-large" });

    const dirtyMonths = Object.keys(pieces.months).filter(m => pieces.months[m] !== cloudCache.months[m]);
    const notesDirty = pieces.notes !== cloudCache.notes;
    const metaTs = pieces.meta ? pieces.meta.updatedAt : 0;
    const rootDirty = cloudCache.legacy || pieces.root !== cloudCache.root || metaTs !== cachedTs ||
      !rootSnap.exists || JSON.stringify(Object.keys(pieces.months)) !== JSON.stringify((rootSnap.data() || {}).months || []);
    if (!rootDirty && !notesDirty && dirtyMonths.length === 0) { setSyncStatus("synced"); return; }

    const batch = db.batch();
    const ts = firebase.firestore.FieldValue.serverTimestamp();
    dirtyMonths.forEach(m => batch.set(userRef().collection("months").doc(m), { days: pieces.months[m], updatedAt: ts }));
    if (notesDirty) batch.set(userRef().collection("notes").doc("main"), { notes: pieces.notes, updatedAt: ts });
    const rootDoc = {
      schema: SyncCore.SCHEMA,
      meta: pieces.meta || { updatedAt: 0, deviceId: SyncCore.getDeviceId(localStorage) },
      root: pieces.root,
      months: Object.keys(pieces.months),
      displayName: currentUser.displayName || null,
      email: currentUser.email || null,
      updatedAt: ts
    };
    if (rootSnap.exists && rootSnap.data().state !== undefined) rootDoc.state = firebase.firestore.FieldValue.delete();
    batch.set(userRef(), rootDoc, { merge: true });
    await batch.commit();

    cloudCache = { meta: rootDoc.meta, root: pieces.root, months: Object.assign({}, cloudCache.months, pieces.months), notes: pieces.notes, legacy: false };
    setLastSyncedAt(metaTs);
    setSyncStatus(saveAgain ? "saving" : "synced");
  } catch (e) {
    if (isOfflineError(e)) {
      setSyncStatus("offline");
    } else {
      console.error("Firebase save error:", e.code, e.message);
      setSyncStatus("error");
      if (e.code === "permission-denied") {
        showAuthToast("☁️ Cloud blocked by Firestore rules — see setup. Saved locally.", "error");
      } else if (e.code === "too-large") {
        showAuthToast("Cloud save failed: data too large. Saved locally.", "error");
      } else {
        showAuthToast("Cloud save failed. Progress still saved locally.", "error");
      }
    }
    saveAgain = false; // retried on the next save, on reconnect, or on focus
  }
}

// ── LOAD FROM FIRESTORE ───────────────────────────────────────
async function loadStateFromFirestore() {
  if (inDemoMode()) return;
  if (!currentUser) return;
  cloudCache = { meta: null, root: null, months: {}, notes: null, legacy: false };
  try {
    const cloud = await readCloud();
    if (inDemoMode()) return;
    const localTasks = (appState?.days || []).reduce((n, d) => n + (d.tasks?.length || 0), 0);
    if (!cloud && localTasks === 0) generateNewState();
    reconcileWithCloud(cloud);
    setSyncStatus("synced");
  } catch (e) {
    console.error("Firebase load error:", e);
    setSyncStatus(isOfflineError(e) ? "offline" : "error");
    showAuthToast("Cloud load failed. Using local save.", "error");
  }
}

// Pick up another device's changes when this tab comes back into view or the
// connection returns. A local unsynced edit is merged, never overwritten.
async function pullIfRemoteChanged() {
  if (inDemoMode()) return;
  if (!currentUser || !stateReady || saveInFlight) return;
  try {
    const rootSnap = await userRef().get({ source: "server" });
    if (inDemoMode()) return;
    const data = rootSnap.exists ? rootSnap.data() : null;
    const cloudTs = data && data.meta ? data.meta.updatedAt || 0 : 0;
    const cachedTs = cloudCache.meta ? cloudCache.meta.updatedAt || 0 : 0;
    const localTs = appState.meta ? appState.meta.updatedAt || 0 : 0;
    if (data && cloudTs !== cachedTs) {
      const choice = reconcileWithCloud(await readCloud(rootSnap));
      if (choice !== "local") { runStatePipeline(); initUI(); }
      if (choice !== "cloud") await saveStateToFirestore();
      else setSyncStatus("synced");
    } else if (localTs > getLastSyncedAt()) {
      await saveStateToFirestore();
    } else {
      setSyncStatus("synced");
    }
  } catch (e) {
    setSyncStatus(isOfflineError(e) ? "offline" : "error");
  }
}
window.pullIfRemoteChanged = pullIfRemoteChanged;

if (typeof window.addEventListener === "function") {
  window.addEventListener("online", () => { pullIfRemoteChanged(); });
  window.addEventListener("offline", () => { if (currentUser) setSyncStatus("offline"); });
  window.addEventListener("focus", () => { pullIfRemoteChanged(); });
}
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullIfRemoteChanged();
  });
}

// ── AUTH UI ───────────────────────────────────────────────────
function updateAuthUI(user) {
  const bar = document.getElementById("auth-status-bar");
  const signInBtn = document.getElementById("auth-signin-btn");
  const signOutBtn = document.getElementById("auth-signout-btn");
  const userInfo = document.getElementById("auth-user-info");
  const avatar = document.getElementById("auth-avatar");
  if (inDemoMode()) return; // applyDemoChrome() owns the bar in demo

  if (user) {
    bar.classList.remove("auth-unsigned");
    bar.classList.add("auth-signed");
    signInBtn.classList.add("hidden");
    signOutBtn.classList.remove("hidden");
    userInfo.innerText = `${user.displayName || user.email}`;
    userInfo.classList.remove("hidden");
    const ind = document.getElementById("sync-indicator");
    if (ind) ind.classList.remove("hidden");
    if (avatar) {
      avatar.src = user.photoURL || "";
      avatar.classList.toggle("hidden", !user.photoURL);
    }
  } else {
    bar.classList.add("auth-unsigned");
    bar.classList.remove("auth-signed");
    signInBtn.classList.remove("hidden");
    signOutBtn.classList.add("hidden");
    userInfo.innerText = "";
    userInfo.classList.add("hidden");
    const ind = document.getElementById("sync-indicator");
    if (ind) ind.classList.add("hidden");
    if (avatar) avatar.classList.add("hidden");
  }
}

// ── TOAST NOTIFICATIONS ───────────────────────────────────────
function showAuthToast(message, type = "info") {
  const existing = document.getElementById("auth-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "auth-toast";
  toast.className = `auth-toast auth-toast-${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("auth-toast-visible"), 50);
  setTimeout(() => {
    toast.classList.remove("auth-toast-visible");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
