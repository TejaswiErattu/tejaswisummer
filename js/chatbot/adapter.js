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

import { expandRecurrence, isValidDateStr, addDays } from "./operations.js?v=20260916a";

const STATE_KEY = "cyber_study_plan_state_2026"; // owned by app.js; we never rename it
const CONTEXT_LOOKAHEAD_DAYS = 21;

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

export function getTracks() {
  const tracks = [
    { key: "track1", title: "PortSwigger Web Academy", dateRangeLabel: "Complete (retired)" },
    { key: "track2", title: "AWS Certified AI Practitioner", dateRangeLabel: "Complete" },
    { key: "track3", title: "CompTIA Security+ SY0-701", dateRangeLabel: "Exam Sept 18, 2026" },
    { key: "track4", title: "cybersecurity_projects", dateRangeLabel: "Aug 22 - Oct 4" }
  ];
  const custom = (host.state.subsections) || {};
  Object.values(custom).forEach(s => {
    tracks.push({ key: s.key, title: s.title, dateRangeLabel: s.dateRangeLabel || "" });
  });
  return tracks;
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
// categories + tracks + series + a 21-day load summary stays well under ~4k tokens.
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

  return {
    today,
    categories: getCategories(),
    tracks: getTracks(),
    recurringSeries: getRecurringSeries().map(({ count, ...s }) => s),
    dateRangeInUse: { earliest: dates[0] || today, latest: dates[dates.length - 1] || today },
    upcomingLoad,
    recentlyDiscussedTaskIds: opts.recentlyDiscussedTaskIds || [],
    // Only populated when the user's message referenced something outside the
    // 21-day window; see searchTasks().
    matchedTasks: opts.matchedTasks || []
  };
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
    today: host.today()
  };
}

// --- Snapshot / restore -----------------------------------------------------
// A snapshot is a full deep copy of the persisted state, taken BEFORE any
// mutation, so Undo restores byte-for-byte.
export function snapshot() {
  const { rolloverUndoSnapshot, ...persistable } = host.state;
  return JSON.stringify(persistable);
}

export function restore(snap) {
  if (!snap) return false;
  let parsed;
  try { parsed = JSON.parse(snap); } catch { return false; }
  if (!parsed || !Array.isArray(parsed.days)) return false;

  // Mutate the existing object in place: app.js holds a module-level reference
  // to `appState`, so reassigning it here would not be seen by the host.
  const st = host.state;
  Object.keys(st).forEach(k => { if (!(k in parsed)) delete st[k]; });
  Object.assign(st, parsed);

  host.save();
  host.applyCategoryColors();
  rerenderHost();
  emitChange({ type: "restore" });
  return true;
}

// --- Applying operations ----------------------------------------------------
// The ONLY mutation path. Every op is turned into concrete state changes here.
// Returns { changedDates: Set, created: [...], removed: [...] }.
export function applyOperations(operations) {
  const st = host.state;
  const changedDates = new Set();
  const created = [];
  const removed = [];

  const findTask = (taskId) => {
    for (const day of st.days) {
      const idx = day.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) return { day, idx, task: day.tasks[idx] };
    }
    return null;
  };

  for (const op of operations) {
    switch (op.op) {
      case "add_task":
      case "add_milestone": {
        const day = ensureDay(op.date);
        const task = {
          id: newTaskId(op.date),
          category: op.category,
          title: op.title,
          duration: op.estimatedMinutes ? minutesToHours(op.estimatedMinutes) : (op.op === "add_milestone" ? 0.5 : 1),
          completed: false,
          link: null,
          createdByChatbot: true
        };
        if (op.op === "add_milestone") { task.milestone = true; task.fixed = true; }
        if (op.track) task.track = op.track;
        day.tasks.push(task);
        if (op.notes) writeNote(task.id, op.notes);
        created.push({ date: op.date, task });
        changedDates.add(op.date);
        break;
      }

      case "add_recurring_task": {
        const { dates } = expandRecurrence(op);
        const seriesId = newSeriesId(op.title);
        dates.forEach(ds => {
          const day = ensureDay(ds);
          const task = {
            id: newTaskId(ds),
            category: op.category,
            title: op.title,
            duration: op.estimatedMinutes ? minutesToHours(op.estimatedMinutes) : 1,
            completed: false,
            link: null,
            seriesId,
            recurrence: op.recurrence,
            createdByChatbot: true
          };
          if (op.track) task.track = op.track;
          day.tasks.push(task);
          if (op.notes) writeNote(task.id, op.notes);
          created.push({ date: ds, task });
          changedDates.add(ds);
        });
        break;
      }

      case "update_task": {
        const found = findTask(op.taskId);
        if (!found) break;
        const { task, day } = found;
        const c = op.changes || {};
        if (c.title !== undefined) task.title = c.title;
        if (c.category !== undefined) task.category = c.category;
        if (c.estimatedMinutes !== undefined) task.duration = minutesToHours(c.estimatedMinutes);
        if (c.track !== undefined) task.track = c.track;
        if (c.notes !== undefined) writeNote(task.id, c.notes);
        changedDates.add(day.date);
        if (c.date !== undefined && c.date !== day.date) {
          moveTaskTo(found, c.date, changedDates);
        }
        break;
      }

      case "move_task": {
        const found = findTask(op.taskId);
        if (!found) break;
        changedDates.add(found.day.date);
        moveTaskTo(found, op.newDate, changedDates);
        break;
      }

      case "delete_task": {
        const found = findTask(op.taskId);
        if (!found) break;
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
          day.tasks.forEach(t => {
            if (t.seriesId === op.seriesId) {
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
        const { task, day } = found;
        task.completed = !!op.completed;
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
        changedDates.add(day.date);
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
        break;
      }

      case "add_project": {
        const id = `bot_${String(op.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 28)}`;
        if (!host.track4.some(p => p.id === id)) {
          host.track4.push({
            id,
            name: op.name,
            desc: `Added via the assistant. Target ${op.targetDate}.`,
            totalHours: (op.subtasks || []).length * 2 || 4,
            dueDate: op.targetDate,
            dated: true,
            createdByChatbot: true,
            tasks: (op.subtasks || []).map(s => ({ name: s, duration: 2 }))
          });
          // Persist so it survives a reload (TRACK_4_PROJECTS itself is source code).
          st.chatbotProjects = st.chatbotProjects || [];
          st.chatbotProjects.push(host.track4[host.track4.length - 1]);
        }
        break;
      }

      case "add_subsection": {
        st.subsections = st.subsections || {};
        st.subsections[op.key] = {
          key: op.key,
          title: op.title,
          dateRangeLabel: op.dateRangeLabel || "",
          createdByChatbot: true
        };
        break;
      }
    }
  }

  host.save();
  host.applyCategoryColors();
  renderCustomSubsections();
  rerenderHost();
  emitChange({ type: "apply", changedDates: [...changedDates] });

  return { changedDates, created, removed };
}

function moveTaskTo(found, newDate, changedDates) {
  const { day, idx, task } = found;
  day.tasks.splice(idx, 1);
  const target = ensureDay(newDate);
  task.originalDate = task.originalDate || day.date;
  task.rescheduleCount = (task.rescheduleCount || 0) + 1;
  target.tasks.push(task);
  changedDates.add(newDate);
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

// Renders chatbot-created subsections into the host's tracks container.
// This is the one place the module writes host DOM, and it only ever appends
// its own cards - it never rewrites the host's existing markup.
function renderCustomSubsections() {
  const container = document.querySelector(".tracks-container");
  const subs = host.state.subsections;
  if (!container || !subs) return;

  Object.values(subs).forEach(s => {
    const domId = `chatbot-subsection-${s.key}`;
    if (document.getElementById(domId)) return;
    const card = document.createElement("div");
    card.className = "track-list-card";
    card.id = domId;
    card.innerHTML =
      `<h4>${escapeHtml(s.title)}` +
      (s.dateRangeLabel ? ` <span class="track-range-chip">${escapeHtml(s.dateRangeLabel)}</span>` : "") +
      `</h4><p>Created by the assistant.</p>` +
      `<div class="track-substats">0 / 0 Completed</div>` +
      `<div class="track-items-list"></div>`;
    container.appendChild(card);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Restores chatbot-created projects/subsections after a reload, since
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
  renderCustomSubsections();
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

export const STATE_STORAGE_KEY = STATE_KEY;
