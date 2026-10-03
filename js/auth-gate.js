// Sign-in gate for the tracker.
//
// The page ships locked (<body class="app-locked"> plus a visible #app-auth-gate)
// and only this file unlocks it, so a reload can never flash real progress before
// Firebase has said who is signed in. Failing closed matters more than being
// quick here: the thing being protected is which tasks are ticked off.
//
// Scope, honestly: this is a static site, so the gate is a UI lock, not a
// security boundary — anyone with devtools can hide it. The real boundary is
// firestore.rules, which only lets a signed-in user read their own document.
// What the gate genuinely buys: nobody can read or edit your progress by
// walking up to an open tab, and signing out leaves nothing behind locally.

(function () {
  "use strict";

  var LOCAL_STATE_KEY = "cyber_study_plan_state_2026";
  // Chatbot undo/audit entries embed whole-day task lists, completion flags and
  // all, so they have to go too or "signed out" would still leak progress.
  var SNAPSHOT_KEYS = ["chatbot_undo_stack_v1", "chatbot_history_v1", "chatbot_anthropic_api_key", "chatbot_settings_v1", "chatbot_ui_state_v1"];
  var SESSION_KEYS = ["chatbot_google_session"];
  // Sync bookkeeping (lastSyncedAt) belongs to the signed-out user's copy.
  var SYNC_KEYS = ["cyber_sync_state_v1"];

  var AUTH_TIMEOUT_MS = 12000;

  var explicitSignOut = false;
  var resolved = false;
  var timeoutId = null;

  function gate() { return document.getElementById("app-auth-gate"); }

  function setState(state) {
    var g = gate();
    if (g) g.setAttribute("data-state", state);
  }

  function showError(msg) {
    var g = gate();
    if (!g) return;
    var el = g.querySelector("[data-el='gate-error']");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError() {
    var g = gate();
    var el = g && g.querySelector("[data-el='gate-error']");
    if (el) el.hidden = true;
  }

  function lock() {
    document.body.classList.add("app-locked");
    var g = gate();
    if (g) g.hidden = false;
    setState("locked");
  }

  function unlock() {
    document.body.classList.remove("app-locked");
    var g = gate();
    if (g) g.hidden = true;
  }

  // --- demo ------------------------------------------------------------------
  // "View demo" loads invented sample data (demo-data.js) into memory and lifts
  // the gate. It is only reachable from the locked state, i.e. with nobody
  // signed in, and leaves localStorage untouched. The way out is a reload.
  function inDemo() { return typeof isDemoMode === "function" && isDemoMode(); }

  function enterDemo() {
    clearError();
    if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) return;
    if (typeof enterDemoMode !== "function" || !enterDemoMode()) {
      showError("The demo couldn't be loaded. Reload and try again.");
      return;
    }
    settle();
    unlock();
  }

  // A bare ?demo=1 does exactly what the button does, nothing more: no data is
  // read from the URL. The flag is dropped from the address bar first so
  // "Exit demo" (a reload) lands back on the gate.
  function demoRequestedByUrl() {
    try {
      var params = new URLSearchParams(location.search);
      if (params.get("demo") !== "1") return false;
      params.delete("demo");
      var qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
      return true;
    } catch (e) { return false; }
  }

  function purgeLocalProgress() {
    try { localStorage.removeItem(LOCAL_STATE_KEY); } catch (e) {}
    SNAPSHOT_KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    SYNC_KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    SESSION_KEYS.forEach(function (k) {
      try { sessionStorage.removeItem(k); } catch (e) {}
    });
  }

  // --- auth wiring ----------------------------------------------------------

  function settle() {
    resolved = true;
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
  }

  function armTimeout() {
    resolved = false;
    if (timeoutId) return;
    timeoutId = setTimeout(function () {
      timeoutId = null;
      if (resolved) return;
      lock();
      showError("Still waiting on Google sign-in. Check your connection, then reload.");
    }, AUTH_TIMEOUT_MS);
  }

  // Unlock only once firebase-sync.js has picked cloud vs local and migrated
  // it; unlocking on the user alone flashed stale local progress first.
  function onStateLoaded() {
    if (!firebase.auth().currentUser) return;
    settle();
    clearError();
    unlock();
  }

  function onAuthResolved(user) {
    // Mid-demo sign-in (another tab): reload so the sample state is gone
    // before the real load runs. A null user changes nothing in demo.
    if (inDemo()) {
      if (user) location.reload();
      return;
    }
    if (user) {
      setState("checking");
      armTimeout();
      return;
    }
    settle();

    // Signed out after clicking Sign Out: the cloud copy is already flushed by
    // signOutFirebase(), so drop every local trace and reload. The reload is the
    // point — it guarantees the next person starts from empty in-memory state
    // instead of inheriting the previous user's appState, which would otherwise
    // get pushed up to *their* Firestore document on sign-in.
    if (explicitSignOut) {
      explicitSignOut = false;
      purgeLocalProgress();
      location.reload();
      return;
    }

    // Signed out on arrival. Leave localStorage alone: this user may be about to
    // sign in, and firebase-sync's load path still needs any local progress that
    // never made it to the cloud.
    lock();
    if (demoRequestedByUrl()) enterDemo();
  }

  function init() {
    var g = gate();
    if (!g) return;

    setState("checking");

    var signInBtn = g.querySelector("[data-el='gate-signin']");
    if (signInBtn) {
      signInBtn.addEventListener("click", function () {
        clearError();
        if (typeof signInWithGoogle === "function") {
          signInWithGoogle();
        } else {
          showError("Sign-in isn't available — Firebase failed to load. Check your connection and reload.");
        }
      });
    }

    var demoBtn = g.querySelector("[data-el='gate-demo']");
    if (demoBtn) demoBtn.addEventListener("click", enterDemo);

    // Capture phase so this runs before app.js's own handler calls signOutFirebase().
    var signOutBtn = document.getElementById("auth-signout-btn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () { explicitSignOut = true; }, true);
    }

    if (typeof firebase === "undefined" || !firebase.auth) {
      lock();
      showError("Firebase failed to load, so your progress can't be unlocked. Check your connection and reload.");
      return;
    }

    firebase.auth().onAuthStateChanged(onAuthResolved, function (err) {
      lock();
      showError("Couldn't verify your session: " + (err && err.code ? err.code : "unknown error"));
    });

    window.addEventListener("app:state-loaded", onStateLoaded);
    if (window.__appStateLoaded) onStateLoaded();

    // Stay locked if auth or the state load never answers, but say why.
    armTimeout();
  }

  window.authGate = {
    cancelSignOut: function () { explicitSignOut = false; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
