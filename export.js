// ============================================================================
//  CYBER STUDY PLAN — EXCEL / CSV EXPORT ENGINE
//  Generates a real .xlsx workbook (and a simple CSV) from the LIVE app state.
//  - Reads appState + localStorage at the moment of download (never the defaults)
//  - Pure client side, no server. Lazy-loads ExcelJS + FileSaver from CDN.
//  - 10 worksheets, conditional status colors, hyperlinks, frozen headers,
//    autofilters, number/date/percent formats, alternating shading, in-cell bars.
// ============================================================================

(function () {
  "use strict";

  // ── CDN libraries (lazy loaded on first export) ───────────────────────────
  const EXCELJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
  const FILESAVER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js";
  const EXPORT_META_KEY = "cyber_export_meta_2026";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-src="${src}"]`);
      if (existing && existing.getAttribute("data-loaded") === "1") return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.setAttribute("data-src", src);
      s.onload = () => { s.setAttribute("data-loaded", "1"); resolve(); };
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureLibs() {
    if (typeof window.ExcelJS === "undefined") await loadScript(EXCELJS_CDN);
    if (typeof window.ExcelJS === "undefined") throw new Error("ExcelJS unavailable");
    // FileSaver is a convenience: if it fails to load or doesn't define saveAs,
    // downloads fall back to an <a download> link (see saveBlob).
    if (typeof window.saveAs !== "function") {
      try { await loadScript(FILESAVER_CDN); } catch (e) { console.warn("[export] FileSaver unavailable, using fallback download:", e.message); }
    }
  }

  function saveBlob(blob, name) {
    if (typeof window.saveAs === "function") window.saveAs(blob, name);
    else fallbackDownload(blob, name);
  }

  // ── Date / plan constants (fall back to locals if app globals are missing) ──
  const START = (typeof START_DATE_STR !== "undefined") ? START_DATE_STR : "2026-06-13";
  const END = (typeof END_DATE_STR !== "undefined") ? END_DATE_STR : "2026-09-01";
  const INDIA_S = (typeof INDIA_START_STR !== "undefined") ? INDIA_START_STR : "2026-06-24";
  const INDIA_E = (typeof INDIA_END_STR !== "undefined") ? INDIA_END_STR : "2026-07-08";

  // ── Small date helpers ─────────────────────────────────────────────────────
  function pd(str) {
    if (!str) return null;
    if (typeof parseDate === "function") return parseDate(str);
    const p = String(str).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function fmt(date) {
    if (typeof formatDate === "function") return formatDate(date);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Calendar-day arithmetic: setDate keeps local midnight across DST changes
  // (adding n * 86400000 ms lands an hour off on Nov 1).
  function addDays(str, n) {
    const d = pd(str);
    d.setDate(d.getDate() + n);
    return fmt(d);
  }
  function dayDiff(aStr, bStr) {
    return Math.round((pd(bStr) - pd(aStr)) / 86400000);
  }
  function weekday(str) {
    return pd(str).toLocaleDateString("en-US", { weekday: "long" });
  }
  function weekNumber(str) {
    return Math.floor(dayDiff(START, str) / 7) + 1;
  }
  function isoTime() { return new Date().toISOString(); }

  // ── Category metadata ──────────────────────────────────────────────────────
  const CAT_LABEL = {
    portswigger: "PortSwigger Labs", aws: "AWS AI Practitioner", secplus: "CompTIA Security+",
    awscp: "AWS Cloud Practitioner", jobapps: "Job Applications",
    interviews: "Interviews", hackathons: "Hackathons",
    projects: "Cybersecurity Projects", leetcode: "LeetCode Blind 75", ahf: "AHF Tech Lead",
    palana: "Palana Preparation", palana_security: "Palana Security",
    github: "Git Developer Tool", winfo: "WINFO", mentor: "Mentor Meetings",
    travel: "Travel", catchup: "Catch-Up", personal: "Personal", custom: "Custom"
  };
  function catLabel(id) {
    if (typeof window.getCategoryLabel === "function") return window.getCategoryLabel(id);
    return CAT_LABEL[id] || id;
  }
  const ROUTINE_CATS = ["ahf", "leetcode", "jobapps", "palana", "github", "custom"];
  const OPTIONAL_CATS = ["projects", "github", "palana", "custom", "hackathons", "interviews"];

  // ── Status & risk color palette (ARGB for ExcelJS) ──────────────────────────
  const STATUS_FILL = {
    "Completed":   { bg: "FFD6F5DD", fg: "FF1B7A3D" },
    "In Progress": { bg: "FFD6E4FF", fg: "FF1F4E9C" },
    "Partial":     { bg: "FFFFF4CC", fg: "FF8A6D00" },
    "Rescheduled": { bg: "FFFFE3C2", fg: "FF9A5B00" },
    "Overdue":     { bg: "FFFFD6D6", fg: "FFB00020" },
    "High Risk":   { bg: "FFFFD6D6", fg: "FFB00020" },
    "Skipped":     { bg: "FFE2E2E2", fg: "FF5A5A5A" },
    "Not Started": { bg: "FFF1F1F4", fg: "FF555566" }
  };
  const RISK_FILL = {
    "Low":    { bg: "FFD6F5DD", fg: "FF1B7A3D" },
    "Medium": { bg: "FFFFF4CC", fg: "FF8A6D00" },
    "High":   { bg: "FFFFD6D6", fg: "FFB00020" }
  };
  const HEADER_BG = "FF6B2D8C";   // deep purple
  const TITLE_BG = "FF2A1240";    // near-black purple
  const ALT_ROW_BG = "FFF7F3FC";  // light lavender
  const THIN = { style: "thin", color: { argb: "FFD9CCEA" } };
  const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

  // ── Live-state access ──────────────────────────────────────────────────────
  function S() { return (typeof appState !== "undefined" && appState) ? appState : { settings: {}, days: [] }; }
  function exportPlanToday() {
    if (typeof window.getRealCurrentDate === "function") {
      const real = window.getRealCurrentDate();
      if (real < START) return START;
      if (real > END) return END;
      return real;
    }
    const st = S();
    return (st.settings && st.settings.lastRolloverDay) ? st.settings.lastRolloverDay : START;
  }
  function cleanTitle(t) {
    return String(t || "")
      .replace(" (Part A)", "").replace(" (Part B)", "")
      .replace(" (Rolled Over)", "").trim();
  }

  // Task notes live in appState.taskNotes[taskId]: an object (text,
  // plannedOutcome, actualOutcome, learned, blockers, nextStep, links) or, in
  // older saves, a plain string. Non-empty parts are joined, labelled.
  function noteTextFor(taskId) {
    const n = (S().taskNotes || {})[taskId];
    if (!n) return "";
    if (typeof n === "string") return n.trim();
    return [
      n.text,
      n.plannedOutcome && "Planned: " + n.plannedOutcome,
      n.actualOutcome && "Actual: " + n.actualOutcome,
      n.learned && "Learned: " + n.learned,
      n.blockers && "Blockers: " + n.blockers,
      n.nextStep && "Next: " + n.nextStep,
      n.links && "Links: " + n.links
    ].filter(x => x && String(x).trim()).map(x => String(x).trim()).join("\n");
  }

  // Flatten every task with its day context.
  function flatTasks() {
    const out = [];
    (S().days || []).forEach(day => {
      (day.tasks || []).forEach(t => out.push({ t, day }));
    });
    return out;
  }

  // ── Exams, derived from the plan ───────────────────────────────────────────
  // An exam task carries exam:true. Older saved tasks without the flag are
  // recognised by category + "Certification Exam" in the title.
  const EXAM_CATS = ["aws", "secplus", "awscp"];
  const EXAM_NAME = { aws: "AWS AI Practitioner", secplus: "CompTIA Security+", awscp: "AWS Cloud Practitioner" };
  function isExamTask(t) {
    if (!t || EXAM_CATS.indexOf(t.category) === -1) return false;
    return t.exam === true || (t.exam == null && /Certification Exam/i.test(t.title || ""));
  }
  // { aws: { date, completed, completedOn } | undefined, ... }. If a category has
  // more than one exam task (e.g. a retired copy that was completed), the
  // unfinished one is the live target; otherwise the latest one.
  let _examCache = null; // reset at the start of each export/preview run
  function examInfo() {
    if (_examCache) return _examCache;
    const out = {};
    flatTasks().forEach(({ t, day }) => {
      if (!isExamTask(t)) return;
      const cur = out[t.category];
      const cand = { date: day.date, completed: !!t.completed, completedOn: t.completedOnDate || (t.completed ? day.date : null) };
      if (!cur || (cur.completed && !cand.completed) || (cur.completed === cand.completed && cand.date > cur.date)) out[t.category] = cand;
    });
    _examCache = out;
    return out;
  }
  // Earliest exam that is still ahead of (or on) the plan day.
  function nextExam() {
    const today = exportPlanToday();
    const info = examInfo();
    return EXAM_CATS.map(c => info[c] && !info[c].completed && info[c].date >= today ? { cat: c, date: info[c].date } : null)
      .filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }

  // ── Derivations ────────────────────────────────────────────────────────────
  function phaseFor(dateStr) {
    const m = +dateStr.slice(5, 7);
    if (m >= 6 && m <= 8) return "Summer (Jun–Aug)";
    if (m >= 9 && m <= 12) return "Fall (Sep–Dec)";
    return "Outside plan";
  }

  function deriveStatus(t, dayStr) {
    if (t.completed) return "Completed";
    const today = exportPlanToday();
    const rolled = !!t.rolledFrom;
    if (rolled) return "Rescheduled";
    if (dayStr < today) {
      return ROUTINE_CATS.indexOf(t.category) !== -1 ? "Skipped" : "Overdue";
    }
    if (dayStr === today) return "In Progress";
    return "Not Started";
  }

  // Original / current scheduled dates + reschedule count from the ledger.
  function rescheduleInfo(t, dayStr) {
    const led = (S().rescheduleLedger || {})[cleanTitle(t.title)];
    const count = led ? (led.count || 0) : (t.rolledFrom ? 1 : 0);
    const original = (t.originalDate) || (led && led.originalDate) || dayStr;
    return { count, original, current: dayStr, movedFrom: led ? led.lastMovedFrom : null };
  }

  // High: past due, moved twice or more, past the plan's end, or an exam-track
  // task scheduled after its own exam. Medium: moved once, or an exam-track task
  // in the last 7 days before its exam. Otherwise Low.
  function riskLevel(t, dayStr, status) {
    if (status === "Completed") return "";
    const ri = rescheduleInfo(t, dayStr);
    const exam = examInfo()[t.category];
    if (dayStr > END || status === "Overdue" || ri.count >= 2) return "High";
    if (exam && !exam.completed && !isExamTask(t) && dayStr > exam.date) return "High";
    if (ri.count === 1) return "Medium";
    if (exam && !exam.completed && dayStr <= exam.date && dayDiff(dayStr, exam.date) <= 7) return "Medium";
    return "Low";
  }

  // Timing of a completed task vs the day it was scheduled on.
  function completionTiming(t, dayStr) {
    if (!t.completed) return "";
    const done = t.completedOnDate;
    if (!done) return "On Time";
    if (done < dayStr) return "Early";
    if (done > dayStr) return "Late";
    return "On Time";
  }

  // Aggregate planned/completed for a category (or predicate).
  function catStats(pred) {
    let ph = 0, ch = 0, pc = 0, cc = 0;
    flatTasks().forEach(({ t }) => {
      if (!pred(t)) return;
      ph += t.duration || 0; pc += 1;
      if (t.completed) { ch += t.duration || 0; cc += 1; }
    });
    return { plannedHours: round1(ph), completedHours: round1(ch), plannedCount: pc, completedCount: cc, pct: ph > 0 ? ch / ph : 0 };
  }
  const byCat = (c) => catStats(t => t.category === c);

  function round1(n) { return Math.round((n || 0) * 10) / 10; }

  // In-cell unicode progress bar.
  function bar(frac, width) {
    width = width || 20;
    frac = Math.max(0, Math.min(1, frac || 0));
    const filled = Math.round(frac * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  }

  // Logical-group partial detection (Part A done, Part B not, etc.)
  function partialGroupCount() {
    const groups = {};
    flatTasks().forEach(({ t }) => {
      const k = cleanTitle(t.title) + "|" + t.category;
      groups[k] = groups[k] || { total: 0, done: 0 };
      groups[k].total += 1;
      if (t.completed) groups[k].done += 1;
    });
    let n = 0;
    Object.values(groups).forEach(g => { if (g.done > 0 && g.done < g.total) n += 1; });
    return n;
  }

  // ── Inclusion filters (toggles + scope) ────────────────────────────────────
  function taskPassesToggles(t, opt) {
    const c = t.category;
    if (c === "ahf" && !opt.includeAHF) return false;
    if (c === "palana" && !opt.includePalana) return false;
    if (c === "leetcode" && !opt.includeLeetcode) return false;
    if ((c === "projects" || c === "github") && !opt.includeOptional) return false;
    if (c === "awscp" && !opt.includeAwsCp) return false;
    if (c === "jobapps" && !opt.includeJobApps) return false;
    if (c === "interviews" && !opt.includeInterviews) return false;
    if (c === "hackathons" && !opt.includeHackathons) return false;
    // PortSwigger is a retired track: excluded unless explicitly requested.
    if (c === "portswigger" && !opt.includePortswigger) return false;
    return true;
  }

  function weekWindow(dateStr) {
    const startOffset = (weekNumber(dateStr) - 1) * 7;
    return { ws: addDays(START, startOffset), we: addDays(START, startOffset + 6) };
  }

  function dateInScope(dateStr, opt) {
    if (opt.scope === "week") {
      const w = weekWindow(exportPlanToday());
      return dateStr >= w.ws && dateStr <= w.we;
    }
    if (opt.scope === "range") {
      const a = opt.rangeStart || START, b = opt.rangeEnd || END;
      return dateStr >= a && dateStr <= b;
    }
    return true;
  }

  // Build the filtered, enriched row list used by most sheets.
  function buildScheduleRows(opt) {
    const rows = [];
    flatTasks().forEach(({ t, day }) => {
      if (!taskPassesToggles(t, opt)) return;
      if (!dateInScope(day.date, opt)) return;
      const status = deriveStatus(t, day.date);
      if (status === "Skipped" && !opt.includeSkipped) return;
      if (opt.scope === "completed" && status !== "Completed") return;
      if (opt.scope === "unfinished" && status === "Completed") return;

      const ri = rescheduleInfo(t, day.date);
      const planned = t.duration || 0;
      const completedDur = t.completed ? planned : 0;
      rows.push({
        date: pd(day.date),
        dateStr: day.date,
        dow: weekday(day.date),
        week: weekNumber(day.date),
        phase: phaseFor(day.date),
        title: t.title,
        cleanTitle: cleanTitle(t.title),
        category: catLabel(t.category),
        rawCat: t.category,
        description: t.title,
        planned: planned,
        completed: completedDur,
        remaining: round1(planned - completedDur),
        priority: OPTIONAL_CATS.indexOf(t.category) === -1 ? "Required" : "Optional",
        status: status,
        originalDate: ri.original ? pd(ri.original) : null,
        currentDate: pd(day.date),
        completedDate: t.completedOnDate ? pd(t.completedOnDate) : null,
        rescheduleCount: ri.count,
        optReq: OPTIONAL_CATS.indexOf(t.category) === -1 ? "Required" : "Optional",
        resourceName: resourceTitleFor(t),
        resourceLink: t.link || "",
        timing: completionTiming(t, day.date),
        risk: riskLevel(t, day.date, status),
        notes: opt.includeNotes ? noteTextFor(t.id) : ""
      });
    });
    rows.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.title.localeCompare(b.title));
    return rows;
  }

  function resourceTitleFor(t) {
    if (!t.link) return "";
    const map = {
      "portswigger.net": "PortSwigger Web Security Academy",
      "skillbuilder.aws": "AWS Skill Builder",
      "professormesser.com": "Professor Messer Sec+",
      "neetcode.io": "NeetCode Blind 75",
      "leetcode.com": "LeetCode",
      "udemy.com": "Udemy Course",
      "comptia.org": "CompTIA",
      "tutorialsdojo.com": "Tutorials Dojo",
      "bestprojectideas.com": "Project Ideas",
      "aws.amazon.com": "AWS Certification"
    };
    for (const k in map) if (t.link.indexOf(k) !== -1) return map[k];
    return "Reference";
  }

  // ── Weekly aggregation ─────────────────────────────────────────────────────
  function buildWeekly(opt) {
    const weeks = {};
    flatTasks().forEach(({ t, day }) => {
      if (!taskPassesToggles(t, opt)) return;
      if (!dateInScope(day.date, opt)) return;
      const wn = weekNumber(day.date);
      if (!weeks[wn]) {
        const w = weekWindow(day.date);
        weeks[wn] = {
          week: wn, ws: w.ws, we: w.we, planned: 0, completed: 0, tasksPlanned: 0, tasksCompleted: 0,
          leetcode: 0, portswigger: 0, secplus: 0, aws: 0, ahf: 0, palana: 0, project: 0
        };
      }
      const wk = weeks[wn];
      wk.planned += t.duration || 0;
      wk.tasksPlanned += 1;
      if (t.completed) {
        wk.completed += t.duration || 0;
        wk.tasksCompleted += 1;
        if (t.category === "leetcode") wk.leetcode += 1;
        if (t.category === "portswigger") wk.portswigger += 1;
        if (t.category === "secplus") wk.secplus += 1;
        if (t.category === "aws") wk.aws += 1;
        if (t.category === "ahf") wk.ahf += t.duration || 0;
        if (t.category === "palana") wk.palana += t.duration || 0;
        if (t.category === "projects") wk.project += t.duration || 0;
      }
    });
    return Object.values(weeks).sort((a, b) => a.week - b.week).map(w => ({
      week: w.week,
      start: pd(w.ws), end: pd(w.we),
      planned: round1(w.planned), completed: round1(w.completed),
      pct: w.planned > 0 ? w.completed / w.planned : 0,
      bar: bar(w.planned > 0 ? w.completed / w.planned : 0, 16),
      tasksPlanned: w.tasksPlanned, tasksCompleted: w.tasksCompleted,
      leetcode: w.leetcode, portswigger: w.portswigger, secplus: w.secplus, aws: w.aws,
      ahf: round1(w.ahf), palana: round1(w.palana), project: round1(w.project)
    }));
  }

  // ── LeetCode 75 cross-reference ────────────────────────────────────────────
  function buildLeetcode() {
    const list = (typeof BLIND_75_QUESTIONS !== "undefined") ? BLIND_75_QUESTIONS : [];
    // Index scheduled leetcode tasks by Blind 75 seq (same mapping as the
    // dashboard metric: OA tasks count only if their LC number is on the list).
    const sched = {};
    flatTasks().forEach(({ t, day }) => {
      if (t.category !== "leetcode") return;
      const seq = (typeof blind75SeqOf === "function") ? blind75SeqOf(t) : t.blind75Seq;
      if (!seq) return;
      if (!sched[seq] || t.completed) sched[seq] = { day: day.date, completed: t.completed, completedOn: t.completedOnDate };
    });
    return list.map(q => {
      const s = sched[q.seq] || {};
      const status = s.completed ? "Completed" : (s.day ? (s.day < exportPlanToday() ? "Skipped" : (s.day === exportPlanToday() ? "In Progress" : "Not Started")) : "Not Started");
      return {
        name: q.name, num: q.lc, topic: q.category || "", difficulty: q.difficulty || "",
        scheduled: s.day ? pd(s.day) : null,
        completedDate: s.completedOn ? pd(s.completedOn) : null,
        status: status, attempts: "", timeSpent: "", solution: q.link || "", notes: ""
      };
    });
  }

  // ── Projects ───────────────────────────────────────────────────────────────
  // Dated projects (p.dated) are measured by the tasks tagged with their
  // projectId: start = first scheduled task date, target = p.dueDate. The
  // original summer projects (not dated) are matched to tasks by name and only
  // count as active when selected in Settings.
  function projectStatus(pct, doneHours) {
    return pct >= 0.999 ? "Completed" : (doneHours > 0 ? "In Progress" : "Not Started");
  }
  function buildProjects() {
    const out = [];
    const projDefs = (typeof TRACK_4_PROJECTS !== "undefined") ? TRACK_4_PROJECTS : [];
    const selected = (S().settings && S().settings.selectedProjects) || [];
    const all = flatTasks();

    projDefs.forEach(p => {
      let mine, planned, completed, isSel = true;
      if (p.dated) {
        mine = all.filter(({ t }) => t.projectId === p.id);
        planned = mine.reduce((n, { t }) => n + (t.duration || 0), 0);
        completed = mine.reduce((n, { t }) => n + (t.completed ? (t.duration || 0) : 0), 0);
      } else {
        isSel = selected.indexOf(p.id) !== -1;
        const names = {};
        (p.tasks || []).forEach(tk => { names[cleanTitle(tk.name)] = true; });
        mine = all.filter(({ t }) => names[cleanTitle(t.title)]);
        planned = p.totalHours || 0;
        completed = mine.reduce((n, { t }) => n + (t.completed ? (t.duration || 0) : 0), 0);
      }
      const dates = mine.map(({ day }) => day.date).sort();
      const pct = planned > 0 ? completed / planned : 0;
      const status = !isSel ? "Skipped (not selected)" : projectStatus(pct, completed);
      out.push({
        name: p.name, type: p.dated ? "Dated Project" : "Cybersecurity Project", description: p.desc,
        status: status,
        priority: isSel ? "Required" : "Optional",
        start: dates.length ? pd(dates[0]) : null,
        target: p.dueDate ? pd(p.dueDate) : (dates.length ? pd(dates[dates.length - 1]) : null),
        planned: round1(planned), completed: round1(completed), remaining: round1(Math.max(0, planned - completed)),
        github: "", demo: "", skills: deriveSkills(p),
        deliverables: p.dated ? mine.length + " scheduled tasks" : (p.tasks || []).length + " modules",
        portfolio: isSel && pct >= 0.999 ? "Yes" : "No", notes: ""
      });
    });

    // Palana security work (if enabled), dated from its own tasks.
    const palTasks = all.filter(({ t }) => t.category === "palana");
    const pal = catStats(t => t.category === "palana");
    if (S().settings && S().settings.palanaEnabled && pal.plannedCount > 0) {
      const dates = palTasks.map(({ day }) => day.date).sort();
      out.push({
        name: "Palana Safety Engineering", type: "Professional Work",
        description: "Safety-engineering onboarding prep and ongoing work blocks (position pending).",
        status: pal.completedHours > 0 ? "In Progress" : "Not Started",
        priority: "Optional", start: pd(dates[0]), target: pd(dates[dates.length - 1]),
        planned: pal.plannedHours, completed: pal.completedHours, remaining: round1(pal.plannedHours - pal.completedHours),
        github: "", demo: "", skills: "Safety domain, compliance, engineering", deliverables: "Onboarding readiness",
        portfolio: "No", notes: ""
      });
    }
    return out;
  }
  function deriveSkills(p) {
    const map = {
      password_manager: "AES-GCM, bcrypt, Flask/Node",
      packet_analyzer: "Python, Scapy, sockets",
      vulnerability_scanner: "HTTP, SQLi/XSS, reporting",
      malware_sandbox: "VM isolation, telemetry, IOC",
      honeypot_setup: "SSH, logging, geo-IP, dashboards"
    };
    return map[p.id] || "Security engineering";
  }

  // ── Certifications ─────────────────────────────────────────────────────────
  function certStatus(cat, passedFlag) {
    if (passedFlag) return "Passed";
    const ex = examInfo()[cat];
    if (ex && ex.completed) return "Passed";
    return byCat(cat).completedCount > 0 ? "In Progress" : "Not Started";
  }
  function awsStatus() { return certStatus("aws", (S().settings || {}).awsExamPassed); }
  function secStatus() { return certStatus("secplus", (S().settings || {}).securityPlusExamPassed); }
  function awscpStatus() { return certStatus("awscp", (S().settings || {}).awscpExamPassed); }

  // ── Resources library ──────────────────────────────────────────────────────
  function buildResources(opt) {
    const seen = {};
    const out = [];
    flatTasks().forEach(({ t }) => {
      if (!t.link) return;
      if (!taskPassesToggles(t, opt)) return;
      if (seen[t.link]) { if (t.completed) seen[t.link].anyDone = true; return; }
      seen[t.link] = { anyDone: t.completed };
      out.push({
        category: catLabel(t.category),
        title: resourceTitleFor(t), description: cleanTitle(t.title),
        url: t.link, related: cleanTitle(t.title),
        _ref: t.link
      });
    });
    // Static reference links from the sidebar library.
    [
      ["AWS Cloud Practitioner", "Tutorials Dojo Practice Exams", "https://tutorialsdojo.com/aws-cloud-practitioner-clf-c02-exam-guide/"],
      ["LeetCode Blind 75", "NeetCode Blind 75 Prep", "https://neetcode.io/practice/practice/blind75"]
    ].forEach(([cat, title, url]) => {
      if (seen[url]) return;
      seen[url] = { anyDone: false };
      out.push({ category: cat, title, description: title, url, related: "", _ref: url });
    });
    return out.map(r => ({
      category: r.category, title: r.title, description: r.description, url: r.url,
      related: r.related, status: seen[r._ref].anyDone ? "Completed" : "Not Started",
      notes: ""
    }));
  }

  // ── Master data gather ─────────────────────────────────────────────────────
  function gather(opt) {
    _examCache = null;
    const schedule = buildScheduleRows(opt);
    const completed = schedule.filter(r => r.status === "Completed");
    const unfinished = schedule.filter(r => r.status !== "Completed");

    const totalPlanned = round1(flatTasks().reduce((s, x) => s + (x.t.duration || 0), 0));
    const totalCompleted = round1(flatTasks().reduce((s, x) => s + (x.t.completed ? (x.t.duration || 0) : 0), 0));
    const allTaskCount = flatTasks().length;
    const completedCount = flatTasks().filter(x => x.t.completed).length;
    // At risk: an unfinished exam-track task is already past due, or a day
    // overflowed the plan. Measured against the next upcoming exam (else plan end).
    const upcoming = nextExam();
    const target = upcoming ? { name: EXAM_NAME[upcoming.cat], date: upcoming.date } : { name: "Plan End", date: END };

    const statusCounts = { Completed: 0, Overdue: 0, Skipped: 0, Rescheduled: 0, "In Progress": 0, "Not Started": 0 };
    flatTasks().forEach(({ t, day }) => {
      const stt = deriveStatus(t, day.date);
      if (statusCounts[stt] != null) statusCounts[stt] += 1;
    });
    const atRisk = (S().days || []).some(d => d.isOverflow) ||
      flatTasks().some(({ t, day }) => EXAM_CATS.indexOf(t.category) !== -1 && !isExamTask(t) && deriveStatus(t, day.date) === "Overdue");

    const summary = {
      planStart: START, deadline: END, planToday: exportPlanToday(), downloadDate: fmt(new Date()),
      overallPct: allTaskCount > 0 ? completedCount / allTaskCount : 0,
      totalPlanned, totalCompleted, remaining: round1(totalPlanned - totalCompleted),
      completedCount, unfinishedCount: allTaskCount - completedCount, partialCount: partialGroupCount(),
      skippedCount: statusCounts.Skipped, rescheduledCount: statusCounts.Rescheduled, overdueCount: statusCounts.Overdue,
      secplus: byCat("secplus"), aws: byCat("aws"), portswigger: byCat("portswigger"),
      leetcode: byCat("leetcode"), ahf: byCat("ahf"), awscp: byCat("awscp"),
      palana: byCat("palana"), projects: byCat("projects"), github: byCat("github"),
      onTrack: !atRisk, atRisk,
      onTrackLabel: `On Track for ${target.name} (${target.date})?`,
      categories: ["portswigger", "aws", "awscp", "secplus", "leetcode", "ahf", "palana", "github", "projects", "jobapps", "interviews", "hackathons", "winfo", "mentor"].map(c => ({
        cat: CAT_LABEL[c], stats: byCat(c)
      })).filter(x => x.stats.plannedCount > 0)
    };

    return {
      opt, summary, schedule, completed, unfinished,
      weekly: buildWeekly(opt), leetcode: buildLeetcode(), projects: buildProjects(),
      resources: opt.includeResources ? buildResources(opt) : [],
      certs: { aws: awsStatus(), sec: secStatus(), awscp: awscpStatus(),
        awsStats: byCat("aws"), secStats: byCat("secplus"), awscpStats: byCat("awscp"), exams: examInfo() }
    };
  }

  // Which sheets get built for the chosen scope.
  function sheetPlan(opt) {
    const base = { dashboard: true };
    if (opt.scope === "completed") return Object.assign(base, { schedule: true, completed: true });
    if (opt.scope === "unfinished") return Object.assign(base, { schedule: true, unfinished: true });
    if (opt.scope === "certs") return Object.assign(base, { certs: true, leetcode: true });
    if (opt.scope === "projects") return Object.assign(base, { projects: true });
    // full / week / range → everything
    return Object.assign(base, {
      schedule: true, completed: true, unfinished: true, weekly: true,
      certs: true, leetcode: opt.includeLeetcode, projects: true,
      resources: opt.includeResources, settings: true
    });
  }

  // ============================================================================
  //  WORKBOOK WRITER HELPERS
  // ============================================================================
  function styleHeader(ws, cols, headerBg) {
    const row = ws.getRow(1);
    row.height = 24;
    for (let i = 1; i <= cols; i++) {
      const cell = row.getCell(i);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerBg || HEADER_BG } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = BORDER;
    }
  }

  // Generic table writer. colsDef: [{header,key,width,type,wrap}]
  // type ∈ text|date|hours|percent|int|link|linktext|status|risk|mono
  function writeTable(wb, title, colsDef, rows, o) {
    o = o || {};
    const ws = wb.addWorksheet(title.substring(0, 31), {
      properties: { tabColor: { argb: o.tabColor || HEADER_BG } },
      views: [{ state: "frozen", ySplit: 1, xSplit: o.xSplit || 0 }]
    });
    ws.columns = colsDef.map(c => ({ header: c.header, key: c.key, width: c.width || 16 }));
    styleHeader(ws, colsDef.length, o.headerBg);

    rows.forEach((r, idx) => {
      const row = ws.addRow({});
      row.alignment = { vertical: "top" };
      colsDef.forEach((c, ci) => {
        const cell = row.getCell(ci + 1);
        const v = r[c.key];
        applyCell(cell, v, c, r);
        cell.border = BORDER;
        // alternating shading (skip cells that carry their own status/risk fill)
        if (idx % 2 === 1 && c.type !== "status" && c.type !== "risk") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
        }
        if (c.wrap) cell.alignment = { vertical: "top", wrapText: true };
      });
    });

    // autofilter across the header range
    if (o.autofilter !== false) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colsDef.length } };
    }
    return ws;
  }

  function applyCell(cell, v, c, row) {
    switch (c.type) {
      case "date":
        if (v instanceof Date && !isNaN(v)) { cell.value = v; cell.numFmt = "yyyy-mm-dd"; }
        else cell.value = "";
        cell.alignment = { horizontal: "center", vertical: "top" };
        break;
      case "hours":
        cell.value = (v == null || v === "") ? "" : Number(v);
        cell.numFmt = '0.0" h"';
        cell.alignment = { horizontal: "right", vertical: "top" };
        break;
      case "percent":
        cell.value = (v == null || v === "") ? "" : Number(v);
        cell.numFmt = "0%";
        cell.alignment = { horizontal: "center", vertical: "top" };
        break;
      case "int":
        cell.value = (v == null || v === "") ? "" : Number(v);
        cell.numFmt = "0";
        cell.alignment = { horizontal: "center", vertical: "top" };
        break;
      case "link":
        if (v) { cell.value = { text: "Open ↗", hyperlink: String(v) }; cell.font = { color: { argb: "FF1A56DB" }, underline: true }; }
        else cell.value = "";
        cell.alignment = { horizontal: "center", vertical: "top" };
        break;
      case "linktext":
        if (v) { cell.value = { text: String(v), hyperlink: String(v) }; cell.font = { color: { argb: "FF1A56DB" }, underline: true }; }
        else cell.value = "";
        cell.alignment = { vertical: "top", wrapText: true };
        break;
      case "status": {
        cell.value = v || "";
        const s = STATUS_FILL[v];
        if (s) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.bg } };
          cell.font = { bold: true, color: { argb: s.fg } };
        }
        cell.alignment = { horizontal: "center", vertical: "top" };
        break;
      }
      case "risk": {
        cell.value = v || "";
        const s = RISK_FILL[v];
        if (s) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.bg } };
          cell.font = { bold: true, color: { argb: s.fg } };
        }
        cell.alignment = { horizontal: "center", vertical: "top" };
        break;
      }
      case "mono":
        cell.value = v == null ? "" : v;
        cell.font = { name: "Consolas", size: 10, color: { argb: "FF1B7A3D" } };
        break;
      default:
        cell.value = v == null ? "" : v;
        cell.alignment = { vertical: "top", wrapText: !!c.wrap };
    }
  }

  // ── Dashboard sheet (key/value + bars) ─────────────────────────────────────
  function writeDashboard(wb, data) {
    const s = data.summary;
    const ws = wb.addWorksheet("Dashboard Summary", {
      properties: { tabColor: { argb: "FFEC4899" } },
      views: [{ state: "frozen", ySplit: 2 }]
    });
    ws.columns = [{ width: 34 }, { width: 22 }, { width: 30 }, { width: 26 }];

    function titleRow(text, mergeTo) {
      const r = ws.addRow([text]);
      ws.mergeCells(`A${r.number}:${mergeTo || "D"}${r.number}`);
      const c = r.getCell(1);
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
      c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      r.height = 26;
      return r;
    }
    function sectionRow(text) {
      const r = ws.addRow([text]);
      ws.mergeCells(`A${r.number}:D${r.number}`);
      const c = r.getCell(1);
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
      c.alignment = { vertical: "middle", indent: 1 };
      r.height = 20;
    }
    function kv(label, value, opts) {
      opts = opts || {};
      const r = ws.addRow([label, value, opts.extra || "", opts.extra2 || ""]);
      r.getCell(1).font = { bold: true, color: { argb: "FF2A1240" } };
      r.getCell(1).border = BORDER;
      const vc = r.getCell(2);
      vc.border = BORDER;
      if (opts.type === "percent") { vc.value = Number(value); vc.numFmt = "0%"; }
      else if (opts.type === "hours") { vc.value = Number(value); vc.numFmt = '0.0" h"'; }
      else if (opts.type === "date") { if (value) { vc.value = pd(value); vc.numFmt = "yyyy-mm-dd"; } }
      vc.alignment = { horizontal: "left" };
      if (opts.status && STATUS_FILL[opts.status]) {
        vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[opts.status].bg } };
        vc.font = { bold: true, color: { argb: STATUS_FILL[opts.status].fg } };
      }
      if (opts.bar != null) {
        const bc = r.getCell(3);
        bc.value = bar(opts.bar, 20);
        bc.font = { name: "Consolas", color: { argb: opts.bar >= 0.66 ? "FF1B7A3D" : (opts.bar >= 0.33 ? "FF8A6D00" : "FFB00020") } };
        bc.border = BORDER;
        const pc = r.getCell(4);
        pc.value = Number(opts.bar); pc.numFmt = "0%"; pc.border = BORDER;
        pc.alignment = { horizontal: "center" };
      }
      return r;
    }

    titleRow("CYBERSECURITY STUDY PLAN 2026 — DASHBOARD SUMMARY");
    const meta = ws.addRow(["Generated: " + new Date().toLocaleString()]);
    ws.mergeCells(`A${meta.number}:D${meta.number}`);
    meta.getCell(1).font = { italic: true, color: { argb: "FF8A6D00" }, size: 9 };

    sectionRow("◆ TIMELINE");
    kv("Plan Start Date", s.planStart, { type: "date" });
    kv("Final Deadline", s.deadline, { type: "date" });
    kv("Current Plan Day", s.planToday, { type: "date" });
    kv("Download Date", s.downloadDate, { type: "date" });
    kv(s.onTrackLabel, s.onTrack ? "YES — On Track ✅" : "AT RISK ⚠️", { status: s.onTrack ? "Completed" : "Overdue" });

    sectionRow("◆ OVERALL PROGRESS");
    kv("Overall Completion", s.overallPct, { type: "percent", bar: s.overallPct });
    kv("Total Planned Hours", s.totalPlanned, { type: "hours" });
    kv("Total Completed Hours", s.totalCompleted, { type: "hours", bar: s.totalPlanned > 0 ? s.totalCompleted / s.totalPlanned : 0 });
    kv("Remaining Hours", s.remaining, { type: "hours" });

    sectionRow("◆ TASK BREAKDOWN");
    kv("Completed Tasks", s.completedCount, { type: "int" });
    kv("Unfinished Tasks", s.unfinishedCount, { type: "int" });
    kv("Partially Completed", s.partialCount, { type: "int" });
    kv("Skipped Tasks", s.skippedCount, { type: "int" });
    kv("Rescheduled Tasks", s.rescheduledCount, { type: "int" });
    kv("Overdue Tasks", s.overdueCount, { type: "int" });

    sectionRow("◆ CERTIFICATION & TRACK PROGRESS");
    kv("CompTIA Security+ (SY0-701)", s.secplus.pct, { type: "percent", bar: s.secplus.pct });
    kv("AWS AI Practitioner", s.aws.pct, { type: "percent", bar: s.aws.pct });
    if (s.awscp.plannedCount > 0) kv("AWS Cloud Practitioner", s.awscp.pct, { type: "percent", bar: s.awscp.pct });
    kv("PortSwigger Labs", s.portswigger.pct, { type: "percent", bar: s.portswigger.pct });
    kv("LeetCode Blind 75", s.leetcode.pct, { type: "percent", bar: s.leetcode.pct });
    kv("AHF Hours Completed", s.ahf.completedHours, { type: "hours" });
    if (S().settings && S().settings.palanaEnabled) kv("Palana Hours Completed", s.palana.completedHours, { type: "hours" });
    kv("Personal Projects", s.projects.pct, { type: "percent", bar: s.projects.pct });

    sectionRow("◆ HOURS BY CATEGORY (Completed ▏ Planned)");
    const hdr = ws.addRow(["Category", "Completed", "Bar", "Planned"]);
    hdr.eachCell((c, n) => { if (n <= 4) { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }; c.border = BORDER; } });
    s.categories.forEach(row => {
      const r = ws.addRow([row.cat, row.stats.completedHours, bar(row.stats.pct, 18), row.stats.plannedHours]);
      r.getCell(1).border = BORDER; r.getCell(1).font = { bold: true, color: { argb: "FF2A1240" } };
      r.getCell(2).numFmt = '0.0" h"'; r.getCell(2).border = BORDER;
      r.getCell(3).font = { name: "Consolas", color: { argb: "FF6B2D8C" } }; r.getCell(3).border = BORDER;
      r.getCell(4).numFmt = '0.0" h"'; r.getCell(4).border = BORDER;
    });

    const note = ws.addRow(["Tip: select a table on any sheet, then Insert ▸ Chart to visualize it in Excel."]);
    ws.mergeCells(`A${note.number}:D${note.number}`);
    note.getCell(1).font = { italic: true, color: { argb: "FF8A6D00" }, size: 9 };
    return ws;
  }

  // ============================================================================
  //  BUILD WORKBOOK
  // ============================================================================
  async function buildWorkbook(data) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Cyber Study Plan Command Center";
    wb.created = new Date();
    wb.properties.title = "Cybersecurity Study Plan 2026";
    wb.properties.comments = "Exported " + new Date().toLocaleString();

    const plan = sheetPlan(data.opt);

    if (plan.dashboard) writeDashboard(wb, data);

    if (plan.schedule) {
      writeTable(wb, "Full Schedule", [
        { header: "Date", key: "date", type: "date", width: 12 },
        { header: "Day", key: "dow", width: 11 },
        { header: "Week", key: "week", type: "int", width: 7 },
        { header: "Study Phase", key: "phase", width: 26, wrap: true },
        { header: "Task Name", key: "title", width: 42, wrap: true },
        { header: "Category", key: "category", width: 20 },
        { header: "Description", key: "description", width: 42, wrap: true },
        { header: "Planned", key: "planned", type: "hours", width: 10 },
        { header: "Completed", key: "completed", type: "hours", width: 11 },
        { header: "Remaining", key: "remaining", type: "hours", width: 11 },
        { header: "Priority", key: "priority", width: 11 },
        { header: "Status", key: "status", type: "status", width: 13 },
        { header: "Original Date", key: "originalDate", type: "date", width: 13 },
        { header: "Current Date", key: "currentDate", type: "date", width: 13 },
        { header: "Date Completed", key: "completedDate", type: "date", width: 14 },
        { header: "Resched #", key: "rescheduleCount", type: "int", width: 9 },
        { header: "Opt/Req", key: "optReq", width: 10 },
        { header: "Resource", key: "resourceName", width: 26, wrap: true },
        { header: "Resource Link", key: "resourceLink", type: "link", width: 13 },
        { header: "Notes", key: "notes", width: 26, wrap: true }
      ], data.schedule, { tabColor: "FF8B5CF6", xSplit: 1 });
    }

    if (plan.completed) {
      writeTable(wb, "Completed Tasks", [
        { header: "Task Name", key: "title", width: 44, wrap: true },
        { header: "Category", key: "category", width: 20 },
        { header: "Planned Date", key: "currentDate", type: "date", width: 13 },
        { header: "Completion Date", key: "completedDate", type: "date", width: 14 },
        { header: "Planned Time", key: "planned", type: "hours", width: 12 },
        { header: "Actual Time", key: "completed", type: "hours", width: 12 },
        { header: "Early/On Time/Late", key: "timing", type: "status", width: 16 },
        { header: "Status", key: "status", type: "status", width: 12 },
        { header: "Notes", key: "notes", width: 28, wrap: true },
        { header: "Resource Link", key: "resourceLink", type: "link", width: 13 }
      ], data.completed, { tabColor: "FF22C55E" });
    }

    if (plan.unfinished) {
      writeTable(wb, "Unfinished & Rescheduled", [
        { header: "Task Name", key: "title", width: 44, wrap: true },
        { header: "Category", key: "category", width: 20 },
        { header: "Original Date", key: "originalDate", type: "date", width: 13 },
        { header: "Current Date", key: "currentDate", type: "date", width: 13 },
        { header: "Remaining", key: "remaining", type: "hours", width: 11 },
        { header: "Times Moved", key: "rescheduleCount", type: "int", width: 12 },
        { header: "Reason Moved", key: "_reason", width: 24, wrap: true },
        { header: "Priority", key: "priority", width: 11 },
        { header: "Final Deadline", key: "_deadline", type: "date", width: 14 },
        { header: "Status", key: "status", type: "status", width: 13 },
        { header: "Risk Level", key: "risk", type: "risk", width: 11 }
      ], data.unfinished.map(r => Object.assign({}, r, {
        _reason: r.rescheduleCount > 0 ? "Carried via rollover" : (r.status === "Overdue" ? "Past due — not completed" : ""),
        _deadline: pd(END)
      })), { tabColor: "FFF59E0B" });
    }

    if (plan.weekly) {
      writeTable(wb, "Weekly Progress", [
        { header: "Week", key: "week", type: "int", width: 7 },
        { header: "Week Start", key: "start", type: "date", width: 12 },
        { header: "Week End", key: "end", type: "date", width: 12 },
        { header: "Planned", key: "planned", type: "hours", width: 10 },
        { header: "Completed", key: "completed", type: "hours", width: 11 },
        { header: "Completion", key: "pct", type: "percent", width: 11 },
        { header: "Progress", key: "bar", type: "mono", width: 20 },
        { header: "Tasks Planned", key: "tasksPlanned", type: "int", width: 13 },
        { header: "Tasks Done", key: "tasksCompleted", type: "int", width: 11 },
        { header: "LeetCode", key: "leetcode", type: "int", width: 10 },
        { header: "PortSwigger", key: "portswigger", type: "int", width: 12 },
        { header: "Sec+ Lessons", key: "secplus", type: "int", width: 12 },
        { header: "AWS Lessons", key: "aws", type: "int", width: 12 },
        { header: "AHF h", key: "ahf", type: "hours", width: 9 },
        { header: "Palana h", key: "palana", type: "hours", width: 10 },
        { header: "Project h", key: "project", type: "hours", width: 10 }
      ], data.weekly, { tabColor: "FF06B6D4" });
    }

    if (plan.certs) writeCertifications(wb, data);
    if (plan.leetcode) {
      writeTable(wb, "LeetCode 75", [
        { header: "Problem", key: "name", width: 40, wrap: true },
        { header: "#", key: "num", type: "int", width: 6 },
        { header: "Topic", key: "topic", width: 18 },
        { header: "Difficulty", key: "difficulty", width: 11 },
        { header: "Scheduled", key: "scheduled", type: "date", width: 12 },
        { header: "Completed", key: "completedDate", type: "date", width: 12 },
        { header: "Status", key: "status", type: "status", width: 13 },
        { header: "Attempts", key: "attempts", type: "int", width: 10 },
        { header: "Time Spent", key: "timeSpent", width: 11 },
        { header: "Solution", key: "solution", type: "link", width: 11 },
        { header: "Notes", key: "notes", width: 26, wrap: true }
      ], data.leetcode, { tabColor: "FFA855F7" });
    }

    if (plan.projects) {
      writeTable(wb, "Projects", [
        { header: "Project", key: "name", width: 32, wrap: true },
        { header: "Type", key: "type", width: 18 },
        { header: "Description", key: "description", width: 46, wrap: true },
        { header: "Status", key: "status", type: "status", width: 18 },
        { header: "Priority", key: "priority", width: 11 },
        { header: "Start", key: "start", type: "date", width: 12 },
        { header: "Target", key: "target", type: "date", width: 12 },
        { header: "Planned", key: "planned", type: "hours", width: 10 },
        { header: "Completed", key: "completed", type: "hours", width: 11 },
        { header: "Remaining", key: "remaining", type: "hours", width: 11 },
        { header: "GitHub Repo", key: "github", type: "linktext", width: 24 },
        { header: "Demo Link", key: "demo", type: "linktext", width: 18 },
        { header: "Skills Used", key: "skills", width: 26, wrap: true },
        { header: "Deliverables", key: "deliverables", width: 18, wrap: true },
        { header: "Portfolio Ready", key: "portfolio", width: 14 },
        { header: "Notes", key: "notes", width: 24, wrap: true }
      ], data.projects, { tabColor: "FFD946EF" });
    }

    if (plan.resources && data.resources.length) {
      writeTable(wb, "Resources", [
        { header: "Category", key: "category", width: 22 },
        { header: "Resource Title", key: "title", width: 32, wrap: true },
        { header: "Description", key: "description", width: 46, wrap: true },
        { header: "URL", key: "url", type: "linktext", width: 50 },
        { header: "Related Task", key: "related", width: 36, wrap: true },
        { header: "Status", key: "status", type: "status", width: 14 },
        { header: "Notes", key: "notes", width: 24, wrap: true }
      ], data.resources, { tabColor: "FF10B981" });
    }

    // ⭐ NEW: Write optional worksheets
    if (plan.settings) {
      writeCategories(wb, data);
      writeExtracurriculars(wb, data);
      writeMentorMeetings(wb, data);
      writePalanaPrepSummary(wb, data);
      writeAHFTasks(wb, data);
      writeTaskNotes(wb, data);
      writeGitProjectRoadmap(wb, data);
      writeSettings(wb);
    }

    return wb;
  }

  function writeCertifications(wb, data) {
    const ws = wb.addWorksheet("Certifications", {
      properties: { tabColor: { argb: "FFF97316" } },
      views: [{ state: "frozen", ySplit: 1 }]
    });
    ws.columns = [{ width: 30 }, { width: 40 }, { width: 30 }];
    function section(t) {
      const r = ws.addRow([t]);
      ws.mergeCells(`A${r.number}:C${r.number}`);
      const c = r.getCell(1);
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
      c.alignment = { indent: 1, vertical: "middle" }; r.height = 22;
    }
    function kv(k, v, status, type) {
      const r = ws.addRow([k, "", ""]);
      r.getCell(1).font = { bold: true, color: { argb: "FF2A1240" } }; r.getCell(1).border = BORDER;
      const vc = r.getCell(2); vc.border = BORDER;
      if (type === "percent") { vc.value = Number(v); vc.numFmt = "0%"; }
      else if (type === "hours") { vc.value = Number(v); vc.numFmt = '0.0" h"'; }
      else if (type === "date") { if (v) { vc.value = pd(v); vc.numFmt = "yyyy-mm-dd"; } }
      else vc.value = v;
      if (status && STATUS_FILL[status]) {
        vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[status].bg } };
        vc.font = { bold: true, color: { argb: STATUS_FILL[status].fg } };
      }
      const bc = r.getCell(3); bc.border = BORDER;
      if (type === "percent") { bc.value = bar(Number(v), 18); bc.font = { name: "Consolas", color: { argb: "FF6B2D8C" } }; }
    }
    const statusToWord = { Passed: "Completed", "In Progress": "In Progress", "Not Started": "Not Started" };

    // Exam dates come from the plan's exam tasks (see examInfo).
    function examRows(cat, statusWord) {
      const ex = data.certs.exams[cat];
      kv("Target Exam Date", ex ? ex.date : "—", null, ex ? "date" : undefined);
      kv("Actual Exam Date", ex && ex.completed ? ex.completedOn : "—", null, ex && ex.completed ? "date" : undefined);
      kv("Exam Status", statusWord, statusToWord[statusWord] || "Not Started");
    }

    section("AWS CERTIFIED AI PRACTITIONER");
    kv("Course Progress", data.certs.awsStats.pct, null, "percent");
    kv("Study Hours Completed", data.certs.awsStats.completedHours, null, "hours");
    kv("Practice Test Scores", "—  (log manually)");
    kv("Weak Topics", "—  (log manually)");
    examRows("aws", data.certs.aws);
    kv("Notes", "");

    ws.addRow([]);
    section("AWS CERTIFIED CLOUD PRACTITIONER  (CLF-C02)");
    kv("Course Progress", data.certs.awscpStats.pct, null, "percent");
    kv("Study Hours Completed", data.certs.awscpStats.completedHours, null, "hours");
    kv("Practice Test Scores", "—  (log manually)");
    kv("Weak Topics", "—  (log manually)");
    examRows("awscp", data.certs.awscp);
    kv("Notes", "");

    ws.addRow([]);
    section("COMPTIA SECURITY+  (SY0-701)");
    kv("Exam Version", "SY0-701");
    kv("Course Progress", data.certs.secStats.pct, null, "percent");
    kv("Exam Objective Domains", "1 General Security · 2 Threats/Vulns · 3 Architecture · 4 Operations · 5 Program Mgmt");
    kv("Study Hours Completed", data.certs.secStats.completedHours, null, "hours");
    kv("Practice Test Scores", "—  (log manually)");
    kv("Weak Topics", "—  (log manually)");
    examRows("secplus", data.certs.sec);
    kv("Notes", "");

    ws.addRow([]);
    // PortSwigger labs table
    const r = ws.addRow(["PORTSWIGGER WEB SECURITY ACADEMY"]);
    ws.mergeCells(`A${r.number}:C${r.number}`);
    r.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
    r.getCell(1).alignment = { indent: 1, vertical: "middle" }; r.height = 22;
    const ph = ws.addRow(["Topic / Lab", "Status", "Completion"]);
    ph.eachCell((c, n) => { if (n <= 3) { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }; c.border = BORDER; } });
    flatTasks().filter(x => x.t.category === "portswigger").sort((a, b) => a.day.date.localeCompare(b.day.date)).forEach(({ t }) => {
      const st = t.completed ? "Completed" : "Not Started";
      const rr = ws.addRow([cleanTitle(t.title), st, t.completed ? bar(1, 14) : bar(0, 14)]);
      rr.getCell(1).border = BORDER; rr.getCell(1).alignment = { wrapText: true };
      const sc = rr.getCell(2); sc.border = BORDER;
      sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[st].bg } };
      sc.font = { bold: true, color: { argb: STATUS_FILL[st].fg } };
      rr.getCell(3).font = { name: "Consolas", color: { argb: "FF6B2D8C" } }; rr.getCell(3).border = BORDER;
    });
    return ws;
  }

  // ⭐ NEW: Export Categories worksheet
  function writeCategories(wb, data) {
    const cats = (typeof window.getAllCategories === "function") ? window.getAllCategories() :
      (typeof BUILT_IN_CATEGORIES === "object" ? BUILT_IN_CATEGORIES : {});
    writeTable(wb, "Categories", [
      { header: "Category", key: "name", width: 20 },
      { header: "Icon", key: "icon", width: 6 },
      { header: "Color", key: "color", width: 12 },
      { header: "Weekly Target", key: "target", type: "hours", width: 13 },
      { header: "Priority", key: "priority", type: "int", width: 9 },
      { header: "Required", key: "required", width: 10 },
      { header: "Description", key: "description", width: 36, wrap: true },
      { header: "Archived", key: "archived", width: 10 },
      { header: "In Reports", key: "exportEnabled", width: 11 }
    ], Object.entries(cats).map(([id, cat]) => ({
      name: cat.name || id,
      icon: cat.icon || "✨",
      color: cat.color || "#ffffff",
      target: cat.weeklyTarget || 0,
      priority: cat.priority || cat.order || 99,
      required: cat.required ? "Yes" : "No",
      description: cat.description || "",
      archived: cat.archived ? "Yes" : "No",
      exportEnabled: cat.exportEnabled !== false ? "Yes" : "No"
    })), { tabColor: "FFE879F9" });
  }

  // ⭐ NEW: Export Extracurriculars worksheet
  function writeExtracurriculars(wb, data) {
    const extracurrs = (S().extracurriculars || []);
    if (extracurrs.length === 0) return;
    writeTable(wb, "Extracurriculars", [
      { header: "Activity", key: "name", width: 24, wrap: true },
      { header: "Role", key: "role", width: 20, wrap: true },
      { header: "Category", key: "category", width: 16 },
      { header: "Status", key: "status", width: 18 },
      { header: "Weekly Hours", key: "hours", type: "hours", width: 12 },
      { header: "Next Event/Deadline", key: "event", width: 26, wrap: true },
      { header: "Notes", key: "notes", width: 28, wrap: true }
    ], extracurrs.map(ec => ({
      name: ec.name,
      role: ec.role,
      category: ec.categoryId,
      status: ec.status,
      hours: ec.weeklyHours,
      event: ec.nextEvent || "TBD",
      notes: ec.notes || ""
    })), { tabColor: "FF86EFAC" });
  }

  // ⭐ NEW: Export Mentor Meetings worksheet
  function writeMentorMeetings(wb, data) {
    const mentorTasks = [];
    (S().days || []).forEach(day => {
      (day.tasks || []).forEach(t => {
        if (t.category === "mentor" && t.recurring) {
          mentorTasks.push({
            date: pd(day.date),
            dateStr: day.date,
            title: t.title,
            duration: t.duration,
            recurring: t.recurring,
            completed: t.completed ? "Yes" : "No"
          });
        }
      });
    });
    
    if (mentorTasks.length === 0) return;

    // Remove duplicates and summarize
    const summary = [];
    const seen = {};
    const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    mentorTasks.forEach(t => {
      const weekday = typeof t.recurring === "string"
        ? (t.recurring.includes("sunday") ? "sunday" : "monday")
        : WEEKDAY_NAMES[t.date.getDay()];
      const key = t.title + "|" + weekday;
      if (!seen[key]) {
        seen[key] = true;
        const freq = "Every " + weekday.charAt(0).toUpperCase() + weekday.slice(1);
        summary.push({
          frequency: freq,
          title: t.title,
          duration: t.duration,
          example: t.dateStr
        });
      }
    });
    
    writeTable(wb, "Mentor Meetings", [
      { header: "Frequency", key: "frequency", width: 18 },
      { header: "Meeting Name", key: "title", width: 32, wrap: true },
      { header: "Duration", key: "duration", type: "hours", width: 10 },
      { header: "Example Date", key: "example", type: "date", width: 13 }
    ], summary, { tabColor: "FFFBBF24" });
  }

  // ⭐ NEW: Export Palana Prep worksheet
  function writePalanaPrepSummary(wb, data) {
    const palanaTasks = [];
    (S().days || []).forEach(day => {
      if (day.date >= "2026-06-15" && day.date <= "2026-06-27") {
        (day.tasks || []).forEach(t => {
          if (t.category === "palana") {
            palanaTasks.push({
              date: pd(day.date),
              dateStr: day.date,
              title: t.title,
              duration: t.duration,
              completed: t.completed ? "✓" : ""
            });
          }
        });
      }
    });
    
    if (palanaTasks.length === 0) return;
    
    writeTable(wb, "Palana Prep (Jun 15-27)", [
      { header: "Date", key: "date", type: "date", width: 12 },
      { header: "Task", key: "title", width: 48, wrap: true },
      { header: "Hours", key: "duration", type: "hours", width: 8 },
      { header: "Completed", key: "completed", width: 10 }
    ], palanaTasks, { tabColor: "FFFF85A2" });
  }

  // ⭐ NEW: Export AHF Tasks worksheet
  function writeAHFTasks(wb, data) {
    const ahfTasks = [];
    // Whole plan, not just the summer.
    (S().days || []).forEach(day => {
      (day.tasks || []).forEach(t => {
        if (t.category === "ahf") {
          ahfTasks.push({
            date: pd(day.date),
            dateStr: day.date,
            title: t.title,
            duration: t.duration,
            completed: t.completed ? "✓" : "",
            status: t.completed ? "Done" : "Pending"
          });
        }
      });
    });
    
    if (ahfTasks.length === 0) return;
    
    writeTable(wb, "AHF Tasks", [
      { header: "Date", key: "date", type: "date", width: 12 },
      { header: "Task", key: "title", width: 40, wrap: true },
      { header: "Hours", key: "duration", type: "hours", width: 8 },
      { header: "Status", key: "status", type: "status", width: 12 },
      { header: "✓", key: "completed", width: 5 }
    ], ahfTasks, { tabColor: "FFFF758C" });
  }

  function writeTaskNotes(wb, data) {
    const notes = S().taskNotes || {};
    const rows = [];
    flatTasks().forEach(({ t, day }) => {
      const n = notes[t.id];
      if (!n) return;
      const note = typeof n === "string" ? { text: n } : n;
      if (!note.text && !note.plannedOutcome && !note.blockers) return;
      rows.push({
        task: t.title, date: pd(day.date), category: catLabel(t.category),
        notes: note.text || "", planned: note.plannedOutcome || "", actual: note.actualOutcome || "",
        learned: note.learned || "", blockers: note.blockers || "", nextStep: note.nextStep || "",
        links: note.links || "", updated: note.lastUpdated || ""
      });
    });
    if (rows.length === 0) return;
    writeTable(wb, "Task Notes", [
      { header: "Task", key: "task", width: 40, wrap: true },
      { header: "Date", key: "date", type: "date", width: 12 },
      { header: "Category", key: "category", width: 18 },
      { header: "Notes", key: "notes", width: 36, wrap: true },
      { header: "Planned Outcome", key: "planned", width: 24, wrap: true },
      { header: "Actual Outcome", key: "actual", width: 24, wrap: true },
      { header: "Learned", key: "learned", width: 20, wrap: true },
      { header: "Blockers", key: "blockers", width: 20, wrap: true },
      { header: "Next Step", key: "nextStep", width: 20, wrap: true },
      { header: "Links", key: "links", width: 30, wrap: true },
      { header: "Last Updated", key: "updated", width: 20 }
    ], rows, { tabColor: "FF94A3B8" });
  }

  function writeGitProjectRoadmap(wb, data) {
    const roadmap = (typeof GIT_PROJECT_ROADMAP !== "undefined") ? GIT_PROJECT_ROADMAP : [];
    if (!roadmap.length) return;
    const rows = [];
    roadmap.forEach(w => {
      w.tasks.forEach(t => {
        rows.push({
          week: w.week, label: w.label, task: t.title, owner: t.owner,
          duration: t.duration, travelFriendly: t.travelFriendly ? "Yes" : "No",
          deliverables: w.deliverables
        });
      });
    });
    writeTable(wb, "Git Project Roadmap", [
      { header: "Week", key: "week", type: "int", width: 7 },
      { header: "Phase", key: "label", width: 28, wrap: true },
      { header: "Task", key: "task", width: 44, wrap: true },
      { header: "Owner", key: "owner", width: 12 },
      { header: "Hours", key: "duration", type: "hours", width: 9 },
      { header: "Travel OK", key: "travelFriendly", width: 10 },
      { header: "Deliverables", key: "deliverables", width: 36, wrap: true }
    ], rows, { tabColor: "FFFFEA79" });

    const scheduled = [];
    flatTasks().filter(x => x.t.category === "github").forEach(({ t, day }) => {
      scheduled.push({
        date: pd(day.date), title: t.title, owner: t.owner || "",
        duration: t.duration, status: t.completed ? "Completed" : "Pending",
        week: t.projectWeek || ""
      });
    });
    if (scheduled.length) {
      writeTable(wb, "Git Project Ownership", [
        { header: "Date", key: "date", type: "date", width: 12 },
        { header: "Task", key: "title", width: 44, wrap: true },
        { header: "Owner", key: "owner", width: 12 },
        { header: "Hours", key: "duration", type: "hours", width: 9 },
        { header: "Week", key: "week", type: "int", width: 7 },
        { header: "Status", key: "status", type: "status", width: 12 }
      ], scheduled, { tabColor: "FFFDE047" });
    }
  }

  // AHF hours come from Settings → weekly target / 7; the plan's real daily
  // AHF durations are shown too when they differ.
  function ahfDailyLabel(st) {
    const target = Number(st.ahfWeeklyTarget) || 7;
    const durs = {};
    flatTasks().forEach(({ t }) => {
      if (t.category === "ahf" && /(_ahf|_x_ahf)$/.test(t.id)) durs[t.duration] = (durs[t.duration] || 0) + 1;
    });
    const seen = Object.keys(durs).sort((a, b) => durs[b] - durs[a]).map(d => d + " h").join(" / ");
    return round1(target / 7) + " h / day (weekly target " + target + " h)" + (seen ? " · scheduled: " + seen : "");
  }
  // Average scheduled LeetCode problems per calendar week, over the weeks that have any.
  function leetcodePaceLabel() {
    const weeks = {};
    flatTasks().forEach(({ t, day }) => {
      if (t.category === "leetcode") weeks[weekNumber(day.date)] = (weeks[weekNumber(day.date)] || 0) + 1;
    });
    const w = Object.keys(weeks);
    if (!w.length) return "(none scheduled)";
    const total = w.reduce((n, k) => n + weeks[k], 0);
    return "~" + Math.round(total / w.length) + " problems / week (" + total + " over " + w.length + " weeks)";
  }

  function writeSettings(wb) {
    const st = S().settings || {};
    const ws = wb.addWorksheet("Settings & Availability", {
      properties: { tabColor: { argb: "FF64748B" } },
      views: [{ state: "frozen", ySplit: 1 }]
    });
    ws.columns = [{ header: "Setting", width: 34 }, { header: "Value", width: 36 }];
    styleHeader(ws, 2);
    const rows = [
      ["Normal Daily Capacity", (st.maxNormalDailyHours || 8) + " h"],
      ["Travel-Day Capacity (India)", "2–3 h"],
      ["Maximum Daily Capacity", (st.maxNormalDailyHours || 8) + " h"],
      ["India Travel Dates", INDIA_S + "  →  " + INDIA_E],
      ["AHF Daily Hours", ahfDailyLabel(st)],
      ["Palana Enabled", st.palanaEnabled ? "Yes" : "No"],
      ["Palana Daily Hours", "Mon–Thu 1.5 h · Fri 2.0 h (prep window: up to 3 h)"],
      ["LeetCode Weekly Pace", leetcodePaceLabel()],
      ["Palana Security Role", st.palanaSecurityEnabled === false ? "Off" : "On"]
    ].concat(EXAM_CATS.map(c => {
      const ex = examInfo()[c];
      return [EXAM_NAME[c] + " Exam Date", ex ? ex.date + (ex.completed ? " (done)" : "") : "(none scheduled)"];
    })).concat([
      ["Selected Projects", (st.selectedProjects || []).join(", ") || "(none)"],
      ["Final Deadline", END],
      ["Schedule Version", String(st.scheduleVersion != null ? st.scheduleVersion : "—")],
      ["Last Rollover Day", st.lastRolloverDay || "(none)"],
      ["Export Timestamp", new Date().toLocaleString()]
    ]);
    rows.forEach((rr, idx) => {
      const r = ws.addRow(rr);
      r.getCell(1).font = { bold: true, color: { argb: "FF2A1240" } };
      r.getCell(1).border = BORDER; r.getCell(2).border = BORDER;
      r.getCell(2).alignment = { wrapText: true };
      if (idx % 2 === 1) {
        r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
        r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
      }
    });
    return ws;
  }

  // ── Filenames ──────────────────────────────────────────────────────────────
  function fileBase() {
    return "Cybersecurity_Study_Plan_" + fmt(new Date());
  }

  // ── Export meta (last export label) ────────────────────────────────────────
  function readMeta() {
    try { return JSON.parse(localStorage.getItem(EXPORT_META_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeMeta(patch) {
    const m = Object.assign(readMeta(), patch);
    try { localStorage.setItem(EXPORT_META_KEY, JSON.stringify(m)); } catch (e) {}
    updateLastExportLabel();
  }
  function updateLastExportLabel() {
    const el = document.getElementById("last-export-label");
    if (!el) return;
    const m = readMeta();
    if (m.lastExcel) {
      el.textContent = "Last Excel export: " + new Date(m.lastExcel).toLocaleString();
      el.classList.remove("muted-empty");
    } else {
      el.textContent = "Last Excel export: never";
      el.classList.add("muted-empty");
    }
  }

  // ── Public: Excel export ───────────────────────────────────────────────────
  // Demo mode (app.js): export is off, so no file of sample data can be
  // mistaken for a real report and no export bookkeeping is written.
  function inDemo() { return typeof window.isDemoMode === "function" && window.isDemoMode(); }

  async function exportExcel(opt) {
    if (inDemo()) return null;
    opt = normalizeOptions(opt);
    await ensureLibs();
    const data = gather(opt);
    const wb = await buildWorkbook(data);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveBlob(blob, fileBase() + ".xlsx");
    writeMeta({ lastExcel: isoTime() });
    if (typeof playSynthSound === "function") playSynthSound("success");
    return data;
  }

  // ── Public: CSV export (Full Schedule only) ────────────────────────────────
  async function exportCsv(opt) {
    if (inDemo()) return null;
    opt = normalizeOptions(opt);
    const data = gather(opt);
    const cols = [
      ["Date", "dateStr"], ["Day", "dow"], ["Week", "week"], ["Study Phase", "phase"],
      ["Task Name", "title"], ["Category", "category"], ["Planned Hours", "planned"],
      ["Completed Hours", "completed"], ["Remaining Hours", "remaining"], ["Priority", "priority"],
      ["Status", "status"], ["Original Date", _csvDate("originalDate")], ["Current Date", "dateStr"],
      ["Date Completed", _csvDate("completedDate")], ["Reschedule Count", "rescheduleCount"],
      ["Opt/Req", "optReq"], ["Resource", "resourceName"], ["Resource Link", "resourceLink"], ["Notes", "notes"]
    ];
    const header = cols.map(c => csvCell(c[0])).join(",");
    const lines = data.schedule.map(r =>
      cols.map(c => {
        const key = c[1];
        let v;
        if (typeof key === "function") v = key(r);
        else v = r[key];
        if (v instanceof Date) v = fmt(v);
        return csvCell(v);
      }).join(",")
    );
    const csv = "\uFEFF" + [header].concat(lines).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, fileBase() + ".csv");
    writeMeta({ lastCsv: isoTime() });
    if (typeof playSynthSound === "function") playSynthSound("click");
    return data;
  }
  function _csvDate(key) { return (r) => r[key] instanceof Date ? fmt(r[key]) : ""; }
  function csvCell(v) {
    if (v == null) return "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function fallbackDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  // ── Options normalization ──────────────────────────────────────────────────
  function normalizeOptions(opt) {
    opt = opt || {};
    return {
      scope: opt.scope || "full",
      rangeStart: opt.rangeStart || START,
      rangeEnd: opt.rangeEnd || END,
      includeAHF: opt.includeAHF !== false,
      includePalana: opt.includePalana !== false,
      includeLeetcode: opt.includeLeetcode !== false,
      includeOptional: opt.includeOptional !== false,
      includeAwsCp: opt.includeAwsCp !== false,
      includeJobApps: opt.includeJobApps !== false,
      includeInterviews: opt.includeInterviews !== false,
      includeHackathons: opt.includeHackathons !== false,
      includePortswigger: opt.includePortswigger === true,
      includeSkipped: opt.includeSkipped !== false,
      includeResources: opt.includeResources !== false,
      includeNotes: opt.includeNotes !== false
    };
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  function preview(opt) {
    opt = normalizeOptions(opt);
    _examCache = null;
    const rows = buildScheduleRows(opt);
    const plan = sheetPlan(opt);
    const sheetNames = [];
    if (plan.dashboard) sheetNames.push("Dashboard");
    if (plan.schedule) sheetNames.push("Full Schedule");
    if (plan.completed) sheetNames.push("Completed");
    if (plan.unfinished) sheetNames.push("Unfinished");
    if (plan.weekly) sheetNames.push("Weekly");
    if (plan.certs) sheetNames.push("Certifications");
    if (plan.leetcode) sheetNames.push("LeetCode 75");
    if (plan.projects) sheetNames.push("Projects");
    if (plan.resources) sheetNames.push("Resources");
    if (plan.settings) sheetNames.push("Settings");
    let planned = 0, completed = 0;
    rows.forEach(r => { planned += r.planned; completed += r.completed; });
    let dateRange = START + " → " + END;
    if (opt.scope === "week") { const w = weekWindow(exportPlanToday()); dateRange = w.ws + " → " + w.we; }
    if (opt.scope === "range") dateRange = opt.rangeStart + " → " + opt.rangeEnd;
    return { taskCount: rows.length, dateRange, sheets: sheetNames, planned: round1(planned), completed: round1(completed) };
  }

  // ── UI wiring ──────────────────────────────────────────────────────────────
  function readModalOptions() {
    const scopeEl = document.querySelector('input[name="export-scope"]:checked');
    const val = (id) => { const e = document.getElementById(id); return e ? e.checked : true; };
    return {
      scope: scopeEl ? scopeEl.value : "full",
      rangeStart: (document.getElementById("export-range-start") || {}).value || START,
      rangeEnd: (document.getElementById("export-range-end") || {}).value || END,
      includeAHF: val("opt-ahf"), includePalana: val("opt-palana"),
      includeLeetcode: val("opt-leetcode"), includeOptional: val("opt-optional"), includeSkipped: val("opt-skipped"),
      includeAwsCp: val("opt-awscp"), includeJobApps: val("opt-jobapps"),
      includeInterviews: val("opt-interviews"), includeHackathons: val("opt-hackathons"),
      includePortswigger: (document.getElementById("opt-portswigger") || {}).checked === true,
      includeResources: val("opt-resources"), includeNotes: val("opt-notes")
    };
  }

  function refreshPreview() {
    const p = preview(readModalOptions());
    const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    set("export-preview-tasks", p.taskCount + " tasks");
    set("export-preview-range", p.dateRange);
    set("export-preview-sheets", p.sheets.join(" · "));
    set("export-preview-hours", p.completed + " h done / " + p.planned + " h planned");
  }

  function openModal() {
    if (inDemo()) return;
    const m = document.getElementById("export-modal");
    const bd = document.getElementById("overlay-backdrop");
    if (!m) return;
    // default range inputs
    const rs = document.getElementById("export-range-start"); if (rs && !rs.value) rs.value = START;
    const re = document.getElementById("export-range-end"); if (re && !re.value) re.value = END;
    refreshPreview();
    m.classList.add("open");
    if (bd) bd.classList.add("active");
    if (typeof playSynthSound === "function") playSynthSound("click");
  }
  function closeModal() {
    const m = document.getElementById("export-modal");
    const bd = document.getElementById("overlay-backdrop");
    if (m) m.classList.remove("open");
    // only drop the backdrop if no other modal/drawer is open
    const other = document.querySelector(".modal.open, .day-drawer.open");
    if (bd && !other) bd.classList.remove("active");
  }

  // Disable a button briefly + show working state, then restore.
  async function withBusy(btn, label, fn) {
    const status = document.getElementById("export-status");
    let original;
    if (btn) { original = btn.innerHTML; btn.disabled = true; btn.classList.add("is-busy"); btn.innerHTML = label; }
    if (status) { status.textContent = "Generating workbook…"; status.className = "export-status working"; }
    try {
      await fn();
      if (status) { status.textContent = "✅ Download ready!"; status.className = "export-status ok"; }
    } catch (err) {
      console.error("[export] failed:", err);
      if (status) { status.textContent = "⚠️ Export failed: " + (err && err.message ? err.message : "unknown error") + ". Check your connection and try again."; status.className = "export-status err"; }
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove("is-busy"); btn.innerHTML = original; }
      setTimeout(() => { const s = document.getElementById("export-status"); if (s && s.classList.contains("ok")) { s.textContent = ""; s.className = "export-status"; } }, 4000);
    }
  }

  function wire() {
    updateLastExportLabel();

    const dashExcel = document.getElementById("dash-export-excel");
    const dashCsv = document.getElementById("dash-export-csv");
    const dashOptions = document.getElementById("dash-export-options");
    if (dashExcel) dashExcel.addEventListener("click", () => withBusy(dashExcel, "⏳ Building…", () => exportExcel(readModalOptions())));
    if (dashCsv) dashCsv.addEventListener("click", () => withBusy(dashCsv, "⏳ …", () => exportCsv(readModalOptions())));
    if (dashOptions) dashOptions.addEventListener("click", openModal);

    const doExcel = document.getElementById("export-do-excel");
    const doCsv = document.getElementById("export-do-csv");
    if (doExcel) doExcel.addEventListener("click", () => withBusy(doExcel, "⏳ Building workbook…", () => exportExcel(readModalOptions())));
    if (doCsv) doCsv.addEventListener("click", () => withBusy(doCsv, "⏳ …", () => exportCsv(readModalOptions())));

    const closeBtn = document.getElementById("export-close-btn");
    const cancelBtn = document.getElementById("export-cancel-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    // Close the export modal when the shared backdrop is clicked, and on Escape.
    const backdrop = document.getElementById("overlay-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const m = document.getElementById("export-modal");
        if (m && m.classList.contains("open")) closeModal();
      }
    });

    // live preview + range enable/disable
    document.querySelectorAll('input[name="export-scope"]').forEach(r => {
      r.addEventListener("change", () => {
        const checked = document.querySelector('input[name="export-scope"]:checked');
        const wrap = document.getElementById("export-range-wrap");
        if (wrap) wrap.classList.toggle("active", !!checked && checked.value === "range");
        refreshPreview();
        if (typeof playSynthSound === "function") playSynthSound("click");
      });
    });
    ["opt-ahf", "opt-palana", "opt-leetcode", "opt-optional", "opt-skipped", "opt-resources", "opt-notes",
     "opt-awscp", "opt-jobapps", "opt-interviews", "opt-hackathons", "opt-portswigger"]
      .forEach(id => { const e = document.getElementById(id); if (e) e.addEventListener("change", refreshPreview); });
    ["export-range-start", "export-range-end"].forEach(id => { const e = document.getElementById(id); if (e) e.addEventListener("change", refreshPreview); });
  }

  // Expose API
  window.CyberExport = { exportExcel, exportCsv, openModal, closeModal, refreshPreview, preview, updateLastExportLabel };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
