# Cyber Study Plan — Command Center

A personal study-and-commitments tracker for **June 13 – December 31, 2026**: a
calendar, a daily drawer, a progress dashboard, a rollover engine, Excel/CSV
export, Google-account sync across devices, and an AI assistant that drafts
schedule changes for you to approve.

**Live demo:** <https://tejaswierattu.github.io/tejaswisummer/?demo=1> opens the
tracker with made-up sample data (or click **View demo** on the sign-in screen).
Nothing in the demo is saved or synced.

It is a static site — plain HTML, CSS and JavaScript, no build step — plus
Firebase (sign-in and storage) and an optional Cloudflare Worker for the
assistant.

## What's in it

- **Calendar and day drawer.** Every day of the plan with colour-coded task
  blocks. Click a day to tick tasks, mark them partial, skip or block them, add
  notes, move a task to tomorrow, or drag it to another day. Moving a task never
  changes its id, so notes stay attached.
- **Plan.** The summer base plan runs to early September (AWS AI Practitioner,
  Security+, LeetCode Blind 75, cybersecurity projects, Palana, AHF, WINFO and
  mentor routines, an India-trip light-load window). The **fall extension**
  (`plan-extension-2026.js`) continues it through Dec 31 with Security+ and AWS
  Cloud Practitioner exam prep and exams, the Threat Modeling and Git Developer
  Tool projects, hackathons, job applications and interviews. PortSwigger is
  retired and kept only as history.
- **Rollover ("I didn't finish today").** Unfinished, non-fixed tasks move
  forward: to today if the day is today or past, otherwise to the next day.
  Fixed tasks (exams, meetings, hackathon days, milestones) stay where they are
  and are listed as "left in place". Rolled tasks keep all their fields and get
  a "rolled" badge. Undo is one click.
- **Capacity.** Each day has a capacity (lighter on Sundays, Saturdays and the
  India trip). `reportOverCapacity()` lists overloaded days and
  `rebalanceCapacity()` moves flexible work blocks to nearby days with room,
  never past a task's deadline and never moving exams or commitments. Days that
  stay heavy are flagged with a 🔥.
- **Dashboard.** Overall completion, streaks, Blind 75 counter, hours by
  category, certification badges (AWS AI Practitioner, Security+, AWS Cloud
  Practitioner) and an at-risk banner when work overflows the plan.
- **Category manager and extracurriculars.** Add, recolour, archive and delete
  categories; track commitments (WINFO, AHF, mentorship…) with weekly hours.
- **Settings.** Daily hour limit, Palana on/off, Palana Security role on/off,
  AHF weekly target (sets the default daily AHF length), manual "passed" toggles
  for each certification, and a full reset.
- **Export.** Reports panel → a multi-sheet `.xlsx` workbook (dashboard,
  schedule, completed, unfinished, weekly, certifications, LeetCode, projects,
  resources, settings…) or a CSV of the schedule. Built in the browser with
  ExcelJS and FileSaver (loaded from a CDN on first use). Exam dates come from
  the plan itself.
- **Assistant panel.** A chat panel that turns plain-English requests ("add a
  pen-test lab every Tuesday for a month") into a preview of changes. Nothing is
  applied until you click Apply, and the last 20 batches can be undone
  individually without touching your other edits. See below.

## Sign-in and sync

The tracker is locked until you **sign in with Google** (Firebase Authentication).
Progress is stored in your browser and synced to Firestore under your account, so
every device signed into the same account sees the same plan.

- Local state lives in `localStorage` (`cyber_study_plan_state_2026`); signing out
  clears it after flushing to the cloud.
- Cloud layout: `users/{uid}` (settings, categories, extracurriculars, metadata),
  `users/{uid}/months/{YYYY-MM}` (each month's days) and `users/{uid}/notes/main`
  (task notes). Only changed months are written.
- If two devices edit while apart, they merge per task (the later `updatedAt`
  wins; deletions are remembered). The rules are documented in
  `js/sync-core.js`.
- A **Synced / Saving / Offline** indicator sits in the top bar.
- Security rules are in `firestore.rules`: each user can read and write only
  their own documents, with size and shape checks.

### Firebase setup (once)

1. Use your own Firebase project and put its web config in `firebase-config.js`.
2. Enable **Google** under Authentication → Sign-in method.
3. Add every host that serves the site (for example `localhost` and your GitHub
   Pages domain) under Authentication → Settings → Authorized domains.
4. Publish `firestore.rules` (Firestore → Rules).

### Demo mode

"View demo" on the sign-in screen loads an invented plan from `demo-data.js`
(about eight weeks centred on today) into memory and lifts the gate. While it is
on:

- nothing is written to `localStorage` and nothing is read from or written to
  Firestore; any real progress already stored in the browser is left untouched;
- the assistant and export are switched off, and the sections that are specific
  to the real plan (settings, tracks, project list, resource links, exam and
  LeetCode cards) are hidden;
- "Exit demo" and "Sign in" both reload the page first, so the sample state is
  never in memory when someone signs in.

`?demo=1` only presses the same button; no data is ever read from the URL. Demo
is not reachable while signed in. Note that the demo hides the real plan's text
in the UI, but that text still ships in the page's public source files.

## The assistant

The panel supports two modes (⚙ in the panel):

- **A · Direct** — your Anthropic API key is stored in this browser and calls go
  straight to the API. Fine for a personal machine; never use it on a shared one.
- **B · Proxy** — requests go to a Cloudflare Worker that holds the key, checks
  your Firebase sign-in token, an email allowlist, the origin and the model, and
  clamps `max_tokens`. Setup and deployment are in [`proxy/README.md`](proxy/README.md).

The panel unlocks with the same Google sign-in as the tracker, restricted to the
emails in `js/chatbot/auth-config.js`. It can add, move, update, complete and
delete tasks, add recurring series, milestones, categories and dated projects.
Every change is validated in code first (real categories and task ids, dates
inside the plan, size limits) and shown as a diff.

## Running it locally

The page needs to be served over HTTP (Firebase sign-in and the assistant's ES
modules don't work from `file://`):

```bash
python3 -m http.server 8777
```

Open `http://localhost:8777` and sign in. Make sure `localhost` is an authorized
domain in your Firebase project.

## Tests

```bash
npm test
```

runs four suites with plain Node (no dependencies, no browser):

| Suite | File | Covers |
|---|---|---|
| Assistant | `test-chatbot.mjs` | operation validation, operation-level undo, task context and lookups, API client (retries, truncation, proxy errors), Worker auth/model/limits |
| Sync | `test-sync.js` | two simulated devices against a fake Firestore: merge, offline edits, rapid saves, migration |
| Demo | `test-demo.js` | demo mode isolation: no Firestore calls, no storage writes, no assistant requests, exit reloads |
| Scheduler | `test-scheduler.js` | base plan and extension, capacity, rollover, exams, migrations, reset, Git roadmap |

The scheduler suite currently reports two known failures — days in June–August
whose base-plan load exceeds their capacity ("India trip days respect the 3h
cap" and "Baseline capacity respected on every day"). They are historical
overloads in already-completed weeks and are not regressions.

## Project layout

```
index.html                  page markup, modals, drawer
style.css                   theme and layout
css/                        chatbot.css, auth-gate.css
app.js                      state, scheduler, rollover, calendar, drawer, settings, dashboard
plan-extension-2026.js      Sep–Dec extension, capacity report and rebalance
blind75.js, git-roadmap.js  LeetCode list and the summer Git roadmap
export.js                   Excel / CSV export
demo-data.js                invented sample plan for demo mode
firebase-config.js          Firebase web config
firebase-sync.js            sign-in and Firestore sync
js/sync-core.js             pure split/merge logic used by sync
js/auth-gate.js             sign-in lock screen
js/chatbot/                 assistant panel (adapter, operations, API client, prompt, panel)
proxy/                      Cloudflare Worker + README (not published)
firestore.rules             Firestore security rules (not published)
test-*.js, test-chatbot.mjs tests (not published)
.github/workflows/          GitHub Pages deploy
```

## Deploying

`.github/workflows/deploy-pages.yml` publishes to GitHub Pages on every push to
`main`. It copies only the site files — `index.html`, `style.css`, the root `*.js`
except `test-*.js`, `css/` and `js/` — into `_site/` and uploads that, so
`proxy/`, the tests, `package.json`, `firestore.rules` and this README are not
published. In the repository settings set Pages → Source to **GitHub Actions**.
