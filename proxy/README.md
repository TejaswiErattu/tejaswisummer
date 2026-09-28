# Mode B — Cloudflare Worker proxy

This is the mode to use once anyone other than you can reach the deployed site.

**Why it exists:** in Mode A your Anthropic API key lives in `localStorage` in
your browser. That's fine for a single-user tool on your own laptop, but the key
is readable by anything running in that browser profile, and the sign-in gate is
only a UI lock there. In Mode B the key lives in a Worker secret, never reaches
the browser, and the caller's **Firebase ID token** is verified **server-side** —
so the allowlist is enforced somewhere you don't control from DevTools.

The token comes from the tracker's own Google sign-in (Firebase Auth). There is
no separate chatbot sign-in: the panel calls
`firebase.auth().currentUser.getIdToken()` before every request, and the
Firebase SDK refreshes the token automatically before its one-hour expiry.

---

## What the Worker does

On every request it:

1. Rejects anything that isn't a `POST` from an allowed origin.
2. Rejects bodies over 128 KB (declared *and* actual length).
3. Requires an `Authorization: Bearer <firebase-id-token>` header.
4. **Verifies the token properly** — RS256 signature against Firebase's
   securetoken JWKS
   (`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`),
   `iss` = `https://securetoken.google.com/<FIREBASE_PROJECT_ID>`,
   `aud` = `<FIREBASE_PROJECT_ID>`, `exp`/`iat`/`auth_time` with 60s of clock
   skew, a non-empty `sub`, and `email_verified: true`.
   If a token names a signing key the Worker hasn't cached (Firebase rotates
   them), it re-fetches the key set once (at most every 30 s) before rejecting.
5. Checks the email against `ALLOWED_EMAILS`. Fails **closed** — if the variable
   is unset, nobody gets in.
6. Checks the requested `model` against `ALLOWED_MODELS` (default: the three
   models the app's picker offers) and rejects anything else with `400`.
7. Clamps `max_tokens` to 4096 so a caller can't run up your bill (a missing or
   non-positive value is a `400`).
8. Only then forwards to `https://api.anthropic.com/v1/messages` with your key.

Status codes: `401` = missing/invalid/expired sign-in token (the app tells the
user to sign in again); `403` = origin or email not allowed; `400` = bad body,
model not allowed or bad `max_tokens`; `413` = body too large. The request never
reaches Anthropic on any of these. The token is never logged, and error
responses are generic — the specific reason (for example a signature failure)
goes to the Worker's log only (`wrangler tail`).

---

## Deploy

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create `wrangler.toml` next to `worker.js`

```toml
name = "study-tracker-chat-proxy"
main = "worker.js"
compatibility_date = "2024-11-01"

[vars]
FIREBASE_PROJECT_ID = "tejaswisummer"
ALLOWED_EMAILS   = "you@example.com"
ALLOWED_ORIGINS  = "https://your-username.github.io,http://localhost:8777"
# Optional. Defaults to claude-sonnet-5, claude-haiku-4-5, claude-opus-5.
# ALLOWED_MODELS = "claude-sonnet-5,claude-haiku-4-5"
```

`FIREBASE_PROJECT_ID` must match `projectId` in `firebase-config.js`, or every
token fails the issuer/audience check. (The old `GOOGLE_CLIENT_ID` variable is
no longer used; you can delete it.)

Keep `ALLOWED_EMAILS` in step with `js/chatbot/auth-config.js`. The browser copy
only decides whether the panel unlocks; the Worker's copy is the one enforced.

### 3. Add the Anthropic key as a secret

Never put this in `wrangler.toml` — `.toml` gets committed, secrets don't.

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Paste the key when prompted.

### 4. Deploy

```bash
wrangler deploy
```

Wrangler prints a URL like `https://study-tracker-chat-proxy.<you>.workers.dev`.

### 5. Point the app at it

In the chatbot panel: **⚙ → Mode → `B · Proxy endpoint`**, paste the Worker URL,
click Save. Then remove your stored key with **Remove stored key** — in proxy
mode the browser never needs it again.

---

## Updating the allowlist

```bash
wrangler deploy   # after editing ALLOWED_EMAILS in wrangler.toml
```

Or, to keep the list out of the repo entirely, make it a secret instead:

```bash
wrangler secret put ALLOWED_EMAILS   # comma-separated, no spaces needed
```

A secret of the same name takes precedence over the `[vars]` entry.

---

## Verifying it works

```bash
# Use an origin from your ALLOWED_ORIGINS. Without an allowed Origin header the
# Worker answers 403 before it looks at the token.

# No token -> 401
curl -i -X POST https://YOUR-WORKER.workers.dev \
  -H 'origin: https://your-username.github.io' \
  -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-5","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'

# Garbage token -> 401 "Invalid or expired sign-in token"
curl -i -X POST https://YOUR-WORKER.workers.dev \
  -H 'origin: https://your-username.github.io' \
  -H 'authorization: Bearer not.a.jwt' \
  -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-5","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'

# Oversized body -> 413
head -c 200000 /dev/zero | tr '\0' 'x' > /tmp/big.txt
curl -i -X POST https://YOUR-WORKER.workers.dev \
  -H 'origin: https://your-username.github.io' \
  -H 'authorization: Bearer not.a.jwt' \
  -H 'content-type: application/json' \
  --data-binary @/tmp/big.txt
```

An expired or tampered token returns `401`; a valid token for an email not on the
list returns `403`. Neither says which check failed — run `wrangler tail` to see
the reason in the Worker log.

---

## Local testing

```bash
wrangler dev
```

Then set the proxy URL in settings to `http://127.0.0.1:8787`. Add that origin
to `ALLOWED_ORIGINS` while you're testing.

---

## Cost note

The Worker free tier covers 100,000 requests/day, which is far more than this
will ever use. You pay Anthropic for tokens either way; the proxy adds nothing.
