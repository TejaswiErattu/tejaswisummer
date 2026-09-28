// ============================================================================
// ASSISTANT ACCESS CONFIG
//
// The assistant uses the tracker's Firebase Google sign-in (see auth.js); there
// is no separate OAuth client any more. This list only decides WHICH signed-in
// Google accounts may unlock the panel. In proxy mode, keep it in sync with
// ALLOWED_EMAILS in the Worker (proxy/README.md) - the Worker's copy is the one
// that is actually enforced.
// ============================================================================

// Compared case-insensitively after trimming.
export const ALLOWED_EMAILS = [
  "tjerattu@uw.edu"
];
