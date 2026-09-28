// Sync core — pure functions shared by firebase-sync.js and saveState().
// No Firebase or DOM access here, so test-sync.js can exercise it directly.
//
// Cloud layout (schema 2):
//   users/{uid}                 { schema, meta, root, months, displayName, email, updatedAt }
//                                 root = JSON of every appState key except days,
//                                 taskNotes, meta and the transient undo snapshot
//   users/{uid}/months/{YYYY-MM} { days: JSON of that month's days, updatedAt }
//   users/{uid}/notes/main      { notes: JSON of appState.taskNotes, updatedAt }
//
// ── MERGE RULE ───────────────────────────────────────────────────────────────
// Each saved copy carries meta.updatedAt (ms, bumped only when content really
// changes) and each device remembers lastSyncedAt, the meta.updatedAt that it
// and the cloud last agreed on.
//   - Only the cloud changed since lastSyncedAt  → take the cloud copy.
//   - Only this device changed                   → keep local, push it.
//   - Both changed (or the cloud is the legacy
//     single-document format with no meta)       → merge:
//       * Tasks are matched by id across ALL days, so a task moved to another
//         day on one device is not duplicated. The version with the later
//         task.updatedAt wins and lands on the day it sits on in that version.
//         Ties: a completed version beats an uncompleted one, then the cloud.
//       * A deleted task leaves a tombstone (deletedTaskIds[id] = ms). A
//         tombstone newer than the surviving version's updatedAt removes it,
//         so a delete on one device isn't undone by the other's stale copy.
//       * Notes merge per task id by note.lastUpdated.
//       * Day-level fields and everything in root (settings, categories,
//         extracurriculars, ledger, …) come wholesale from the copy with the
//         newer meta.updatedAt.
// Timestamps come from device clocks, so a badly skewed clock can win a tie
// it shouldn't; within a normal few seconds of skew it doesn't matter.
(function (global) {
  "use strict";

  var SCHEMA = 2;
  var ARCHIVE_CAP = 200;
  var TOMBSTONE_CAP = 3000;
  var TOMBSTONE_MAX_AGE_MS = 180 * 24 * 3600 * 1000;
  var DEVICE_KEY = "cyber_device_id";
  var SPLIT_OUT = { days: 1, taskNotes: 1, meta: 1, rolloverUndoSnapshot: 1 };

  function getDeviceId(storage) {
    var id = null;
    try { id = storage.getItem(DEVICE_KEY); } catch (e) {}
    if (!id) {
      id = "d_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { storage.setItem(DEVICE_KEY, id); } catch (e) {}
    }
    return id;
  }

  function monthOf(dateStr) { return String(dateStr).slice(0, 7); }

  // appState → { meta, root, months: {YYYY-MM: json}, notes } (all strings but meta).
  function split(state) {
    var rest = {};
    Object.keys(state).forEach(function (k) { if (!SPLIT_OUT[k]) rest[k] = state[k]; });
    var byMonth = {};
    (state.days || []).forEach(function (d) {
      var m = monthOf(d.date);
      (byMonth[m] = byMonth[m] || []).push(d);
    });
    var months = {};
    Object.keys(byMonth).sort().forEach(function (m) { months[m] = JSON.stringify(byMonth[m]); });
    return {
      meta: state.meta ? { updatedAt: state.meta.updatedAt || 0, deviceId: state.meta.deviceId || null } : null,
      root: JSON.stringify(rest),
      months: months,
      notes: JSON.stringify(state.taskNotes || {})
    };
  }

  function join(pieces) {
    var state = JSON.parse(pieces.root || "{}");
    var days = [];
    Object.keys(pieces.months || {}).sort().forEach(function (m) {
      days = days.concat(JSON.parse(pieces.months[m]));
    });
    days.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    state.days = days;
    state.taskNotes = pieces.notes ? JSON.parse(pieces.notes) : {};
    if (pieces.meta) state.meta = { updatedAt: pieces.meta.updatedAt || 0, deviceId: pieces.meta.deviceId || null };
    return state;
  }

  // True when the content (not meta) of two split() results differs.
  function contentDiffers(a, b) {
    if (!a || !b) return true;
    if (a.root !== b.root || a.notes !== b.notes) return true;
    var ka = Object.keys(a.months), kb = Object.keys(b.months);
    if (ka.length !== kb.length) return true;
    return ka.some(function (m) { return a.months[m] !== b.months[m]; });
  }

  function fingerprint(task) {
    var copy = {};
    Object.keys(task).forEach(function (k) { if (k !== "updatedAt") copy[k] = task[k]; });
    return JSON.stringify(copy);
  }

  function fingerprintTasks(state) {
    var map = {};
    (state.days || []).forEach(function (d) {
      (d.tasks || []).forEach(function (t) { if (t && t.id != null) map[t.id] = d.date + "|" + fingerprint(t); });
    });
    return map;
  }

  function trimTombstones(tombs, now) {
    var entries = Object.keys(tombs)
      .map(function (id) { return [id, tombs[id]]; })
      .filter(function (e) { return now - e[1] <= TOMBSTONE_MAX_AGE_MS; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, TOMBSTONE_CAP);
    var out = {};
    entries.forEach(function (e) { out[e[0]] = e[1]; });
    return out;
  }

  // Safety net behind touchTask(): any task whose content (or day) changed
  // since the last save without its updatedAt moving gets stamped `now`, and
  // ids that disappeared get a tombstone. Returns the new fingerprint map.
  function stampTaskChanges(state, prev, now) {
    var next = fingerprintTasks(state);
    var tombs = state.deletedTaskIds || {};
    (state.days || []).forEach(function (d) {
      (d.tasks || []).forEach(function (t) {
        if (!t || t.id == null) return;
        if (prev && prev[t.id] !== next[t.id]) {
          var prevStamp = prev.__stamps && prev.__stamps[t.id];
          if (!t.updatedAt || t.updatedAt === prevStamp) t.updatedAt = now;
        }
        if (tombs[t.id]) delete tombs[t.id];
      });
    });
    if (prev) {
      Object.keys(prev).forEach(function (id) {
        if (id !== "__stamps" && !(id in next)) tombs[id] = now;
      });
    }
    state.deletedTaskIds = trimTombstones(tombs, now);
    next.__stamps = stampsOf(state);
    return next;
  }

  function stampsOf(state) {
    var s = {};
    (state.days || []).forEach(function (d) {
      (d.tasks || []).forEach(function (t) { if (t && t.id != null) s[t.id] = t.updatedAt || 0; });
    });
    return s;
  }

  function withStamps(map, state) { map.__stamps = stampsOf(state); return map; }

  function capArchive(state) {
    if (Array.isArray(state.archivedTasks) && state.archivedTasks.length > ARCHIVE_CAP) {
      state.archivedTasks = state.archivedTasks.slice(-ARCHIVE_CAP);
    }
  }

  // "cloud" | "local" | "merge"
  function decide(local, cloud, lastSyncedAt, cloudIsLegacy) {
    var cloudTasks = (cloud && cloud.days || []).reduce(function (n, d) { return n + (d.tasks || []).length; }, 0);
    if (!cloud || cloudTasks === 0) return "local";
    if (cloudIsLegacy) return "merge";
    var localTs = local && local.meta ? local.meta.updatedAt || 0 : 0;
    var cloudTs = cloud.meta ? cloud.meta.updatedAt || 0 : 0;
    var localChanged = localTs > (lastSyncedAt || 0);
    var cloudChanged = cloudTs > (lastSyncedAt || 0);
    if (localChanged && cloudChanged) return "merge";
    if (localChanged) return "local";
    return "cloud";
  }

  function pickTask(a, b) {
    // a = local, b = cloud
    var ta = a.task.updatedAt || 0, tb = b.task.updatedAt || 0;
    if (ta !== tb) return ta > tb ? a : b;
    if (!!a.task.completed !== !!b.task.completed) return a.task.completed ? a : b;
    return b;
  }

  function merge(local, cloud, now, deviceId) {
    var localTs = local.meta ? local.meta.updatedAt || 0 : 0;
    var cloudTs = cloud.meta ? cloud.meta.updatedAt || 0 : 0;
    var newer = localTs > cloudTs ? local : cloud;
    var older = newer === local ? cloud : local;

    var out = JSON.parse(JSON.stringify(newer));
    delete out.rolloverUndoSnapshot;

    // Tombstones: union, keep the latest time per id.
    var tombs = {};
    [local.deletedTaskIds || {}, cloud.deletedTaskIds || {}].forEach(function (src) {
      Object.keys(src).forEach(function (id) { if (!tombs[id] || src[id] > tombs[id]) tombs[id] = src[id]; });
    });

    // Task winners across all days.
    var index = function (state) {
      var m = {};
      (state.days || []).forEach(function (d) {
        (d.tasks || []).forEach(function (t, i) { if (t && t.id != null) m[t.id] = { task: t, date: d.date, order: i }; });
      });
      return m;
    };
    var li = index(local), ci = index(cloud);
    var winners = {};
    Object.keys(li).concat(Object.keys(ci)).forEach(function (id) {
      if (winners[id] !== undefined) return;
      var w = li[id] && ci[id] ? pickTask(li[id], ci[id]) : (li[id] || ci[id]);
      if (tombs[id] && tombs[id] >= (w.task.updatedAt || 0)) { winners[id] = null; return; }
      if (tombs[id]) delete tombs[id];
      winners[id] = w;
    });

    // Days: newer copy's day objects, plus any day only the older copy has.
    var dayMap = {};
    (out.days || []).forEach(function (d) { dayMap[d.date] = d; d.tasks = []; });
    (older.days || []).forEach(function (d) {
      if (!dayMap[d.date]) {
        var copy = JSON.parse(JSON.stringify(d));
        copy.tasks = [];
        dayMap[d.date] = copy;
      }
    });

    // Place each winner on its own day, keeping the newer copy's task order
    // first, then the older copy's.
    var placeOnOwnDay = function (state) {
      (state.days || []).forEach(function (d) {
        (d.tasks || []).forEach(function (t) {
          var w = t && winners[t.id];
          if (!w || placed[t.id] || w.date !== d.date) return;
          dayMap[d.date].tasks.push(JSON.parse(JSON.stringify(w.task)));
          placed[t.id] = true;
        });
      });
    };
    var placed = {};
    placeOnOwnDay(newer);
    placeOnOwnDay(older);

    out.days = Object.keys(dayMap).sort().map(function (k) { return dayMap[k]; });

    // Notes: per id, later lastUpdated wins.
    var notes = {};
    [older.taskNotes || {}, newer.taskNotes || {}].forEach(function (src) {
      Object.keys(src).forEach(function (id) {
        var n = src[id], cur = notes[id];
        var tn = n && n.lastUpdated ? Date.parse(n.lastUpdated) : 0;
        var tc = cur && cur.lastUpdated ? Date.parse(cur.lastUpdated) : 0;
        if (!cur || tn >= tc) notes[id] = n;
      });
    });
    out.taskNotes = notes;
    out.deletedTaskIds = trimTombstones(tombs, now);
    capArchive(out);
    out.meta = { updatedAt: now, deviceId: deviceId };
    return out;
  }

  global.SyncCore = {
    SCHEMA: SCHEMA,
    ARCHIVE_CAP: ARCHIVE_CAP,
    getDeviceId: getDeviceId,
    monthOf: monthOf,
    split: split,
    join: join,
    contentDiffers: contentDiffers,
    fingerprintTasks: fingerprintTasks,
    withStamps: withStamps,
    stampTaskChanges: stampTaskChanges,
    capArchive: capArchive,
    decide: decide,
    merge: merge
  };
})(typeof window !== "undefined" ? window : globalThis);
