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
  var SNAPSHOT_KEYS = ["chatbot_undo_stack_v1", "chatbot_history_v1"];

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

  function purgeLocalProgress() {
    try { localStorage.removeItem(LOCAL_STATE_KEY); } catch (e) {}
    SNAPSHOT_KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }

  // --- auth wiring ----------------------------------------------------------

  function onAuthResolved(user) {
    resolved = true;
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

    if (user) {
      clearError();
      unlock();
      return;
    }

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

    // Stay locked if auth never answers, but say why instead of spinning forever.
    timeoutId = setTimeout(function () {
      if (resolved) return;
      lock();
      showError("Still waiting on Google sign-in. Check your connection, then reload.");
    }, AUTH_TIMEOUT_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
