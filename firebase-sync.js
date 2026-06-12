// Firebase Sync Engine — Google Auth + Firestore cloud save/load

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let isSyncing = false;

// ── SIGN IN / OUT ─────────────────────────────────────────────
function signInWithGoogle() {
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

function signOutFirebase() {
  auth.signOut().then(() => {
    showAuthToast("Signed out. Progress saved locally.", "info");
  });
}

// ── AUTH STATE LISTENER ───────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  updateAuthUI(user);

  if (user) {
    // User just signed in — load their cloud state
    showAuthToast("Loading your cloud save...", "info");
    await loadStateFromFirestore();
    initUI();
    showAuthToast(`Synced ☁️ Welcome back, ${user.displayName?.split(' ')[0] || 'hacker'}!`, "success");
  }
});

// ── SAVE TO FIRESTORE ─────────────────────────────────────────
async function saveStateToFirestore() {
  if (!currentUser || isSyncing) return;
  isSyncing = true;
  try {
    await db.collection("users").doc(currentUser.uid).set({
      state: JSON.stringify(appState),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      displayName: currentUser.displayName,
      email: currentUser.email
    });
  } catch (e) {
    console.error("Firebase save error:", e.code, e.message);
    if (e.code === "permission-denied") {
      showAuthToast("☁️ Cloud blocked by Firestore rules — see setup. Saved locally.", "error");
    } else {
      showAuthToast("Cloud save failed. Progress still saved locally.", "error");
    }
  } finally {
    isSyncing = false;
  }
}

// ── LOAD FROM FIRESTORE ───────────────────────────────────────
async function loadStateFromFirestore() {
  if (!currentUser) return;
  try {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if (doc.exists && doc.data().state) {
      const cloudState = JSON.parse(doc.data().state);
      // Validate loaded state
      if (cloudState && cloudState.days && cloudState.days.length > 0) {
        appState = cloudState;
        // Also write to localStorage as local backup
        localStorage.setItem("cyber_study_plan_state_2026", JSON.stringify(appState));
      } else {
        // Cloud state is empty/corrupt — use local or generate fresh
        if (!appState.days || appState.days.length === 0) {
          generateNewState();
        }
      }
    } else {
      // No cloud save yet — upload current local state to cloud
      if (!appState.days || appState.days.length === 0) {
        generateNewState();
      }
      await saveStateToFirestore();
    }
  } catch (e) {
    console.error("Firebase load error:", e);
    showAuthToast("Cloud load failed. Using local save.", "error");
  }
}

// ── AUTH UI ───────────────────────────────────────────────────
function updateAuthUI(user) {
  const bar = document.getElementById("auth-status-bar");
  const signInBtn = document.getElementById("auth-signin-btn");
  const signOutBtn = document.getElementById("auth-signout-btn");
  const userInfo = document.getElementById("auth-user-info");
  const avatar = document.getElementById("auth-avatar");

  if (user) {
    bar.classList.remove("auth-unsigned");
    bar.classList.add("auth-signed");
    signInBtn.classList.add("hidden");
    signOutBtn.classList.remove("hidden");
    userInfo.innerText = `${user.displayName || user.email} — progress synced across all devices ☁️`;
    userInfo.classList.remove("hidden");
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
