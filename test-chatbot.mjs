// Chatbot adapter/operations tests (no browser, no model calls).
//
// Loads js/chatbot/adapter.js and operations.js as ES modules against a small
// fake host (appState + the handful of app.js globals the adapter uses), then
// exercises operation-level undo, the model context, lookups, add_project and
// the schema changes.

const TODAY = "2026-10-05";
const day = (date, tasks = []) => ({ date, isIndia: false, maxCapacity: 8, rolledOver: false, tasks });
const task = (id, extra = {}) => ({ id, category: "custom", title: id, duration: 1, completed: false, ...extra });

function freshState() {
  const days = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(Date.UTC(2026, 9, 1 + i));
    days.push(day(d.toISOString().slice(0, 10)));
  }
  const at = (date) => days.find(d => d.date === date);
  at("2026-10-05").tasks.push(task("t_today", { title: "Read chapter 3", category: "secplus" }));
  at("2026-10-06").tasks.push(task("t_tomorrow", { title: "Mentor meeting", category: "mentor", fixed: true }));
  at("2026-10-12").tasks.push(task("t_later", { title: "Lab write-up" }));
  at("2026-11-20").tasks.push(task("t_far", { title: "Far future task" }));
  return { days, settings: {}, categories: {}, taskNotes: { t_later: { text: "keep me" } } };
}

// --- fake host globals -----------------------------------------------------
globalThis.appState = freshState();
globalThis.BUILT_IN_CATEGORIES = { custom: { name: "Custom" }, projects: { name: "Projects" }, secplus: { name: "Sec+" }, mentor: { name: "Mentor" } };
globalThis.TRACK_4_PROJECTS = [];
globalThis.getAllCategories = () => ({ ...BUILT_IN_CATEGORIES, ...(appState.categories || {}) });
globalThis.getRealCurrentDate = () => TODAY;
globalThis.START_DATE_STR = "2026-06-13";
globalThis.END_DATE_STR = "2026-12-31";
globalThis.saveState = () => {};
globalThis.touchTask = (t) => { if (t) t.updatedAt = Date.now(); return t; };
globalThis.getTaskNotes = (id) => appState.taskNotes[id] || { text: "" };
globalThis.saveTaskNote = (id, n) => { appState.taskNotes[id] = { ...n, lastUpdated: new Date().toISOString() }; };
globalThis.requestAnimationFrame = (fn) => fn();
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({ textContent: "" }),
  head: { appendChild() {} },
  querySelector: () => null,
  querySelectorAll: () => []
};

const adapter = await import("./js/chatbot/adapter.js?v=20260927c");
const ops = await import("./js/chatbot/operations.js?v=20260927c");

let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS: ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`); }
}
const find = (id) => { for (const d of appState.days) { const t = d.tasks.find(x => x.id === id); if (t) return { t, date: d.date }; } return null; };
const reset = () => { globalThis.appState = freshState(); TRACK_4_PROJECTS.length = 0; };
const r = (op) => ({ reason: "test", ...op });
const apply = (list, label = "batch") => {
  const v = ops.validateBatch(list, adapter.buildValidationContext());
  if (!v.ok) throw new Error("invalid: " + v.errors.map(e => e.message).join("; "));
  return adapter.applyOperations(list, { label, message: label });
};

console.log("\nContext");
{
  const ctx = adapter.getState({ recentlyDiscussedTaskIds: ["t_later", "missing_id"] });
  const ids = ctx.tasks.map(t => t.id);
  check("Window covers today..+14", ctx.taskWindow.start === TODAY && ctx.taskWindow.end === "2026-10-19");
  check("Task list includes today/tomorrow/in-window tasks", ["t_today", "t_tomorrow", "t_later"].every(i => ids.includes(i)));
  check("Task list excludes tasks past the window", !ids.includes("t_far"));
  const row = ctx.tasks.find(t => t.id === "t_tomorrow");
  check("Rows are compact: id,date,title,category,minutes,completed,fixed",
    JSON.stringify(Object.keys(row)) === JSON.stringify(["id", "date", "title", "category", "minutes", "completed", "fixed"]) && row.fixed === true && row.minutes === 60);
  check("recentlyDiscussed resolved to id+title+date, unknown ids dropped",
    ctx.recentlyDiscussed.length === 1 && ctx.recentlyDiscussed[0].title === "Lab write-up" && ctx.recentlyDiscussed[0].date === "2026-10-12");
  check("No tracks in the context", !("tracks" in ctx));

  const look = adapter.lookupTasks("2026-11-01", "2026-11-30");
  check("Lookup returns tasks in the requested range", look.tasks.length === 1 && look.tasks[0].id === "t_far");
  const wide = adapter.lookupTasks("2026-10-01", "2027-06-30");
  check("Lookup is clamped to ~2 months", wide.truncated === true && wide.endDate === "2026-12-01");
  check("Bad lookup reports an error", !!adapter.lookupTasks("2026-11-30", "2026-11-01").error);
}

console.log("\nUndo: add");
reset();
{
  const res = apply([r({ op: "add_task", title: "Pen test lab", category: "custom", date: "2026-10-08", notes: "bring VM" })], "add lab");
  const id = res.created[0].task.id;
  check("Task added", !!find(id));
  check("Undo log lives in appState", Array.isArray(appState.chatbotUndoLog) && appState.chatbotUndoLog.length === 1);
  const u = adapter.undoLast();
  check("Undo removes the added task", u.ok && !find(id));
  check("Undo removes the note it created", appState.taskNotes[id] === undefined);
  check("Undo pops the entry", adapter.undoDepth() === 0);
}

console.log("\nUndo after a manual edit");
reset();
{
  const res = apply([
    r({ op: "add_task", title: "New A", category: "custom", date: "2026-10-08" }),
    r({ op: "move_task", taskId: "t_later", newDate: "2026-10-14" }),
    r({ op: "update_task", taskId: "t_today", changes: { title: "Read chapter 4", estimatedMinutes: 90 } })
  ], "mixed");
  // Manual edits AFTER the batch:
  find("t_tomorrow").t.completed = true;                 // unrelated task ticked
  find("t_today").t.title = "Read chapter 4 + quiz";     // same field the bot changed
  const newA = res.created[0].task.id;
  const u = adapter.undoLast();
  check("Undo succeeded", u.ok);
  check("Added task removed", !find(newA));
  check("Moved task returned to its original day", find("t_later").date === "2026-10-12");
  check("Unrelated manual tick kept", find("t_tomorrow").t.completed === true);
  check("Manual title edit kept (not reverted to the old title)", find("t_today").t.title === "Read chapter 4 + quiz");
  check("Bot-only field reverted (duration back to 1h)", find("t_today").t.duration === 1);
  check("Undo reports what it kept", (u.skipped || []).some(s => s.includes("later edits")));
}

console.log("\nUndo: delete and completion");
reset();
{
  apply([r({ op: "delete_task", taskId: "t_later" }), r({ op: "set_completion", taskId: "t_today", completed: true })], "del");
  check("Deleted", !find("t_later"));
  const u = adapter.undoLast();
  check("Deleted task restored on its day with its note", u.ok && find("t_later").date === "2026-10-12" && appState.taskNotes.t_later.text === "keep me");
  check("Completion reverted", find("t_today").t.completed === false && find("t_today").t.completedAt === undefined);
}

console.log("\nUndo: added task the user completed since is kept");
reset();
{
  const res = apply([r({ op: "add_task", title: "X", category: "custom", date: "2026-10-09" })]);
  find(res.created[0].task.id).t.completed = true;
  const u = adapter.undoLast();
  check("Completed task kept, undo still succeeds", u.ok && !!find(res.created[0].task.id));
}

console.log("\nUndo log limits and failure handling");
reset();
{
  for (let i = 0; i < 25; i++) apply([r({ op: "add_task", title: `T${i}`, category: "custom", date: "2026-10-10" })], `b${i}`);
  check("Capped at 20 batches", adapter.undoDepth() === 20 && appState.chatbotUndoLog[0].label === "b5");
  appState.chatbotUndoLog[0].at = Date.now() - 8 * 24 * 3600 * 1000;
  check("Entries older than 7 days dropped", adapter.undoDepth() === 19);

  const before = JSON.stringify(appState.days);
  appState.chatbotUndoLog.push({ at: Date.now(), label: "broken", inverse: [{ kind: "remove", taskId: "t_today" }, { kind: "restore", date: "2026-10-10", index: 0, task: null }] });
  const u = adapter.undoLast();
  check("Failed undo reports failure", u.ok === false);
  check("Failed undo keeps its entry (not popped)", adapter.peekUndo().label === "broken");
  check("Failed undo left the plan unchanged", JSON.stringify(appState.days) === before);
}

console.log("\nApply is all-or-nothing");
reset();
{
  const before = JSON.stringify(appState.days);
  const saved = globalThis.touchTask;
  let n = 0;
  globalThis.touchTask = (t) => { if (++n === 2) throw new Error("boom"); return saved(t); };
  let threw = false;
  try { adapter.applyOperations([r({ op: "add_task", title: "a", category: "custom", date: "2026-10-08" }), r({ op: "add_task", title: "b", category: "custom", date: "2026-10-09" })]); }
  catch { threw = true; }
  globalThis.touchTask = saved;
  check("Throw mid-batch rolls back and records no undo entry", threw && JSON.stringify(appState.days) === before && adapter.undoDepth() === 0);
}

console.log("\nadd_project");
reset();
{
  const op = r({ op: "add_project", name: "Home Lab", targetDate: "2026-10-26", subtasks: ["Buy hardware", "Install Proxmox", "Set up VLANs", "Write blog post"] });
  check("Counts as 4 task instances", ops.validateBatch([op], adapter.buildValidationContext()).instanceCount === 4);
  const res = apply([op], "project");
  const tasks = appState.days.flatMap(d => d.tasks.map(t => ({ ...t, date: d.date }))).filter(t => t.projectId === "bot_home_lab");
  check("One task per subtask with projectId", tasks.length === 4 && tasks.every(t => t.category === "projects"));
  check("Spread from tomorrow to the target date", tasks[0].date === "2026-10-06" && tasks[3].date === "2026-10-26" && new Set(tasks.map(t => t.date)).size === 4);
  check("Project registered as a dated card", TRACK_4_PROJECTS.some(p => p.id === "bot_home_lab" && p.dated));
  const done = tasks.filter(t => t.completed).length;
  check("Progress counter now has a denominator", tasks.length === 4 && done === 0);
  check("Duplicate project name rejected", !ops.validateBatch([op], adapter.buildValidationContext()).ok);
  adapter.undoLast();
  check("Undo removes the project and its tasks", !TRACK_4_PROJECTS.length && !appState.days.some(d => d.tasks.some(t => t.projectId === "bot_home_lab")));
  check("Past targetDate rejected", !ops.validateBatch([r({ op: "add_project", name: "Old", targetDate: "2026-09-01" })], adapter.buildValidationContext()).ok);
}

console.log("\nSchema: track and add_subsection removed");
{
  const ctx = adapter.buildValidationContext();
  check("add_subsection is unknown", !ops.validateBatch([r({ op: "add_subsection", key: "abc", title: "x" })], ctx).ok);
  check("track on add_task rejected", !ops.validateBatch([r({ op: "add_task", title: "x", category: "custom", date: "2026-10-08", track: "track1" })], ctx).ok);
  check("track in update_task.changes rejected", !ops.validateBatch([r({ op: "update_task", taskId: "t_today", changes: { track: "t" } })], ctx).ok);
  check("OPERATION_NAMES has no add_subsection", !ops.OPERATION_NAMES.includes("add_subsection"));
}

console.log("\nProxy: Firebase ID token verification");
{
  const worker = await import("./proxy/worker.js");
  const PROJECT = "tejaswisummer";
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  let fetchedUrl = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { fetchedUrl = url; return new Response(JSON.stringify({ keys: [jwk] })); };
  const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const good = { iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: "uid123", iat: now - 10, auth_time: now - 100, exp: now + 3600, email: "tjerattu@uw.edu", email_verified: true };
  const sign = async (claims, kid = "k1") => {
    const h = b64u(new TextEncoder().encode(JSON.stringify({ alg: "RS256", kid, typ: "JWT" })));
    const b = b64u(new TextEncoder().encode(JSON.stringify(claims)));
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(`${h}.${b}`));
    return `${h}.${b}.${b64u(new Uint8Array(sig))}`;
  };
  const verdict = async (claims, kid) => {
    try { await worker.verifyFirebaseIdToken(await sign(claims, kid), PROJECT); return "ok"; } catch (e) { return e.message; }
  };
  check("Valid Firebase token accepted", (await verdict(good)) === "ok");
  check("Keys fetched from the securetoken JWKS", String(fetchedUrl).includes("securetoken@system.gserviceaccount.com"));
  check("Google OAuth issuer rejected", (await verdict({ ...good, iss: "https://accounts.google.com" })) === "unexpected issuer");
  check("Other project audience rejected", (await verdict({ ...good, aud: "other-project" })) === "audience mismatch");
  check("Expired token rejected", (await verdict({ ...good, exp: now - 3600 })) === "token expired");
  check("Empty sub rejected", (await verdict({ ...good, sub: "" })) === "invalid subject");
  check("Unverified email rejected", (await verdict({ ...good, email_verified: false })) === "email not verified");
  check("Unknown key id rejected", (await verdict(good, "k2")) === "unknown signing key");
  const tampered = (await sign(good)).split("."); tampered[1] = b64u(new TextEncoder().encode(JSON.stringify({ ...good, email: "evil@x.com" })));
  let tamperMsg = ""; try { await worker.verifyFirebaseIdToken(tampered.join("."), PROJECT); } catch (e) { tamperMsg = e.message; }
  check("Tampered payload fails the signature check", tamperMsg === "signature verification failed");
  check("Allowlist still enforced", worker.__internals.isEmailAllowed("tjerattu@uw.edu", "tjerattu@uw.edu") && !worker.__internals.isEmailAllowed("x@y.com", "tjerattu@uw.edu"));
  globalThis.fetch = realFetch;
}


console.log("\nValidation: minutes, strings, window, duplicates, risk");
{
  const ctx = adapter.buildValidationContext();
  const bad = (list) => !ops.validateBatch(list, ctx).ok;
  const ok = (list) => ops.validateBatch(list, ctx).ok;
  const add = (extra) => r({ op: "add_task", title: "T", category: "custom", date: "2026-10-08", ...extra });
  check("update_task rejects NaN minutes", bad([r({ op: "update_task", taskId: "t_today", changes: { estimatedMinutes: NaN } })]));
  check("update_task rejects negative minutes", bad([r({ op: "update_task", taskId: "t_today", changes: { estimatedMinutes: -5 } })]));
  check("update_task rejects fractional / string / huge minutes",
    bad([r({ op: "update_task", taskId: "t_today", changes: { estimatedMinutes: 12.5 } })]) &&
    bad([r({ op: "update_task", taskId: "t_today", changes: { estimatedMinutes: "30" } })]) &&
    bad([r({ op: "update_task", taskId: "t_today", changes: { estimatedMinutes: 5000 } })]));
  check("update_task accepts 45 minutes", ok([r({ op: "update_task", taskId: "t_today", changes: { estimatedMinutes: 45 } })]));
  check("add_task minutes use the same rule (integer only)", bad([add({ estimatedMinutes: 12.5 })]) && ok([add({ estimatedMinutes: 30 })]));
  check("title must be a non-empty string", bad([add({ title: 42 })]) && bad([add({ title: "   " })]));
  check("title max 200 chars", bad([add({ title: "x".repeat(201) })]) && ok([add({ title: "x".repeat(200) })]));
  check("notes must be a string, max 2000", bad([add({ notes: 5 })]) && bad([add({ notes: "n".repeat(2001) })]) && ok([add({ notes: "n".repeat(2000) })]));
  check("update_task changes.title / changes.notes are checked",
    bad([r({ op: "update_task", taskId: "t_today", changes: { title: "" } })]) &&
    bad([r({ op: "update_task", taskId: "t_today", changes: { notes: "n".repeat(2001) } })]));
  check("add_category displayName type and length (80)",
    bad([r({ op: "add_category", key: "abc", displayName: 7 })]) && bad([r({ op: "add_category", key: "abc", displayName: "d".repeat(81) })]) &&
    ok([r({ op: "add_category", key: "abc", displayName: "Fine" })]));
  check("add_project name max 80, subtasks strings",
    bad([r({ op: "add_project", name: "n".repeat(81), targetDate: "2026-11-01" })]) &&
    bad([r({ op: "add_project", name: "P", targetDate: "2026-11-01", subtasks: ["ok", 3] })]) &&
    bad([r({ op: "add_project", name: "P", targetDate: "2026-11-01", subtasks: "not an array" })]));
  check("Dates before the plan start are rejected", bad([add({ date: "2026-05-01" })]));
  check("Dates after the plan end are rejected", bad([add({ date: "2027-02-01" })]));
  check("Plan edges are accepted", ok([add({ date: "2026-12-31" })]) && ok([add({ date: "2026-06-13" })]));
  check("Window applies to move_task.newDate, changes.date and recurring ranges",
    bad([r({ op: "move_task", taskId: "t_today", newDate: "2027-01-01" })]) &&
    bad([r({ op: "update_task", taskId: "t_today", changes: { date: "2027-01-01" } })]) &&
    bad([r({ op: "add_recurring_task", title: "R", category: "custom", startDate: "2026-12-20", endDate: "2027-01-10", recurrence: { type: "daily" } })]));
  check("Duplicate add_category keys in one batch are rejected",
    bad([r({ op: "add_category", key: "dup", displayName: "A" }), r({ op: "add_category", key: "dup", displayName: "B" })]));
  const risky = ops.findRiskyOperations([
    r({ op: "delete_recurring_series", seriesId: "s", scope: "all" }),
    r({ op: "update_task", taskId: "t_today", changes: { date: "2026-10-01" } }),
    r({ op: "update_task", taskId: "t_today", changes: { date: "2026-10-20" } })
  ], { ...ctx, completedTaskIds: new Set(), taskDates: new Map() });
  check("delete_recurring_series is flagged", risky.some(x => x.op.op === "delete_recurring_series"));
  check("update_task moving into the past is flagged, moving forward is not",
    risky.some(x => x.index === 1) && !risky.some(x => x.index === 2));
}

console.log("\nAPI client");
{
  const api = await import("./js/chatbot/api.js?v=20260927c");
  const store = {};
  globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const realFetch = globalThis.fetch, realTimeout = globalThis.setTimeout;
  const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
  const msg = (text, stop, out = 5) => ({ content: [{ type: "text", text }], stop_reason: stop, usage: { input_tokens: 10, output_tokens: out }, model: "m" });

  check("Haiku id is claude-haiku-4-5", api.MODELS.some(m => m.id === "claude-haiku-4-5") && !api.MODELS.some(m => /haiku-4-5-2025/.test(m.id)));
  check("https proxy URLs are accepted", api.validateProxyUrl("https://x.workers.dev") === null);
  check("http is only accepted for localhost", api.validateProxyUrl("http://localhost:8787") === null && api.validateProxyUrl("http://127.0.0.1:8787") === null &&
    !!api.validateProxyUrl("http://evil.example.com") && !!api.validateProxyUrl("ftp://x.com") && !!api.validateProxyUrl("not a url") && !!api.validateProxyUrl("javascript:alert(1)"));

  // truncation retry: doubles max_tokens once, sums usage, flags a second truncation
  api.saveSettings({ mode: "direct", model: "claude-sonnet-5", maxTokens: 2048 }); api.setApiKey("sk-test");
  const seen = [];
  globalThis.fetch = async (url, init) => { const b = JSON.parse(init.body); seen.push(b.max_tokens); return ok(msg("part", seen.length === 1 ? "max_tokens" : "end_turn", 7)); };
  let res = await api.callModel({ system: "s", messages: [] });
  check("max_tokens response is retried once with double max_tokens", JSON.stringify(seen) === "[2048,4096]" && res.truncated === false);
  check("Usage from both attempts is summed", res.usage.output_tokens === 14 && res.usage.input_tokens === 20);
  seen.length = 0;
  globalThis.fetch = async (url, init) => { seen.push(JSON.parse(init.body).max_tokens); return ok(msg("part", "max_tokens")); };
  res = await api.callModel({ system: "s", messages: [] });
  check("Still truncated after the retry: returned once, flagged truncated", seen.length === 2 && res.truncated === true);
  seen.length = 0; api.saveSettings({ maxTokens: 6000 });
  res = await api.callModel({ system: "s", messages: [] });
  check("Doubling is capped at 8192", JSON.stringify(seen) === "[6000,8192]");
  seen.length = 0; api.saveSettings({ maxTokens: 8192 });
  res = await api.callModel({ system: "s", messages: [] });
  check("No retry when already at 8192", seen.length === 1 && res.truncated === true);

  // Retry-After capped at 30 s
  api.saveSettings({ maxTokens: 2048 });
  const waits = [];
  globalThis.setTimeout = (fn, ms) => { waits.push(ms); return realTimeout(fn, 0); };
  let n = 0;
  globalThis.fetch = async () => (++n === 1 ? new Response("{}", { status: 429, headers: { "retry-after": "3600" } }) : ok(msg("x", "end_turn")));
  await api.callModel({ system: "s", messages: [] });
  globalThis.setTimeout = realTimeout;
  check("Retry-After is capped at 30 seconds", waits.includes(30000) && !waits.some(w => w > 30000), JSON.stringify(waits));

  // proxy: URL check, 401 vs 403
  api.saveSettings({ mode: "proxy", proxyUrl: "http://evil.example.com" });
  api.registerIdTokenGetter(async () => "tok");
  let e1 = null; try { await api.callModel({ system: "s", messages: [] }); } catch (e) { e1 = e; }
  check("A non-https proxy URL is refused before any request", e1 && /Proxy URL rejected/.test(e1.message));
  api.saveSettings({ proxyUrl: "https://proxy.example.com" });
  const status = async (code) => { globalThis.fetch = async () => new Response('{"error":"x"}', { status: code }); try { await api.callModel({ system: "s", messages: [] }); } catch (e) { return e; } };
  const e401 = await status(401), e403 = await status(403);
  check("Proxy 401 = sign-in expired, kind auth", e401.kind === "auth" && /sign-in/i.test(e401.message));
  check("Proxy 403 = origin/email not allowed, kind forbidden", e403.kind === "forbidden" && /allowlist/i.test(e403.message));
  globalThis.fetch = realFetch;
}

console.log("\nProxy Worker request handling");
{
  const worker = (await import("./proxy/worker.js")).default;
  const wmod = await import("./proxy/worker.js");
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = (kid) => ({ ...(await_exportPub), kid, alg: "RS256", use: "sig" });
  const await_exportPub = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claims = (o = {}) => ({ iss: "https://securetoken.google.com/proj", aud: "proj", sub: "u1", iat: now - 5, auth_time: now - 50, exp: now + 3600, email: "me@example.com", email_verified: true, ...o });
  const sign = async (c, kid = "w1") => {
    const h = b64u(new TextEncoder().encode(JSON.stringify({ alg: "RS256", kid })));
    const b = b64u(new TextEncoder().encode(JSON.stringify(c)));
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(`${h}.${b}`));
    return `${h}.${b}.${b64u(new Uint8Array(sig))}`;
  };
  let jwksKeys = [jwk("w1")], jwksFetches = 0, anthropicBody = null;
  const realFetch = globalThis.fetch, realNow = Date.now, realLog = console.log;
  // The Worker module caches signing keys from the earlier token test; move the
  // clock past its 30 s refetch interval so this section starts from a stale cache.
  Date.now = () => realNow() + 60 * 1000;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("securetoken")) { jwksFetches++; return new Response(JSON.stringify({ keys: jwksKeys })); }
    anthropicBody = JSON.parse(init.body); return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const env = { FIREBASE_PROJECT_ID: "proj", ALLOWED_EMAILS: "me@example.com", ALLOWED_ORIGINS: "https://site.example", ANTHROPIC_API_KEY: "sk" };
  const call = async (token, body, e = env, origin = "https://site.example") => worker.fetch(new Request("https://w.example/", {
    method: "POST", headers: { origin, "content-type": "application/json", authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify(body) }), e);
  const good = { model: "claude-sonnet-5", max_tokens: 100, messages: [{ role: "user", content: "hi" }] };
  const tok = await sign(claims());

  let logged = [];
  let res = await call(tok, good);
  if (res.status !== 200) console.log("  (debug) first call:", res.status, await res.text());
  check("Valid request is forwarded", res.status === 200 && anthropicBody && anthropicBody.model === "claude-sonnet-5");
  res = await call(tok, { ...good, model: "claude-opus-4-8" });
  check("Model outside the default allowlist -> 400", res.status === 400 && (await res.json()).error === "Model not allowed");
  res = await call(tok, { ...good, model: "claude-opus-4-8" }, { ...env, ALLOWED_MODELS: "claude-opus-4-8, claude-haiku-4-5" });
  check("ALLOWED_MODELS env var extends the allowlist", res.status === 200);
  res = await call(tok, { ...good, max_tokens: 100000 }); await res.text();
  check("max_tokens is clamped to 4096 (not reset to 2048)", anthropicBody.max_tokens === 4096);
  res = await call(tok, { ...good, max_tokens: 3000 }); await res.text();
  check("max_tokens under the limit is untouched", anthropicBody.max_tokens === 3000);
  res = await call(tok, { model: good.model, messages: good.messages });
  check("Missing max_tokens -> 400", res.status === 400);
  res = await call(await sign(claims({ email: "other@example.com" })), good);
  check("Verified but non-allowlisted email -> 403", res.status === 403);
  res = await call(await sign(claims({ email_verified: false })), good);
  check("email_verified must be true -> 401", res.status === 401);
  res = await call(tok, good, env, "https://evil.example");
  check("Disallowed origin -> 403", res.status === 403);
  const tampered = tok.split("."); tampered[1] = b64u(new TextEncoder().encode(JSON.stringify(claims({ email: "x@x.com" }))));
  logged = []; console.log = (...a) => logged.push(a.join(" "));
  res = await call(tampered.join("."), good); console.log = realLog;
  const body401 = await res.json();
  check("Bad signature -> 401 with a generic message", res.status === 401 && body401.error === "Invalid or expired sign-in token" && !/signature|crypto|verif/i.test(JSON.stringify(body401)));
  check("The detailed reason goes to the log only", logged.some(l => /signature verification failed/.test(l)));

  // Unknown kid: refetch the key set once, then accept if the new set has it
  const t2 = await sign(claims(), "w2");
  Date.now = () => realNow() + 120 * 1000;        // past the 30 s minimum refetch interval again
  jwksKeys = [jwk("w1"), jwk("w2")]; jwksFetches = 0;
  res = await call(t2, good);
  check("Unknown key id triggers one JWKS refetch, then succeeds", res.status === 200 && jwksFetches === 1, `fetches ${jwksFetches}`);
  jwksFetches = 0; Date.now = () => realNow() + 240 * 1000;
  res = await call(await sign(claims(), "nope"), good);
  check("Still unknown after the refetch -> 401 (one refetch only)", res.status === 401 && jwksFetches === 1, `fetches ${jwksFetches}`);
  Date.now = realNow; console.log = realLog; globalThis.fetch = realFetch;
  check("__internals only exposes what is tested",
    wmod.__internals.allowedModels({}).length === 3 && wmod.__internals.MAX_TOKENS_LIMIT === 4096 && wmod.__internals.MAX_BODY_BYTES === 131072 &&
    wmod.__internals.isOriginAllowed("https://a", { ALLOWED_ORIGINS: "https://a" }) === true && wmod.__internals.isOriginAllowed("https://b", { ALLOWED_ORIGINS: "https://a" }) === false);
}

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail) { console.log("\nFailures:"); failures.forEach(f => console.log(`  - ${f}`)); }
process.exit(fail ? 1 : 0);
