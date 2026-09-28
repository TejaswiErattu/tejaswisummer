// ============================================================================
// CHATBOT ENTRY POINT
//
// Owns the conversation loop: send -> model -> parse -> validate -> preview ->
// (user clicks Apply) -> apply (records its inverse for undo) -> toast with Undo.
//
// Nothing is ever applied straight from a model response.
// ============================================================================

import { ChatbotPanel } from "./panel.js?v=20260927c";
import * as adapter from "./adapter.js?v=20260927c";
import * as auth from "./auth.js?v=20260927c";
import * as history from "./history.js?v=20260927c";
import {
  callModel, ChatbotApiError, loadSettings, estimateCost, getModel, hasApiKey
} from "./api.js?v=20260927c";
import {
  buildSystemPrompt, buildContextMessage, JSON_RETRY_MESSAGE, buildValidationRetryMessage
} from "./prompt.js?v=20260927c";
import {
  validateBatch, findRiskyOperations, expandRecurrence, MAX_QUESTIONS, addDays, spreadDates
} from "./operations.js?v=20260927c";

const MAX_LOOKUP_ROUNDS = 2;

const state = {
  panel: null,
  conversation: [],          // [{role, content}] sent to the model
  lastUserMessage: "",
  needInfoRounds: 0,
  abort: null,               // AbortController for the request in flight
  awaitingAnswer: false,     // last turn asked the user a question
  lookupRounds: 0,
  session: { inputTokens: 0, outputTokens: 0, cost: 0 },
  recentlyDiscussedTaskIds: [],
  pendingBatch: null         // { operations, summary, risky }
};

// --- Boot -------------------------------------------------------------------
const BOOT_TIMEOUT_MS = 30000;
function boot(startedAt = Date.now()) {
  if (!adapter.isHostReady()) {
    // The host populates its state during its own DOMContentLoaded handler; if
    // we win the race, wait a tick and retry rather than mounting against nothing.
    if (Date.now() - startedAt > BOOT_TIMEOUT_MS) {
      console.warn("[chatbot] gave up waiting for the tracker's state after 30s; the assistant panel was not mounted.");
      return;
    }
    return setTimeout(() => boot(startedAt), 120);
  }

  // Host state is only real after auth + migration; rehydrate from that.
  if (window.__appStateLoaded) adapter.rehydrate();
  window.addEventListener("app:state-loaded", () => adapter.rehydrate());

  state.panel = new ChatbotPanel({
    onSend: handleSend,
    onAnswerChips: handleChipAnswers,
    onApply: handleApply,
    onCancel: () => { state.pendingBatch = null; },
    onUndo: handleUndo,
    onAbort: () => { if (state.abort) state.abort.abort(); },
    onSignOut: () => { auth.signOut(); }
  });

  state.panel.refreshFooter({ canUndo: adapter.undoDepth() > 0 });
  window.addEventListener("app:state-loaded", () => state.panel.refreshFooter({ canUndo: adapter.undoDepth() > 0 }));

  auth.setRejectionHandler((msg) => {
    state.panel.setLocked(true);
    state.panel.showAuthError(msg);
  });

  auth.onAuthChange((session) => {
    if (session) {
      state.panel.showAuthError("");
      state.panel.setLocked(false, session);
      if (state.panel.el.log.childElementCount === 0) greet();
    } else {
      state.panel.setLocked(true);
      auth.mountSignIn(state.panel.signinSlot);
    }
  });

  state.panel.setLocked(true);
  auth.mountSignIn(state.panel.signinSlot);

  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    window.__chatbot = debugApi(); // test hooks; see Part 10 verification
  }
}

function greet() {
  const p = state.panel;
  p.addBot(
    "Tell me what to change and I'll draft the edits. Nothing is applied until you review and click Apply.\n\n" +
    'Try: "add a pen testing task every Tuesday and Thursday for the next month"'
  );
  const cfg = loadSettings();
  if (cfg.mode === "direct" && !hasApiKey()) {
    p.addSystem("No API key set yet — open the ⚙ settings to add one.");
  }
}

// --- Conversation -----------------------------------------------------------
async function handleSend(text) {
  const p = state.panel;

  const check = auth.requireValidSession();
  if (!check.ok) {
    p.addError("Your sign-in expired.", "Sign in again to keep using the assistant.");
    return;
  }

  p.clearPreview();
  state.pendingBatch = null;
  p.addUser(text);

  // If the previous turn asked a question, this message is the answer:
  // continue that conversation instead of starting over.
  if (state.awaitingAnswer && state.conversation.length) {
    state.awaitingAnswer = false;
    await runTurn(text, { fresh: false });
    return;
  }

  state.lastUserMessage = text;
  state.needInfoRounds = 0;
  state.lookupRounds = 0;
  state.conversation = [];
  await runTurn(text, { fresh: true });
}

async function handleChipAnswers(text) {
  const p = state.panel;
  state.awaitingAnswer = false;
  p.addUser(text);
  await runTurn(text, { fresh: false });
}

// Busy-label updater passed to every callModel as onRetry.
function retryLabel(attempt, kind) {
  const label = kind === "rate_limit" ? `Rate limited — retrying (${attempt}/2)…`
    : kind === "truncated" ? "Reply was cut off — retrying with more room…"
    : kind === "network" ? `Connection problem — retrying (${attempt}/2)…`
    : `API busy — retrying (${attempt}/2)…`;
  state.panel.setBusy(true, label);
}

// Turns whatever the model sent as `questions` into a clean, capped array.
function asQuestions(q) {
  return Array.isArray(q) ? q.slice(0, MAX_QUESTIONS) : [];
}

// One request/response round, cancellable from the busy indicator's Cancel button.
async function runTurn(userText, opts) {
  state.abort = new AbortController();
  try {
    await runTurnInner(userText, opts);
  } finally {
    state.abort = null;
  }
}

async function runTurnInner(userText, { fresh }) {
  const p = state.panel;

  // Build context: tasks for today..+14 days, plus keyword matches from
  // anywhere in the plan. Further ranges come via a need_info "lookup".
  const matched = adapter.searchTasks(userText);
  const ctx = adapter.getState({
    recentlyDiscussedTaskIds: state.recentlyDiscussedTaskIds.slice(-10),
    matchedTasks: matched
  });

  const system = buildSystemPrompt(ctx);

  if (fresh) {
    state.conversation = [
      { role: "user", content: `${buildContextMessage(ctx)}\n\nREQUEST: ${userText}` }
    ];
  } else {
    state.conversation.push({ role: "user", content: userText });
  }

  p.setBusy(true, "Thinking…");
  let reply;
  try {
    reply = await callModel({
      system,
      messages: state.conversation,
      signal: state.abort.signal,
      onRetry: retryLabel
    });
  } catch (e) {
    p.setBusy(false);
    reportApiError(e);
    return;
  }

  trackUsage(reply);

  // --- parse, with one retry if the model didn't return clean JSON ---
  let parsed = parseModelJson(reply.text);
  if (!parsed) {
    p.setBusy(true, "Reply wasn't valid JSON — asking again…");
    state.conversation.push({ role: "assistant", content: reply.text });
    state.conversation.push({ role: "user", content: JSON_RETRY_MESSAGE });
    try {
      reply = await callModel({ system, messages: state.conversation, signal: state.abort.signal, onRetry: retryLabel });
      trackUsage(reply);
      parsed = parseModelJson(reply.text);
    } catch (e) {
      p.setBusy(false);
      reportApiError(e);
      return;
    }
    if (!parsed) {
      p.setBusy(false);
      p.addError(reply.truncated
        ? "The reply was cut off at the output limit, so it couldn't be read."
        : "The model didn't return usable JSON.", reply.text.slice(0, 600));
      return;
    }
  }
  if (reply.truncated) {
    p.addSystem("Note: the model's reply hit the output limit even after retrying with more room, so it may be incomplete. Try a smaller request.");
  }

  state.conversation.push({ role: "assistant", content: reply.text });
  p.setBusy(false);

  // --- lookup: the model asked for tasks in a date range ---
  if (parsed.status === "need_info" && parsed.lookup && !asQuestions(parsed.questions).length) {
    if (state.lookupRounds >= MAX_LOOKUP_ROUNDS) {
      p.addError("The assistant kept asking for more of the plan, so I stopped.", "Try naming the dates or tasks more specifically.");
      return;
    }
    state.lookupRounds += 1;
    const { startDate, endDate } = parsed.lookup;
    const found = adapter.lookupTasks(startDate, endDate);
    p.addSystem(found.error
      ? `Lookup failed: ${found.error}`
      : `Looked up ${found.tasks.length} task${found.tasks.length === 1 ? "" : "s"} from ${found.startDate} to ${found.endDate}.`);
    await runTurn(`LOOKUP RESULT (JSON)\n${JSON.stringify(found)}`, { fresh: false });
    return;
  }

  // --- need_info ---
  if (parsed.status === "need_info") {
    handleNeedInfo(parsed);
    return;
  }

  // --- ready ---
  if (parsed.status !== "ready" || !Array.isArray(parsed.operations)) {
    p.addError("The model returned an unrecognised response shape.",
      JSON.stringify(parsed).slice(0, 600));
    return;
  }

  await validateAndPreview(parsed, system);
}

// Every need_info answer from the model, wherever it arrives (first reply or
// after a validation retry), counts toward the same 2-round cap.
function handleNeedInfo(parsed) {
  const p = state.panel;
  state.awaitingAnswer = true;
  state.needInfoRounds += 1;
  const questions = asQuestions(parsed.questions);
  if (state.needInfoRounds >= 2 || questions.length === 0) {
    // Stop the chip loop: show what it understood and let the user answer in free text.
    p.addBot(parsed.partialUnderstanding ||
      "I still need a bit more detail. Could you rephrase with the specifics?");
    p.addSystem("Answer in the box below and I'll try again.");
    p.focusInput();
    return;
  }
  p.askQuestions(questions, parsed.partialUnderstanding);
}

async function validateAndPreview(parsed, system, isRetry = false) {
  const p = state.panel;
  const vctx = adapter.buildValidationContext();
  const result = validateBatch(parsed.operations, vctx);

  if (!result.ok) {
    if (!isRetry) {
      // Give the model exactly one chance to fix its own mistakes.
      p.setBusy(true, "Fixing invalid operations…");
      state.conversation.push({ role: "user", content: buildValidationRetryMessage(result.errors) });
      let reply;
      try {
        reply = await callModel({ system, messages: state.conversation, signal: state.abort.signal, onRetry: retryLabel });
      } catch (e) { p.setBusy(false); reportApiError(e); return; }
      trackUsage(reply);
      p.setBusy(false);
      const retryParsed = parseModelJson(reply.text);
      state.conversation.push({ role: "assistant", content: reply.text });
      if (retryParsed && retryParsed.status === "ready" && Array.isArray(retryParsed.operations)) {
        return validateAndPreview(retryParsed, system, true);
      }
      if (retryParsed && retryParsed.status === "need_info") {
        handleNeedInfo(retryParsed);
        return;
      }
    }
    state.awaitingAnswer = false;
    p.addError(
      `${result.errors.length} operation${result.errors.length === 1 ? "" : "s"} failed validation — nothing was applied.`,
      result.errors.map(e => `[${e.index}${e.op ? ` ${e.op}` : ""}] ${e.message}`).join("\n")
    );
    return;
  }

  const risky = findRiskyOperations(parsed.operations, vctx);
  const changes = describeChanges(parsed.operations, vctx);

  state.pendingBatch = { operations: parsed.operations, summary: parsed.summary, risky };
  p.showPreview({
    summary: parsed.summary,
    changes,
    risky,
    instanceCount: result.instanceCount
  });
}

// --- Turning operations into a human-readable diff ---------------------------
function describeChanges(operations, vctx) {
  const out = [];
  // Resolved through the adapter - this file never touches host state directly.
  const titleOf = (taskId) => {
    const t = adapter.findTaskById(taskId);
    return t ? { title: t.title, date: t.date } : { title: taskId, date: null };
  };

  operations.forEach(op => {
    switch (op.op) {
      case "add_task":
        out.push({ kind: "add", date: op.date, title: op.title,
          detail: `${op.category}${op.estimatedMinutes ? ` · ${op.estimatedMinutes} min` : ""}`, reason: op.reason });
        break;
      case "add_milestone":
        out.push({ kind: "add", date: op.date, title: `◆ ${op.title}`,
          detail: `${op.category} · milestone`, reason: op.reason });
        break;
      case "add_recurring_task": {
        const { dates } = expandRecurrence(op);
        dates.forEach(d => out.push({ kind: "add", date: d, title: op.title,
          detail: `${op.category}${op.estimatedMinutes ? ` · ${op.estimatedMinutes} min` : ""}`, reason: op.reason }));
        break;
      }
      case "update_task": {
        const info = titleOf(op.taskId);
        const bits = Object.entries(op.changes || {}).map(([k, v]) => `${k} → ${v}`).join(", ");
        out.push({ kind: "edit", date: op.changes?.date || info.date, title: info.title,
          detail: bits, reason: op.reason });
        break;
      }
      case "move_task": {
        const info = titleOf(op.taskId);
        out.push({ kind: "remove", date: info.date, title: info.title, detail: "moved away", reason: op.reason });
        out.push({ kind: "add", date: op.newDate, title: info.title, detail: "moved here", reason: op.reason });
        break;
      }
      case "delete_task": {
        const info = titleOf(op.taskId);
        out.push({ kind: "remove", date: info.date, title: info.title, detail: "deleted", reason: op.reason });
        break;
      }
      case "delete_recurring_series": {
        const from = op.scope === "future_only" ? (op.fromDate || vctx.today) : null;
        const members = adapter.getSeriesTasks(op.seriesId, from);
        members.forEach(t => out.push({
          kind: "remove", date: t.date, title: t.title, detail: "series removed", reason: op.reason
        }));
        if (members.length === 0) {
          out.push({ kind: "remove", date: null, title: op.seriesId, detail: "series removed", reason: op.reason });
        }
        break;
      }
      case "set_completion": {
        const info = titleOf(op.taskId);
        out.push({ kind: "edit", date: info.date, title: info.title,
          detail: op.completed ? "mark complete" : "mark NOT complete", reason: op.reason });
        break;
      }
      case "add_category":
        out.push({ kind: "add", date: null, title: `Category: ${op.displayName}`, detail: op.key, reason: op.reason });
        break;
      case "add_project": {
        const names = (op.subtasks && op.subtasks.length) ? op.subtasks : [op.name];
        const today = vctx.today;
        const start = addDays(today, 1) <= op.targetDate ? addDays(today, 1) : op.targetDate;
        const dates = spreadDates(start, op.targetDate, names.length);
        out.push({ kind: "add", date: op.targetDate, title: `Project: ${op.name}`,
          detail: `due · ${names.length} task(s)`, reason: op.reason });
        names.forEach((n, i) => out.push({ kind: "add", date: dates[i],
          title: names.length === 1 && n === op.name ? op.name : `${op.name}: ${n}`, detail: "projects · 2h", reason: op.reason }));
        break;
      }
    }
  });
  return out;
}

// --- Apply ------------------------------------------------------------------
function handleApply() {
  const p = state.panel;
  const batch = state.pendingBatch;
  if (!batch) return;

  // Re-validate immediately before mutating: state may have changed while the
  // preview sat on screen (the user could have edited a task in the drawer).
  const vctx = adapter.buildValidationContext();
  const recheck = validateBatch(batch.operations, vctx);
  if (!recheck.ok) {
    p.clearPreview();
    p.addError("The plan changed while this was pending, so nothing was applied.",
      recheck.errors.map(e => `[${e.index}] ${e.message}`).join("\n"));
    state.pendingBatch = null;
    return;
  }

  // applyOperations is all-or-nothing and records the batch's inverse for undo.
  let result;
  try {
    result = adapter.applyOperations(batch.operations, {
      label: batch.summary || "Assistant change",
      message: state.lastUserMessage
    });
  } catch (e) {
    p.addError("Applying failed, so the plan was rolled back.", e && e.message);
    state.pendingBatch = null;
    return;
  }

  history.logApplied({
    message: state.lastUserMessage,
    operations: batch.operations,
    summary: batch.summary,
    model: loadSettings().model,
    cost: state.session.cost
  });

  // Remember what we touched so "move that one" resolves next turn.
  state.recentlyDiscussedTaskIds.push(...result.created.map(c => c.task.id), ...result.touched);
  state.recentlyDiscussedTaskIds = state.recentlyDiscussedTaskIds.slice(-25);

  const changed = [...result.changedDates];
  adapter.highlightDays(changed);

  p.clearPreview();
  const n = result.created.length;
  const r = result.removed.length;
  p.addSystem(`Applied · ${n} added${r ? `, ${r} removed` : ""}${changed.length ? ` across ${changed.length} day${changed.length === 1 ? "" : "s"}` : ""}.`);
  p.refreshFooter({ canUndo: adapter.undoDepth() > 0 });

  p.toast(`Applied: ${batch.summary || "changes"}`, "Undo", () => handleUndo());

  state.pendingBatch = null;
}

// Reverts only what the last batch did. The log entry is removed by the
// adapter only after the undo succeeds, so a failed undo can be retried.
function handleUndo() {
  const p = state.panel;
  const res = adapter.undoLast();
  if (!res.ok) {
    p.addSystem(res.label ? `Undo failed — nothing was changed. ${res.message || ""}`.trim() : (res.message || "Nothing left to undo."));
  } else {
    adapter.highlightDays([...(res.changedDates || [])]);
    p.addSystem(`Undone: ${res.label}` + (res.skipped && res.skipped.length ? ` (${res.skipped.join("; ")})` : ""));
  }
  p.refreshFooter({ canUndo: adapter.undoDepth() > 0 });
}

// --- Helpers ----------------------------------------------------------------
function parseModelJson(text) {
  if (typeof text !== "string") return null;
  let t = text.trim();

  // Tolerate fenced output even though the prompt forbids it.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  try { return JSON.parse(t); } catch {}

  // Last resort: pull the outermost {...} span.
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)); } catch {}
  }
  return null;
}

function trackUsage(reply) {
  const cfg = loadSettings();
  const i = reply.usage?.input_tokens || 0;
  const o = reply.usage?.output_tokens || 0;
  state.session.inputTokens += i;
  state.session.outputTokens += o;
  state.session.cost += estimateCost(cfg.model, i, o);
  state.panel.refreshFooter({
    tokens: state.session.inputTokens + state.session.outputTokens,
    cost: state.session.cost,
    canUndo: adapter.undoDepth() > 0
  });
}

function reportApiError(e) {
  const p = state.panel;
  if (!(e instanceof ChatbotApiError)) {
    if (e && e.name === "AbortError") { p.addSystem("Cancelled. Nothing was changed."); return; }
    p.addError("Something went wrong.", e && e.message);
    return;
  }
  switch (e.kind) {
    case "no_key":
      p.addError(e.message, "Click the ⚙ gear at the top of this panel.");
      break;
    case "auth":
    case "forbidden":
      p.addError(e.message);
      break;
    case "rate_limit":
      p.addError("Rate limit reached.", e.message);
      break;
    case "overloaded":
      p.addError("The API is having trouble.", e.message);
      break;
    case "network":
      p.addError("Couldn't reach the API.", e.message);
      break;
    default:
      p.addError(e.message, e.detail);
  }
}

// --- Test hooks (used by the Part 10 verification harness) ------------------
function debugApi() {
  return {
    state,
    adapter,
    auth,
    history,
    panel: () => state.panel,
    parseModelJson,
    describeChanges,
    forceUnlock(session) {
      state.panel.setLocked(false, session || { name: "Test", email: "test@local" });
    }
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => boot());
} else {
  boot();
}
