# Mode B — Cloudflare Worker proxy

This is the mode to use once anyone other than you can reach the deployed site.

**Why it exists:** in Mode A your Anthropic API key lives in `localStorage` in
your browser. That's fine for a single-user tool on your own laptop, but the key
is readable by anything running in that browser profile, and the Google sign-in
gate is only a UI lock there. In Mode B the key lives in a Worker secret, never
reaches the browser, and the Google ID token is verified **server-side** — so
the allowlist is enforced somewhere you don't control from DevTools.

---

## What the Worker does

On every request it:

1. Rejects anything that isn't a `POST` from an allowed origin.
2. Rejects bodies over 128 KB (declared *and* actual length).
3. Requires an `Authorization: Bearer <google-id-token>` header.
4. **Verifies the token properly** — RS256 signature against Google's published
   JWKS (`https://www.googleapis.com/oauth2/v3/certs`), issuer, `aud` matching
   your client ID, `exp`/`nbf`/`iat` with 60s of clock skew, and `email_verified`.
5. Checks the email against `ALLOWED_EMAILS`. Fails **closed** — if the variable
   is unset, nobody gets in.
6. Clamps `max_tokens` to 4096 so a caller can't run up your bill.
7. Only then forwards to `https://api.anthropic.com/v1/messages` with your key.

Any failure returns `401` (or `403`/`413`/`400`) and the request never reaches
Anthropic. The token is never logged and never echoed back.

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
GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com"
ALLOWED_EMAILS   = "tjerattu@uw.edu"
ALLOWED_ORIGINS  = "https://tejaswierattu.github.io,http://localhost:8777"
```

`GOOGLE_CLIENT_ID` must be byte-identical to the one in
`js/chatbot/auth-config.js`, or every token fails the audience check.

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
# No token -> 401
curl -i -X POST https://YOUR-WORKER.workers.dev \
  -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-5","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'

# Garbage token -> 401 "malformed token"
curl -i -X POST https://YOUR-WORKER.workers.dev \
  -H 'authorization: Bearer not.a.jwt' \
  -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-5","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'

# Oversized body -> 413
head -c 200000 /dev/zero | tr '\0' 'x' > /tmp/big.txt
curl -i -X POST https://YOUR-WORKER.workers.dev \
  -H 'authorization: Bearer not.a.jwt' \
  -H 'content-type: application/json' \
  --data-binary @/tmp/big.txt
```

An expired token, or a valid token for an email not on the list, both return
`401` with a message saying which check failed.

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
