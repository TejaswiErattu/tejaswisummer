// ============================================================================
// UNDO STACK + AUDIT LOG
//
// Snapshots are full copies of the persisted app state taken BEFORE a batch is
// applied, so Undo restores exactly. Kept in localStorage, capped so we do not
// grow without bound.
// ============================================================================

const UNDO_KEY = "chatbot_undo_stack_v1";
const AUDIT_KEY = "chatbot_history_v1";
const MAX_SNAPSHOTS = 20;
const MAX_AUDIT_ENTRIES = 200;

// localStorage has a hard quota; a snapshot of a full year of tasks is large,
// so we trim aggressively if a write fails rather than losing the whole stack.
function readStack() {
  try {
    const raw = localStorage.getItem(UNDO_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeStack(stack) {
  let s = stack.slice(-MAX_SNAPSHOTS);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify(s));
      return true;
    } catch {
      // Quota exceeded - drop the oldest half and retry.
      if (s.length <= 1) { try { localStorage.removeItem(UNDO_KEY); } catch {} return false; }
      s = s.slice(Math.ceil(s.length / 2));
    }
  }
  return false;
}

export function pushSnapshot(snapshot, meta) {
  const stack = readStack();
  stack.push({
    at: new Date().toISOString(),
    label: meta?.label || "Assistant change",
    message: meta?.message || "",
    snapshot
  });
  return writeStack(stack);
}

export function popSnapshot() {
  const stack = readStack();
  const entry = stack.pop();
  writeStack(stack);
  return entry || null;
}

export function peekSnapshot() {
  const stack = readStack();
  return stack.length ? stack[stack.length - 1] : null;
}

export function undoDepth() { return readStack().length; }

export function clearUndoStack() {
  try { localStorage.removeItem(UNDO_KEY); } catch {}
}

// --- Audit log --------------------------------------------------------------
// Every applied batch, with the original message and the exact operations, so
// there is always a record of what the assistant did.
export function logApplied({ message, operations, summary, model, cost }) {
  let list = readAudit();
  list.push({
    at: new Date().toISOString(),
    message,
    summary: summary || "",
    model: model || "",
    costUsd: typeof cost === "number" ? Number(cost.toFixed(6)) : null,
    operations
  });
  list = list.slice(-MAX_AUDIT_ENTRIES);
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(list)); } catch {}
  return list.length;
}

export function readAudit() {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function clearAudit() {
  try { localStorage.removeItem(AUDIT_KEY); } catch {}
}

export const AUDIT_STORAGE_KEY = AUDIT_KEY;
export const UNDO_STORAGE_KEY = UNDO_KEY;
