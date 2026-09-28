// ============================================================================
// ADAPTER - the ONLY file in js/chatbot/ that knows about this specific app.
//
// Everything else in the module talks to this file and nothing else. To drop
// the chatbot into a different tracker, rewrite this file and leave the rest.
//
// This app (app.js / plan-extension-2026.js) loads as classic scripts, so its
// top-level `let`/`const` bindings live in the global lexical environment. ES
// modules share that environment, so bare identifiers like `appState` resolve
// here. They are NOT on `window`, which is why we reference them directly and
// guard every access with typeof.
//
// APP-SPECIFIC SHAPE NOTES (see summary for what was assumed):
//   day  : { date, isIndia, maxCapacity, tasks[], rolledOver }
//   task : { id, category, title, duration /* HOURS */, completed, link,
//            fixed?, milestone?, subtasks?, projectId?, seriesId?,
//            completedAt?, completedOnDate?, status? }
//   The schema this module speaks uses estimatedMinutes; we convert at the edge.
// ============================================================================

import { expandRecurrence, isValidDateStr, addDays, projectIdFor, spreadDates } from "./operations.js?v=20260927c";

const CONTEXT_LOOKAHEAD_DAYS = 21;
const TASK_WINDOW_DAYS = 14;     // tasks today..+14 ship with every request
const MAX_LOOKUP_DAYS = 62;      // a single lookup covers at most ~2 months
const MAX_LOOKUP_TASKS = 400;

// --- Safe access to the host app's globals ---------------------------------
const host = {
  get state() { return typeof appState !== "undefined" ? appState : null; },
  get builtInCategories() { return typeof BUILT_IN_CATEGORIES !== "undefined" ? BUILT_IN_CATEGORIES : {}; },
  get track4() { return typeof TRACK_4_PROJECTS !== "undefined" ? TRACK_4_PROJECTS : []; },
  save() { if (typeof saveState === "function") saveState(); },
  allCategories() { return typeof getAllCategories === "function" ? getAllCategories() : {}; },
  today() {
    if (typeof getRealCurrentDate === "function") return getRealCurrentDate();
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
  capacityFor(dateStr) {
    if (typeof getBaseCapacityForDay === "function") {
      const max = (host.state?.settings?.maxNormalDailyHours) || 8;
      return getBaseCapacityForDay(dateStr, max);
    }
    return 8;
  },
  applyCategoryColors() { if (typeof applyCategoryColors === "function") applyCategoryColors(); }
};

export function isHostReady() {
  return !!(host.state && Array.isArray(host.state.days));
}

// --- Re-render the host app -------------------------------------------------
// We call the app's own render functions rather than touching its DOM. The
// chatbot never writes to the host's markup directly.
const RENDER_FNS = [
  "renderDashboardMetrics", "renderTodaySection", "renderProjectSelector",
  "renderCalendarDays", "renderTracksChecklists", "populateCategorySelects",
  "updateRiskBanner"
];

function rerenderHost() {
  for (const name of RENDER_FNS) {
    try {
      const fn = typeof globalThis[name] === "function" ? globalThis[name] : undefined;
      // These are classic-script function declarations, so they DO land on window.
      if (fn) fn();
    } catch (e) {
      console.warn(`[chatbot] host render "${name}" failed:`, e && e.message);
    }
  }
}

// --- Change notification ----------------------------------------------------
const changeListeners = new Set();
export function onStateChange(cb) {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}
function emitChange(detail) {
  changeListeners.forEach(cb => { try { cb(detail); } catch (e) { console.warn("[chatbot] listener failed", e); } });
}

// --- Duration conversion ----------------------------------------------------
const minutesToHours = (m) => Math.round((Number(m) / 60) * 100) / 100;
const hoursToMinutes = (h) => Math.round(Number(h || 0) * 60);

// --- ID generation ----------------------------------------------------------
// Namespaced with "_bot_" so chatbot ids can never collide with app.js ids
// (which use _ahf_, _leetcode_, _msoa_, …) or plan-extension ids (which use _x_).
let idCounter = 0;
function newTaskId(dateStr) {
  idCounter += 1;
  return `${dateStr}_bot_${Date.now().toString(36)}_${idCounter}`;
}
function newSeriesId(title) {
  const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24).replace(/^_|_$/g, "");
  return `series_${Date.now().toString(36)}_${slug || "task"}`;
}

// --- Reading state ----------------------------------------------------------
function ensureDay(dateStr) {
  const st = host.state;
  let day = st.days.find(d => d.date === dateStr);
  if (!day) {
    day = { date: dateStr, isIndia: false, maxCapacity: host.capacityFor(dateStr), tasks: [], rolledOver: false };
    st.days.push(day);
    st.days.sort((a, b) => a.date.localeCompare(b.date));
  }
  if (!Array.isArray(day.tasks)) day.tasks = [];
  return day;
}

export function getCategories() {
  const all = host.allCategories();
  return Object.entries(all)
    .filter(([, c]) => !c.archived)
    .map(([key, c]) => ({ key, displayName: c.name || key }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function allTasks() {
  const out = [];
  (host.state.days || []).forEach(day => {
    (day.tasks || []).forEach(t => out.push({ task: t, date: day.date }));
  });
  return out;
}

export function getRecurringSeries() {
  const byId = new Map();
  allTasks().forEach(({ task, date }) => {
    if (!task.seriesId) return;
    const s = byId.get(task.seriesId) || {
      seriesId: task.seriesId, title: task.title, category: task.category,
      recurrence: task.recurrence || null, startDate: date, endDate: date, count: 0
    };
    if (date < s.startDate) s.startDate = date;
    if (date > s.endDate) s.endDate = date;
    s.count += 1;
    byId.set(task.seriesId, s);
  });
  return [...byId.values()];
}

// The compact context sent to the model. Deliberately NOT the whole database:
// categories + series + a 21-day load summary + every task from today to
// +TASK_WINDOW_DAYS. Anything further out is fetched on request (lookupTasks).
export function getState(opts = {}) {
  const today = host.today();
  const days = host.state.days || [];
  const dates = days.map(d => d.date).sort();

  const upcomingLoad = [];
  for (let i = 0; i < CONTEXT_LOOKAHEAD_DAYS; i++) {
    const ds = addDays(today, i);
    const day = days.find(d => d.date === ds);
    if (!day) continue;
    upcomingLoad.push({
      date: ds,
      taskCount: day.tasks.length,
      totalEstimatedMinutes: day.tasks.reduce((s, t) => s + hoursToMinutes(t.duration), 0)
    });
  }

  const windowEnd = addDays(today, TASK_WINDOW_DAYS);
  const recent = (opts.recentlyDiscussedTaskIds || [])
    .map(id => { const t = findTaskById(id); return t ? { id: t.taskId, title: t.title, date: t.date } : null; })
    .filter(Boolean);

  return {
    today,
    categories: getCategories(),
    recurringSeries: getRecurringSeries().map(({ count, ...s }) => s),
    dateRangeInUse: { earliest: dates[0] || today, latest: dates[dates.length - 1] || today },
    upcomingLoad,
    taskWindow: { start: today, end: windowEnd },
    tasks: listTasks(today, windowEnd),
    recentlyDiscussed: recent,
    // Keyword matches from anywhere in the plan, so a named task outside the
    // window can still be referenced without a lookup round.
    matchedTasks: opts.matchedTasks || []
  };
}

// Compact rows for the model: id, date, title, category, minutes, completed, fixed.
export function listTasks(startDate, endDate) {
  return allTasks()
    .filter(({ task, date }) => date >= startDate && date <= endDate && isSurfaced(task))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ task, date }) => ({
      id: task.id,
      date,
      title: task.title,
      category: task.category,
      minutes: hoursToMinutes(task.duration),
      completed: !!task.completed,
      fixed: !!task.fixed
    }));
}

// Date-range lookup the model asks for with a need_info "lookup". Clamped so a
// careless request can't ship the whole year.
export function lookupTasks(startDate, endDate) {
  if (!isValidDateStr(startDate) || !isValidDateStr(endDate) || endDate < startDate) {
    return { error: "lookup needs startDate <= endDate, both YYYY-MM-DD" };
  }
  const clampedEnd = endDate > addDays(startDate, MAX_LOOKUP_DAYS - 1) ? addDays(startDate, MAX_LOOKUP_DAYS - 1) : endDate;
  let tasks = listTasks(startDate, clampedEnd);
  const truncated = tasks.length > MAX_LOOKUP_TASKS || clampedEnd !== endDate;
  tasks = tasks.slice(0, MAX_LOOKUP_TASKS);
  return { startDate, endDate: clampedEnd, truncated, tasks };
}

function isSurfaced(task) {
  return typeof isSurfacedTask === "function" ? isSurfacedTask(task) : true;
}

// Local text search so "move my Matt meeting" resolves without shipping the
// whole database to the model.
export function getTasksInRange(startDate, endDate) {
  return allTasks()
    .filter(({ date }) => (!startDate || date >= startDate) && (!endDate || date <= endDate))
    .map(({ task, date }) => toWireTask(task, date));
}

function toWireTask(t, date) {
  return {
    taskId: t.id,
    title: t.title,
    category: t.category,
    date,
    estimatedMinutes: hoursToMinutes(t.duration),
    completed: !!t.completed,
    milestone: !!t.milestone,
    seriesId: t.seriesId || null
  };
}

export function searchTasks(query, limit = 25) {
  const terms = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  if (!terms.length) return [];

  const scored = allTasks().map(({ task, date }) => {
    const hay = `${task.title} ${task.category}`.toLowerCase();
    let score = 0;
    terms.forEach(w => { if (hay.includes(w)) score += 1; });
    return { score, task, date };
  }).filter(x => x.score > 0);

  scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return scored.slice(0, limit).map(({ task, date }) => toWireTask(task, date));
}

const STOPWORDS = new Set([
  "the", "and", "for", "add", "task", "tasks", "move", "please", "can", "you",
  "with", "from", "that", "this", "next", "every", "each", "into", "onto", "all"
]);

// Lookups used by the preview renderer, so no other module needs to reach
// into the host's state shape.
export function findTaskById(taskId) {
  for (const { task, date } of allTasks()) {
    if (task.id === taskId) return toWireTask(task, date);
  }
  return null;
}

export function getSeriesTasks(seriesId, fromDate) {
  return allTasks()
    .filter(({ task, date }) => task.seriesId === seriesId && (!fromDate || date >= fromDate))
    .map(({ task, date }) => toWireTask(task, date));
}

// --- Validation context -----------------------------------------------------
export function buildValidationContext() {
  const taskIds = new Set();
  const completedTaskIds = new Set();
  const taskDates = new Map();
  allTasks().forEach(({ task, date }) => {
    taskIds.add(task.id);
    taskDates.set(task.id, date);
    if (task.completed) completedTaskIds.add(task.id);
  });
  return {
    categoryKeys: new Set(Object.keys(host.allCategories())),
    taskIds,
    completedTaskIds,
    taskDates,
    seriesIds: new Set(getRecurringSeries().map(s => s.seriesId)),
    projectIds: new Set(host.track4.map(p => p.id)),
    planStart: typeof START_DATE_STR !== "undefined" ? START_DATE_STR : null,
    planEnd: typeof END_DATE_STR !== "undefined" ? END_DATE_STR : null,
    today: host.today()
  };
}

// --- Undo log ---------------------------------------------------------------
// Operation-level undo. Each applied batch records the inverse of what it did:
//   created task   -> { kind: "remove",  taskId }
//   deleted task   -> { kind: "restore", date, index, task, note }
//   changed task   -> { kind: "patch",   taskId, date, before, after }
//   created note   -> carried on the entries above
//   added category -> { kind: "removeCategory", key }
//   added project  -> { kind: "removeProject", id }
// Undo applies the inverse only to what the batch touched, and for "patch" only
// to fields that still hold the value the batch set - so a manual edit made
// after the batch is never reverted. The log lives in appState (it syncs, and a
// stale local copy can't overwrite newer cloud data), capped at UNDO_MAX
// batches, and entries older than UNDO_MAX_AGE_MS are dropped.
const UNDO_MAX = 20;
const UNDO_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const PATCH_FIELDS = ["title", "category", "duration", "completed", "completedAt", "completedOnDate",
  "status", "subtasks", "originalDate", "rescheduleCount"];

// Reading never creates the log (that would count as a content change and
// trigger a sync write); pass create=true when about to push.
function undoLog(create = false) {
  const st = host.state;
  if (!Array.isArray(st.chatbotUndoLog)) {
    if (!create) return [];
    st.chatbotUndoLog = [];
  }
  const now = Date.now();
  const log = st.chatbotUndoLog;
  const fresh = log.filter(e => e && typeof e.at === "number" && now - e.at <= UNDO_MAX_AGE_MS).slice(-UNDO_MAX);
  if (fresh.length !== log.length) st.chatbotUndoLog = fresh;
  return st.chatbotUndoLog;
}

export function undoDepth() { return isHostReady() ? undoLog().length : 0; }
export function peekUndo() { const log = undoLog(); return log.length ? log[log.length - 1] : null; }

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const pickFields = (task) => {
  const out = {};
  PATCH_FIELDS.forEach(f => { out[f] = clone(task[f]); });
  return out;
};
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const touch = (task) => (typeof touchTask === "function" ? touchTask(task) : task);

function noteOf(taskId) {
  const notes = host.state.taskNotes || {};
  return notes[taskId] !== undefined ? clone(notes[taskId]) : undefined;
}
function setNote(taskId, note) {
  const st = host.state;
  st.taskNotes = st.taskNotes || {};
  if (note === undefined) delete st.taskNotes[taskId];
  else st.taskNotes[taskId] = note;
}

// Runs fn(); if it throws, puts back everything the chatbot can touch.
function withRollback(fn) {
  const st = host.state;
  const keys = ["days", "categories", "taskNotes", "chatbotProjects", "chatbotUndoLog"];
  const saved = JSON.stringify(keys.map(k => st[k]));
  const track4Len = host.track4.length;
  try {
    return fn();
  } catch (e) {
    JSON.parse(saved).forEach((v, i) => { if (v === undefined || v === null) delete st[keys[i]]; else st[keys[i]] = v; });
    host.track4.length = track4Len;
    throw e;
  }
}

// Undoes the most recent batch. The entry is removed only when the undo
// succeeds. Returns { ok, label, reverted, skipped, message? }.
export function undoLast() {
  if (!isHostReady()) return { ok: false, message: "The plan isn't loaded yet." };
  const log = undoLog();
  const entry = log[log.length - 1];
  if (!entry) return { ok: false, message: "Nothing left to undo." };

  let result;
  try {
    result = withRollback(() => applyInverse(entry.inverse || []));
  } catch (e) {
    return { ok: false, label: entry.label, message: e && e.message };
  }
  log.pop();
  host.save();
  host.applyCategoryColors();
  rerenderHost();
  emitChange({ type: "undo", changedDates: [...result.changedDates] });
  return { ok: true, label: entry.label, reverted: result.reverted, skipped: result.skipped, changedDates: result.changedDates };
}

function applyInverse(inverse) {
  const st = host.state;
  const changedDates = new Set();
  let reverted = 0;
  const skipped = [];
  const locate = (taskId) => {
    for (const day of st.days) {
      const idx = day.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) return { day, idx, task: day.tasks[idx] };
    }
    return null;
  };

  for (let i = inverse.length - 1; i >= 0; i--) {
    const inv = inverse[i];
    switch (inv.kind) {
      case "remove": {
        const found = locate(inv.taskId);
        if (!found) { reverted++; break; }                 // already gone
        if (found.task.completed) {                         // user finished it since
          skipped.push(`kept "${found.task.title}" because it's been marked complete since`);
          break;
        }
        found.day.tasks.splice(found.idx, 1);
        if (inv.noteCreated) setNote(inv.taskId, undefined);
        changedDates.add(found.day.date);
        reverted++;
        break;
      }
      case "restore": {
        if (locate(inv.task.id)) { skipped.push(`"${inv.task.title}" already exists`); break; }
        const day = ensureDay(inv.date);
        const task = touch(clone(inv.task));
        day.tasks.splice(Math.min(inv.index, day.tasks.length), 0, task);
        if (inv.note !== undefined && noteOf(inv.task.id) === undefined) setNote(inv.task.id, inv.note);
        changedDates.add(inv.date);
        reverted++;
        break;
      }
      case "patch": {
        const found = locate(inv.taskId);
        if (!found) { skipped.push(`a changed task no longer exists`); break; }
        const { task } = found;
        let any = false, conflict = false;
        PATCH_FIELDS.forEach(f => {
          if (sameValue(inv.before[f], inv.after[f])) return;       // batch didn't change it
          if (!sameValue(task[f], inv.after[f])) { conflict = true; return; } // edited since
          if (inv.before[f] === undefined) delete task[f]; else task[f] = clone(inv.before[f]);
          any = true;
        });
        // Move it back only if it's still where the batch put it.
        if (inv.date !== inv.afterDate) {
          if (found.day.date === inv.afterDate) {
            found.day.tasks.splice(found.idx, 1);
            ensureDay(inv.date).tasks.push(task);
            changedDates.add(inv.afterDate);
            changedDates.add(inv.date);
            any = true;
          } else conflict = true;
        }
        if (inv.noteChanged) {
          if (sameValue(noteOf(inv.taskId), inv.noteAfter)) { setNote(inv.taskId, inv.noteBefore); any = true; }
          else conflict = true;
        }
        if (conflict) skipped.push(`kept your later edits to "${task.title}"`);
        if (any) { touch(task); changedDates.add(found.day.date); reverted++; }
        break;
      }
      case "removeCategory": {
        const inUse = st.days.some(d => d.tasks.some(t => t.category === inv.key));
        if (inUse) { skipped.push(`kept category "${inv.key}" because tasks still use it`); break; }
        if (st.categories) delete st.categories[inv.key];
        reverted++;
        break;
      }
      case "removeProject": {
        st.chatbotProjects = (st.chatbotProjects || []).filter(p => p.id !== inv.id);
        const idx = host.track4.findIndex(p => p.id === inv.id);
        if (idx !== -1) host.track4.splice(idx, 1);
        reverted++;
        break;
      }
    }
  }
  return { changedDates, reverted, skipped };
}

// --- Applying operations ----------------------------------------------------
// The ONLY mutation path. Every op is turned into concrete state changes here,
// and its inverse is recorded for undo. All-or-nothing: if anything throws,
// state is rolled back and the error rethrown.
// Returns { changedDates: Set, created: [...], removed: [...], touched: [...] }.
export function applyOperations(operations, meta = {}) {
  const result = withRollback(() => applyAll(operations));
  const log = undoLog(true);
  log.push({ at: Date.now(), label: meta.label || "Assistant change", message: meta.message || "", inverse: result.inverse });
  while (log.length > UNDO_MAX) log.shift();

  host.save();
  host.applyCategoryColors();
  rerenderHost();
  emitChange({ type: "apply", changedDates: [...result.changedDates] });
  return result;
}

function applyAll(operations) {
  const st = host.state;
  const changedDates = new Set();
  const created = [];
  const removed = [];
  const touched = [];
  const inverse = [];

  const findTask = (taskId) => {
    for (const day of st.days) {
      const idx = day.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) return { day, idx, task: day.tasks[idx] };
    }
    return null;
  };

  const addNew = (dateStr, task, notes) => {
    const day = ensureDay(dateStr);
    day.tasks.push(touch(task));
    const hadNote = noteOf(task.id) !== undefined;
    if (notes) writeNote(task.id, notes);
    inverse.push({ kind: "remove", taskId: task.id, noteCreated: !!notes && !hadNote });
    created.push({ date: dateStr, task });
    changedDates.add(dateStr);
  };

  // Records a patch inverse around a mutation of an existing task.
  const patch = (found, mutate) => {
    const before = pickFields(found.task);
    const beforeDate = found.day.date;
    const noteBefore = noteOf(found.task.id);
    const afterDate = mutate() || beforeDate;
    const noteAfter = noteOf(found.task.id);
    inverse.push({
      kind: "patch", taskId: found.task.id, date: beforeDate, afterDate,
      before, after: pickFields(found.task),
      noteChanged: !sameValue(noteBefore, noteAfter), noteBefore, noteAfter
    });
    touched.push(found.task.id);
    changedDates.add(beforeDate);
    changedDates.add(afterDate);
  };

  for (const op of operations) {
    switch (op.op) {
      case "add_task":
      case "add_milestone": {
        const task = {
          id: newTaskId(op.date),
          category: op.category,
          title: op.title,
          duration: op.estimatedMinutes ? minutesToHours(op.estimatedMinutes) : (op.op === "add_milestone" ? 0.5 : 1),
          completed: false,
          link: null,
          createdByChatbot: true,
          source: "user"
        };
        if (op.op === "add_milestone") { task.milestone = true; task.fixed = true; }
        addNew(op.date, task, op.notes);
        break;
      }

      case "add_recurring_task": {
        const { dates } = expandRecurrence(op);
        const seriesId = newSeriesId(op.title);
        dates.forEach(ds => addNew(ds, {
          id: newTaskId(ds),
          category: op.category,
          title: op.title,
          duration: op.estimatedMinutes ? minutesToHours(op.estimatedMinutes) : 1,
          completed: false,
          link: null,
          seriesId,
          recurrence: op.recurrence,
          createdByChatbot: true,
          source: "user"
        }, op.notes));
        break;
      }

      case "update_task": {
        const found = findTask(op.taskId);
        if (!found) break;
        const c = op.changes || {};
        patch(found, () => {
          const { task } = found;
          touch(task);
          if (c.title !== undefined) task.title = c.title;
          if (c.category !== undefined) task.category = c.category;
          if (c.estimatedMinutes !== undefined) task.duration = minutesToHours(c.estimatedMinutes);
          if (c.notes !== undefined) writeNote(task.id, c.notes);
          if (c.date !== undefined && c.date !== found.day.date) return moveTaskTo(found, c.date);
          return found.day.date;
        });
        break;
      }

      case "move_task": {
        const found = findTask(op.taskId);
        if (!found) break;
        patch(found, () => moveTaskTo(found, op.newDate));
        break;
      }

      case "delete_task": {
        const found = findTask(op.taskId);
        if (!found) break;
        inverse.push({ kind: "restore", date: found.day.date, index: found.idx, task: clone(found.task), note: noteOf(found.task.id) });
        found.day.tasks.splice(found.idx, 1);
        removed.push({ date: found.day.date, task: found.task });
        changedDates.add(found.day.date);
        break;
      }

      case "delete_recurring_series": {
        const from = op.scope === "future_only" ? (op.fromDate || host.today()) : null;
        st.days.forEach(day => {
          if (from && day.date < from) return;
          const keep = [];
          day.tasks.forEach((t, i) => {
            if (t.seriesId === op.seriesId) {
              inverse.push({ kind: "restore", date: day.date, index: i, task: clone(t), note: noteOf(t.id) });
              removed.push({ date: day.date, task: t });
              changedDates.add(day.date);
            } else keep.push(t);
          });
          day.tasks = keep;
        });
        break;
      }

      case "set_completion": {
        const found = findTask(op.taskId);
        if (!found) break;
        patch(found, () => {
          const { task, day } = found;
          task.completed = !!op.completed;
          touch(task);
          if (task.completed) {
            task.completedAt = new Date().toISOString();
            task.completedOnDate = day.date;
            task.status = "done";
          } else {
            delete task.completedAt;
            delete task.completedOnDate;
            delete task.status;
          }
          if (Array.isArray(task.subtasks)) task.subtasks.forEach(s => { s.completed = task.completed; });
          return day.date;
        });
        break;
      }

      case "add_category": {
        st.categories = st.categories || {};
        st.categories[op.key] = {
          id: op.key,
          name: op.displayName,
          icon: "✨",
          color: op.color || "#c5b3fa",
          weeklyTarget: 0,
          priority: 50,
          order: 50,
          exportEnabled: true,
          active: true,
          archived: false,
          createdByChatbot: true
        };
        injectCategoryStyle(op.key, op.color || "#c5b3fa");
        inverse.push({ kind: "removeCategory", key: op.key });
        break;
      }

      case "add_project": {
        // One task per subtask (or one for the project itself), tagged with
        // projectId and spread from tomorrow to the target date, so the dated
        // project card's progress (datedProjectProgress) counts real work.
        const id = projectIdFor(op.name);
        const names = Array.isArray(op.subtasks) && op.subtasks.length ? op.subtasks : [op.name];
        const start = addDays(host.today(), 1) <= op.targetDate ? addDays(host.today(), 1) : op.targetDate;
        const dates = spreadDates(start, op.targetDate, names.length);
        const project = {
          id,
          name: op.name,
          desc: `Added via the assistant. Target ${op.targetDate}.`,
          totalHours: names.length * 2,
          dueDate: op.targetDate,
          dated: true,
          createdByChatbot: true,
          tasks: names.map(s => ({ name: s, duration: 2 }))
        };
        host.track4.push(project);
        // Persist so it survives a reload (TRACK_4_PROJECTS itself is source code).
        st.chatbotProjects = st.chatbotProjects || [];
        st.chatbotProjects.push(project);
        inverse.push({ kind: "removeProject", id });
        names.forEach((name, i) => addNew(dates[i], {
          id: newTaskId(dates[i]),
          category: "projects",
          title: names.length === 1 && name === op.name ? op.name : `${op.name}: ${name}`,
          duration: 2,
          completed: false,
          link: null,
          projectId: id,
          createdByChatbot: true,
          source: "user"
        }));
        break;
      }
    }
  }

  return { changedDates, created, removed, touched, inverse };
}

// Moves a located task to newDate; returns the new date.
function moveTaskTo(found, newDate) {
  const { day, idx, task } = found;
  day.tasks.splice(idx, 1);
  const target = ensureDay(newDate);
  task.originalDate = task.originalDate || day.date;
  task.rescheduleCount = (task.rescheduleCount || 0) + 1;
  touch(task);
  target.tasks.push(task);
  return newDate;
}

function writeNote(taskId, text) {
  if (typeof saveTaskNote === "function" && typeof getTaskNotes === "function") {
    const existing = getTaskNotes(taskId);
    saveTaskNote(taskId, { ...existing, text: text });
  }
}

// --- Host DOM integration (adapter-only, by design) -------------------------
// Injects a background rule for chatbot-created categories so their calendar
// blocks are coloured like the built-in ones.
function injectCategoryStyle(key, color) {
  const id = "chatbot-cat-styles";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  const rule = `.day-task-block.cat-${key}{background:var(--cat-${key},${color});}` +
               `.legend-dot.dot-${key},.cat-dot-${key}{background:var(--cat-${key},${color});box-shadow:0 0 6px var(--cat-${key},${color});}`;
  if (!el.textContent.includes(`.cat-${key}{`)) el.textContent += rule;
}

// Restores chatbot-created projects and category styles after a reload, since
// TRACK_4_PROJECTS is source code and does not persist on its own.
export function rehydrate() {
  if (!isHostReady()) return;
  const st = host.state;
  (st.chatbotProjects || []).forEach(p => {
    if (!host.track4.some(x => x.id === p.id)) host.track4.push(p);
  });
  Object.entries(st.categories || {}).forEach(([key, c]) => {
    if (c.createdByChatbot) injectCategoryStyle(key, c.color);
  });
}

// Briefly highlights days a batch touched.
export function highlightDays(dates) {
  if (!dates || !dates.length) return;
  requestAnimationFrame(() => {
    const cells = document.querySelectorAll("#calendar-days-grid .day-cell");
    const wanted = new Set(dates.map(d => Number(d.split("-")[2])));
    const month = typeof activeMonth !== "undefined" ? activeMonth : null;
    const monthDates = new Set(dates.filter(d => !month || d.startsWith(month)).map(d => Number(d.split("-")[2])));
    cells.forEach(cell => {
      const numEl = cell.querySelector(".day-number");
      if (!numEl) return;
      const n = parseInt(numEl.textContent, 10);
      if (monthDates.has(n) && wanted.has(n)) {
        cell.classList.add("chatbot-day-changed");
        setTimeout(() => cell.classList.remove("chatbot-day-changed"), 2200);
      }
    });
  });
}

