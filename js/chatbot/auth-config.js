// ============================================================================
// GOOGLE SIGN-IN CONFIG
//
// HOW TO GET A CLIENT ID
// ----------------------
// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Create (or pick) a project.
// 3. "Create Credentials" -> "OAuth client ID" -> Application type: "Web application".
// 4. Under "Authorized JavaScript origins" add BOTH of these:
//       https://tejaswierattu.github.io
//       http://localhost:8777
//    (Origins only - no paths. GIS rejects origins with a path.)
// 5. Copy the "Client ID" (it ends in .apps.googleusercontent.com) and paste it
//    below in place of the placeholder.
//
// The client ID is NOT a secret - it is designed to be public and ships in the
// page source of every site that uses Google Sign-In. Your Anthropic API key is
// a secret and must never appear in this file or anywhere else in the repo.
// ============================================================================

export const GOOGLE_CLIENT_ID = "290456318821-eocpb3dodkfginkoj59irim4nll0ur8d.apps.googleusercontent.com";

// Only these email addresses may unlock the chatbot panel.
// Compared case-insensitively after trimming.
export const ALLOWED_EMAILS = [
  "tjerattu@uw.edu"
];

// Set to true to bypass the Google gate entirely while developing locally.
// This ONLY takes effect on localhost / 127.0.0.1 - it is ignored on any real
// host, so leaving it true cannot accidentally unlock the deployed site.
export const ALLOW_LOCALHOST_BYPASS = true;

export function isLocalhost() {
  const h = location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export function isConfigured() {
  return typeof GOOGLE_CLIENT_ID === "string" &&
         GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com") &&
         !GOOGLE_CLIENT_ID.startsWith("PASTE_YOUR_CLIENT_ID_HERE");
}
