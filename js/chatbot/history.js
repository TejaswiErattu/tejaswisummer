// ============================================================================
// AUDIT LOG
//
// A local record of every applied batch (original message + exact operations).
// Undo lives elsewhere: it is an operation-level log stored inside appState
// (see undo* in adapter.js), so it syncs with the rest of the plan and a stale
// local copy can never overwrite newer cloud data.
// ============================================================================

const AUDIT_KEY = "chatbot_history_v1";
const MAX_AUDIT_ENTRIES = 200;

// The old full-snapshot undo stack. Nothing reads it any more; drop it so it
// stops eating the localStorage quota.
const LEGACY_UNDO_KEY = "chatbot_undo_stack_v1";
try { localStorage.removeItem(LEGACY_UNDO_KEY); } catch {}

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
