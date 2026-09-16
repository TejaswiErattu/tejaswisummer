// ============================================================================
// CHATBOT ENTRY POINT
//
// Owns the conversation loop: send -> model -> parse -> validate -> preview ->
// (user clicks Apply) -> snapshot -> apply -> toast with Undo.
//
// Nothing is ever applied straight from a model response.
// ============================================================================

import { ChatbotPanel } from "./panel.js?v=20260916a";
import * as adapter from "./adapter.js?v=20260916a";
import * as auth from "./auth.js?v=20260916a";
import * as history from "./history.js?v=20260916a";
import {
  callModel, ChatbotApiError, loadSettings, estimateCost, getModel, hasApiKey
} from "./api.js?v=20260916a";
import {
  buildSystemPrompt, buildContextMessage, JSON_RETRY_MESSAGE, buildValidationRetryMessage
} from "./prompt.js?v=20260916a";
import {
  validateBatch, findRiskyOperations, expandRecurrence, MAX_QUESTIONS
} from "./operations.js?v=20260916a";

const state = {
  panel: null,
  conversation: [],          // [{role, content}] sent to the model
  lastUserMessage: "",
  needInfoRounds: 0,
  session: { inputTokens: 0, outputTokens: 0, cost: 0 },
  recentlyDiscussedTaskIds: [],
  pendingBatch: null         // { operations, summary, risky }
};

// --- Boot -------------------------------------------------------------------
function boot() {
  if (!adapter.isHostReady()) {
    // The host populates its state during its own DOMContentLoaded handler; if
    // we win the race, wait a tick and retry rather than mounting against nothing.
    return setTimeout(boot, 120);
  }

  adapter.rehydrate();

  state.panel = new ChatbotPanel({
    onSend: handleSend,
    onAnswerChips: handleChipAnswers,
    onApply: handleApply,
    onCancel: () => { state.pendingBatch = null; },
    onUndo: handleUndo,
    onSignOut: () => { auth.signOut(); }
  });

  state.panel.refreshFooter({ canUndo: history.undoDepth() > 0 });

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

  window.__chatbot = debugApi(); // test hooks; see Part 10 verification
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
  state.lastUserMessage = text;
  state.needInfoRounds = 0;
  state.conversation = [];

  await runTurn(text, { fresh: true });
}

async function handleChipAnswers(text) {
  const p = state.panel;
  p.addUser(text);
  await runTurn(text, { fresh: false });
}

async function runTurn(userText, { fresh }) {
  const p = state.panel;

  // Build context. If the message references something outside the 21-day
  // window, a local text search adds only the matching tasks.
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
      onRetry: (attempt, kind) => {
        p.setBusy(true, kind === "rate_limit"
          ? `Rate limited — retrying (${attempt}/2)…`
          : `API busy — retrying (${attempt}/2)…`);
      }
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
      reply = await callModel({ system, messages: state.conversation });
      trackUsage(reply);
      parsed = parseModelJson(reply.text);
    } catch (e) {
      p.setBusy(false);
      reportApiError(e);
      return;
    }
    if (!parsed) {
      p.setBusy(false);
      p.addError("The model didn't return usable JSON.", reply.text.slice(0, 600));
      return;
    }
  }

  state.conversation.push({ role: "assistant", content: reply.text });
  p.setBusy(false);

  // --- need_info ---
  if (parsed.status === "need_info") {
    state.needInfoRounds += 1;
    const questions = (parsed.questions || []).slice(0, MAX_QUESTIONS);
    if (state.needInfoRounds >= 2 || questions.length === 0) {
      // Second round of questions: stop the chip loop, show what it understood
      // and let the user answer in free text.
      p.addBot(parsed.partialUnderstanding ||
        "I still need a bit more detail. Could you rephrase with the specifics?");
      p.addSystem("Answer in the box below and I'll try again.");
      p.focusInput();
      return;
    }
    p.askQuestions(questions, parsed.partialUnderstanding);
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
        reply = await callModel({ system, messages: state.conversation });
      } catch (e) { p.setBusy(false); reportApiError(e); return; }
      trackUsage(reply);
      p.setBusy(false);
      const retryParsed = parseModelJson(reply.text);
      state.conversation.push({ role: "assistant", content: reply.text });
      if (retryParsed && retryParsed.status === "ready" && Array.isArray(retryParsed.operations)) {
        return validateAndPreview(retryParsed, system, true);
      }
      if (retryParsed && retryParsed.status === "need_info") {
        p.askQuestions((retryParsed.questions || []).slice(0, MAX_QUESTIONS), retryParsed.partialUnderstanding);
        return;
      }
    }
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
      case "add_project":
        out.push({ kind: "add", date: op.targetDate, title: `Project: ${op.name}`,
          detail: `${(op.subtasks || []).length} subtask(s)`, reason: op.reason });
        break;
      case "add_subsection":
        out.push({ kind: "add", date: null, title: `Section: ${op.title}`, detail: op.key, reason: op.reason });
        break;
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

  // Snapshot BEFORE mutating.
  const snap = adapter.snapshot();
  const stored = history.pushSnapshot(snap, {
    label: batch.summary || "Assistant change",
    message: state.lastUserMessage
  });

  let result;
  try {
    result = adapter.applyOperations(batch.operations);
  } catch (e) {
    // Roll straight back if anything threw mid-apply.
    adapter.restore(snap);
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
  state.recentlyDiscussedTaskIds.push(...result.created.map(c => c.task.id));
  state.recentlyDiscussedTaskIds = state.recentlyDiscussedTaskIds.slice(-25);

  const changed = [...result.changedDates];
  adapter.highlightDays(changed);

  p.clearPreview();
  const n = result.created.length;
  const r = result.removed.length;
  p.addSystem(`Applied · ${n} added${r ? `, ${r} removed` : ""}${changed.length ? ` across ${changed.length} day${changed.length === 1 ? "" : "s"}` : ""}.`);
  p.refreshFooter({ canUndo: history.undoDepth() > 0 });

  p.toast(
    `Applied: ${batch.summary || "changes"}`,
    stored ? "Undo" : null,
    () => handleUndo()
  );

  state.pendingBatch = null;
}

function handleUndo() {
  const p = state.panel;
  const entry = history.popSnapshot();
  if (!entry) {
    p.addSystem("Nothing left to undo.");
    p.refreshFooter({ canUndo: false });
    return;
  }
  const ok = adapter.restore(entry.snapshot);
  p.addSystem(ok
    ? `Undone: ${entry.label}`
    : "Undo failed — that snapshot couldn't be restored.");
  p.refreshFooter({ canUndo: history.undoDepth() > 0 });
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
    canUndo: history.undoDepth() > 0
  });
}

function reportApiError(e) {
  const p = state.panel;
  if (!(e instanceof ChatbotApiError)) {
    if (e && e.name === "AbortError") return;
    p.addError("Something went wrong.", e && e.message);
    return;
  }
  switch (e.kind) {
    case "no_key":
      p.addError(e.message, "Click the ⚙ gear at the top of this panel.");
      break;
    case "auth":
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
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
