// ============================================================================
// PLAN EXTENSION — Fall 2026 (Sept 3 → Dec 31, 2026)
//
// This file is ADDITIVE. It never calls generateBaseSchedule() and never
// rewrites an existing task. It follows the same one-shot, flag-gated,
// idempotent migration pattern as backfillJuneJulyCompleted() in app.js:
//
//   • New categories are merged into BUILT_IN_CATEGORIES.
//   • New dated projects are appended to TRACK_4_PROJECTS.
//   • extendPlanThroughDec2026() walks appState.days, appends days/tasks that
//     are missing, and NEVER clears a completed flag.
//
// Rule 0 (never lose completion state) is enforced structurally: every write
// path below either creates a brand-new task or sets completed = true. There
// is no code here that sets completed = false on an existing task.
// ============================================================================

(function () {
  "use strict";

  // ── 1. NEW CATEGORIES ─────────────────────────────────────────────────────
  // Existing keys (portswigger, aws, secplus, projects, leetcode, ahf, palana,
  // github, winfo, mentor) are left exactly as they are.
  const NEW_CATEGORIES_2026 = {
    awscp: {
      name: "AWS Cloud Practitioner",
      icon: "🌩️",
      color: "#7fd8ff",
      weeklyTarget: 8,
      priority: 16,
      required: true,
      description: "AWS Certified Cloud Practitioner (CLF-C02) exam prep"
    },
    jobapps: {
      name: "Job Applications",
      icon: "📮",
      color: "#ffc48c",
      weeklyTarget: 10,
      priority: 17,
      required: true,
      description: "Daily job application batches"
    },
    interviews: {
      name: "Interviews",
      icon: "🎤",
      color: "#b9f6a5",
      weeklyTarget: 2,
      priority: 18,
      required: false,
      description: "Interview scheduling, prep and debriefs"
    },
    hackathons: {
      name: "Hackathons",
      icon: "⚡",
      color: "#ff9ff3",
      weeklyTarget: 0,
      priority: 19,
      required: false,
      description: "Hackathon events and the prep leading into them"
    }
  };

  if (typeof BUILT_IN_CATEGORIES === "object" && BUILT_IN_CATEGORIES) {
    Object.entries(NEW_CATEGORIES_2026).forEach(([id, def]) => {
      if (!BUILT_IN_CATEGORIES[id]) BUILT_IN_CATEGORIES[id] = def;
    });
  }
  window.NEW_CATEGORIES_2026 = NEW_CATEGORIES_2026;

  // ── 2. DATE CONSTANTS ─────────────────────────────────────────────────────
  const EXT_BACKFILL_START = "2026-09-03";   // completed backfill window start
  const EXT_BACKFILL_END   = "2026-09-15";   // completed backfill window end
  const EXT_FORWARD_START  = "2026-09-16";   // forward plan (all unchecked)
  const EXT_FORWARD_END    = "2026-12-31";
  const AUGUST_START       = "2026-08-01";
  const AUGUST_END         = "2026-08-31";

  const SECPLUS_EXAM_SCHEDULED = "2026-09-18"; // Fri
  const AWSCP_STUDY_END        = "2026-09-26"; // last daily study day
  const AWSCP_REVIEW_DAYS      = ["2026-09-27", "2026-09-28", "2026-09-29"];
  const AWSCP_EXAM_DATE        = "2026-09-30"; // Wed
  const SECPLUS_STUDY_LAST     = "2026-09-17";

  const THREAT_MODEL_START = "2026-09-16";
  const THREAT_MODEL_LAST  = "2026-09-25";
  const THREAT_MODEL_DUE   = "2026-09-26"; // Sat

  const GIT_SESSION_START = "2026-09-16";
  const GIT_SESSION_LAST  = "2026-10-03"; // last Mon/Wed/Sat before the milestone
  const GIT_COMPLETE_DATE = "2026-10-04"; // Sun — hard milestone, 1 week pre-DubHacks

  const PALANA_PRIVACY_POLICY_DATE = "2026-09-18";
  const PALANA_PLANNING_DATE       = "2026-09-28";
  const PALANA_CYCLE_RESTART       = "2026-10-05"; // Mon — weekly cycle through Dec 31

  const MENTOR_TUESDAY_START = "2026-09-22";
  const PERSONAL_SITE_DATE   = "2026-09-17";
  const INTERVIEW_CHECK_START = "2026-09-20"; // Sundays
  const INTERVIEW_CHECK_SKIP  = ["2026-10-11"]; // DubHacks

  const HACKATHONS_2026 = [
    { id: "sec_hack",  name: "Security Hackathon", date: "2026-09-26" },
    { id: "kiro_hack", name: "Kiro Hackathon",     date: "2026-09-28", projectId: "kiro_project" },
    { id: "dubhacks",  name: "DubHacks",           date: "2026-10-11" }
  ];

  // WINFO sponsorship outreach — explicit dates first, then ~2x/week after.
  const WINFO_OUTREACH_EXPLICIT = [
    "2026-09-18", "2026-09-22", "2026-09-25", "2026-09-29",
    "2026-10-02", "2026-10-06", "2026-10-09"
  ];
  const WINFO_OUTREACH_ROLLING_START = "2026-10-12"; // Tue/Fri from here on

  const AHF_MILESTONES = [
    { date: "2026-09-19", title: "AHF: Get Cale into the admin side (he has no access yet)", duration: 1.0, milestone: true },
    { date: "2026-09-20", title: "AHF: Check in with Roslyn on the task management site", duration: 1.0, milestone: true },
    { date: "2026-09-30", title: "AHF: Task management site LIVE ROLLOUT", duration: 3.0, milestone: true }
  ];
  const AHF_ROSLYN_WINDOW = { start: "2026-09-21", end: "2026-09-28" };
  const AHF_OCT_WEEK      = { start: "2026-10-01", end: "2026-10-07" };

  // ── 3. DATED TRACK 4 PROJECTS ─────────────────────────────────────────────
  // Appended to TRACK_4_PROJECTS. The five original summer projects are left
  // untouched (same ids, same order, same completion state).
  const TRACK_4_DATED_PROJECTS = [
    {
      id: "threat_modeling_project",
      name: "Threat Modeling Project",
      desc: "End-to-end threat model: system decomposition, STRIDE analysis, attack trees, mitigations and a written report.",
      totalHours: 20,
      dueDate: THREAT_MODEL_DUE,
      dated: true,
      category: "projects",
      tasks: [
        { name: "Threat Model: Scope the system & draw data-flow diagrams", duration: 3 },
        { name: "Threat Model: Trust boundaries & asset inventory", duration: 3 },
        { name: "Threat Model: STRIDE pass over each component", duration: 4 },
        { name: "Threat Model: Attack trees for the top 3 risks", duration: 3 },
        { name: "Threat Model: Mitigations & residual-risk ranking", duration: 4 },
        { name: "Threat Model: Write up the final report & present findings", duration: 3 }
      ]
    },
    {
      id: "git_developer_tool",
      name: "Git Developer Tool",
      desc: "Developer productivity tool for Git (with Thanishka). Must be finished one week before DubHacks.",
      totalHours: 18,
      dueDate: GIT_COMPLETE_DATE,
      dated: true,
      category: "github",
      tasks: [
        { name: "Git Tool: Lock the feature set & cut remaining scope", duration: 3 },
        { name: "Git Tool: Finish the core command surface", duration: 4 },
        { name: "Git Tool: Error handling & edge cases", duration: 3 },
        { name: "Git Tool: Tests and CI", duration: 3 },
        { name: "Git Tool: README, install docs & demo recording", duration: 3 },
        { name: "Git Tool: Final polish & v1.0 release", duration: 2 }
      ]
    },
    {
      id: "kiro_project",
      name: "Kiro Project",
      desc: "Project built for the Kiro Hackathon on Sept 28, 2026.",
      totalHours: 12,
      dueDate: "2026-09-28",
      dated: true,
      category: "hackathons",
      tasks: [
        { name: "Kiro Project: Pick the idea & sketch the architecture", duration: 2 },
        { name: "Kiro Project: Scaffold the repo & environment", duration: 2 },
        { name: "Kiro Project: Build the core feature", duration: 4 },
        { name: "Kiro Project: Demo script & submission materials", duration: 2 },
        { name: "Kiro Project: Hackathon day build & submit", duration: 2 }
      ]
    }
  ];

  if (typeof TRACK_4_PROJECTS !== "undefined" && Array.isArray(TRACK_4_PROJECTS)) {
    TRACK_4_DATED_PROJECTS.forEach(p => {
      if (!TRACK_4_PROJECTS.some(existing => existing.id === p.id)) {
        TRACK_4_PROJECTS.push(p);
      }
    });
  }
  window.TRACK_4_DATED_PROJECTS = TRACK_4_DATED_PROJECTS;

  // ── 4. EXAM REGISTRY (drives the EXAM_STATUSES card) ──────────────────────
  const EXAM_REGISTRY = [
    { key: "aws",      badgeId: "badge-aws",      label: "AWS AI Prac",    category: "aws",      date: null,                   dateLabel: "Completed" },
    { key: "secplus",  badgeId: "badge-secplus",  label: "CompTIA Sec+",   category: "secplus",  date: SECPLUS_EXAM_SCHEDULED, dateLabel: "Scheduled Sep 18, 2026" },
    { key: "awscp",    badgeId: "badge-awscp",    label: "AWS Cloud Prac", category: "awscp",    date: AWSCP_EXAM_DATE,        dateLabel: "Scheduled Sep 30, 2026" }
  ];
  window.EXAM_REGISTRY = EXAM_REGISTRY;

  // ── 5. SMALL HELPERS ──────────────────────────────────────────────────────
  const pd = (s) => { const p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dow = (s) => pd(s).getDay(); // 0 = Sun
  const inRange = (s, a, b) => s >= a && s <= b;

  function eachDate(startStr, endStr, fn) {
    const end = pd(endStr);
    for (let c = pd(startStr); c <= end; c.setDate(c.getDate() + 1)) fn(fmt(c));
  }

  function addDaysStr(dateStr, n) {
    const d = pd(dateStr);
    d.setDate(d.getDate() + n);
    return fmt(d);
  }

  // Capacity mirrors app.js's getBaseCapacityForDay so new days look native.
  function capacityFor(dateStr) {
    if (typeof getBaseCapacityForDay === "function") {
      const maxNormal = (appState.settings && appState.settings.maxNormalDailyHours) || 8;
      return getBaseCapacityForDay(dateStr, maxNormal);
    }
    const d = dow(dateStr);
    if (d === 0) return 2.0;
    if (d === 6) return 4.0;
    if (d === 2 || d === 4) return 6.0;
    return 8.0;
  }

  // Ensure a day object exists for dateStr; returns it. Never touches tasks.
  function ensureDay(dateStr) {
    let day = appState.days.find(d => d.date === dateStr);
    if (!day) {
      day = {
        date: dateStr,
        isIndia: false,
        maxCapacity: capacityFor(dateStr),
        tasks: [],
        rolledOver: false
      };
      appState.days.push(day);
    }
    if (!Array.isArray(day.tasks)) day.tasks = [];
    return day;
  }

  // All extension task ids are namespaced with "_x_" so they can never collide
  // with ids generated by app.js (_ahf_, _leetcode_, _msoa_, _sec_exam, …).
  function extId(dateStr, slug) { return `${dateStr}_x_${slug}`; }

  // Append a task only if that exact id isn't already on the day. Returning the
  // existing task untouched is what makes this migration safe to re-run.
  function addTask(day, spec) {
    const existing = day.tasks.find(t => t.id === spec.id);
    if (existing) return existing;
    const task = Object.assign({
      category: "custom",
      title: "",
      duration: 1,
      completed: false,
      link: null,
      planExtension: true
    }, spec);
    day.tasks.push(task);
    return task;
  }

  // Mark a task complete. Only ever sets completed = true.
  function markComplete(task, dateStr, nowIso) {
    if (task.completed) return;
    task.completed = true;
    task.completedOnDate = task.completedOnDate || dateStr;
    task.completedAt = task.completedAt || nowIso;
    task.status = "done";
    task.completedMinutes = Math.round((task.duration || 0) * 60);
    task.remainingMinutes = 0;
    if (Array.isArray(task.subtasks)) task.subtasks.forEach(st => { st.completed = true; });
  }

  function jobAppsTask(dateStr) {
    return {
      id: extId(dateStr, "jobapps"),
      category: "jobapps",
      title: "Job applications (5 today)",
      duration: 1.5,
      fixed: true,
      subtasks: [1, 2, 3, 4, 5].map(n => ({
        id: extId(dateStr, `jobapps_${n}`),
        title: `Application ${n}`,
        completed: false
      }))
    };
  }

  // LeetCode cycles Blind 75 so the LEETCODE_BLIND_75 metric keeps counting.
  let _lcCursor = 0;
  function leetcodeTask(dateStr) {
    const bank = (typeof BLIND_75_QUESTIONS !== "undefined" && BLIND_75_QUESTIONS.length)
      ? BLIND_75_QUESTIONS : null;
    if (!bank) {
      return {
        id: extId(dateStr, "leetcode"),
        category: "leetcode",
        title: "LeetCode Blind 75 Problem",
        duration: 0.75,
        fixed: true,
        link: "https://neetcode.io/practice/practice/blind75",
        leetcodeId: 0
      };
    }
    const q = bank[_lcCursor % bank.length];
    _lcCursor++;
    return {
      id: extId(dateStr, "leetcode"),
      category: "leetcode",
      title: `LeetCode Blind 75: #${q.id} - ${q.name}`,
      duration: 0.75,
      fixed: true,
      link: q.link,
      leetcodeId: q.id
    };
  }

  // ── 6. BACKFILL: Sept 3 → Sept 15, all COMPLETE ───────────────────────────
  function buildBackfillDay(dateStr) {
    const day = ensureDay(dateStr);
    const isFirstWeek = dateStr <= "2026-09-07"; // Sept 3–7 only

    addTask(day, { id: extId(dateStr, "secplus"), category: "secplus", title: "CompTIA Security+ study", duration: 2.0, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" });
    addTask(day, jobAppsTask(dateStr));
    addTask(day, { id: extId(dateStr, "awscp"), category: "awscp", title: "AWS Cloud Practitioner study", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" });
    addTask(day, { id: extId(dateStr, "github"), category: "github", title: "Git developer tool work", duration: 2.0 });
    addTask(day, { id: extId(dateStr, "threatmodel"), category: "projects", title: "Threat modeling project", duration: 2.0, projectId: "threat_modeling_project" });

    if (isFirstWeek) {
      addTask(day, { id: extId(dateStr, "palana"), category: "palana", title: "Palana contract work", duration: 2.0 });
      addTask(day, { id: extId(dateStr, "winfo"), category: "winfo", title: "WINFO budgeting", duration: 1.0 });
    }
    return day;
  }

  const BACKFILL_INTERVIEWS = [
    { date: "2026-09-04", title: "Interview" },
    { date: "2026-09-09", title: "Interview" },
    { date: "2026-09-12", title: "Interview" }
  ];

  // ── 7. FORWARD PLAN: Sept 16 → Dec 31, all UNCHECKED ──────────────────────
  function buildForwardDay(dateStr) {
    const day = ensureDay(dateStr);
    const d = dow(dateStr);

    // --- Daily recurring, every single day ---
    addTask(day, jobAppsTask(dateStr));
    addTask(day, leetcodeTask(dateStr));
    addTask(day, { id: extId(dateStr, "ahf"), category: "ahf", title: "AHF work (tech lead duties)", duration: 1.5, fixed: true });

    // --- AWS Cloud Practitioner: daily study → 3 review days → exam ---
    if (dateStr <= AWSCP_STUDY_END) {
      addTask(day, { id: extId(dateStr, "awscp"), category: "awscp", title: "AWS Cloud Practitioner study", duration: 1.5, fixed: true, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" });
    } else if (AWSCP_REVIEW_DAYS.includes(dateStr)) {
      const n = AWSCP_REVIEW_DAYS.indexOf(dateStr) + 1;
      addTask(day, { id: extId(dateStr, `awscp_review_${n}`), category: "awscp", title: `AWS CP review day ${n}`, duration: 3.0, fixed: true, link: "https://tutorialsdojo.com/aws-cloud-practitioner-clf-c02-exam-guide/" });
    } else if (dateStr === AWSCP_EXAM_DATE) {
      addTask(day, { id: extId(dateStr, "awscp_exam"), category: "awscp", title: "AWS Certified Cloud Practitioner Certification Exam", duration: 2.5, fixed: true, milestone: true, link: "https://aws.amazon.com/certification/certified-cloud-practitioner/" });
    }
    // After Sept 30: no more awscp tasks.

    // --- Security+: study Sept 16–17, exam Fri Sept 18, then stop ---
    if (dateStr <= SECPLUS_STUDY_LAST) {
      addTask(day, { id: extId(dateStr, "secplus"), category: "secplus", title: "CompTIA Security+ final review", duration: 2.5, fixed: true, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" });
    } else if (dateStr === SECPLUS_EXAM_SCHEDULED) {
      addTask(day, { id: extId(dateStr, "secplus_exam"), category: "secplus", title: "CompTIA Security+ SY0-701 Certification Exam", duration: 2.5, fixed: true, milestone: true, link: "https://www.comptia.org/certifications/security" });
    }

    // --- Threat modeling project: daily Sept 16–25, DUE Sat Sept 26 ---
    if (inRange(dateStr, THREAT_MODEL_START, THREAT_MODEL_LAST)) {
      addTask(day, { id: extId(dateStr, "threatmodel"), category: "projects", title: "Threat modeling project work block", duration: 2.0, fixed: true, projectId: "threat_modeling_project" });
    } else if (dateStr === THREAT_MODEL_DUE) {
      addTask(day, { id: extId(dateStr, "threatmodel_due"), category: "projects", title: "DUE: Threat Modeling Project", duration: 1.0, fixed: true, milestone: true, projectId: "threat_modeling_project" });
    }

    // --- Git developer tool: Mon / Wed / Sat through Oct 3, COMPLETE Oct 4 ---
    if (inRange(dateStr, GIT_SESSION_START, GIT_SESSION_LAST) && (d === 1 || d === 3 || d === 6)) {
      addTask(day, { id: extId(dateStr, "github"), category: "github", title: "Git developer tool session", duration: 2.5, fixed: true, projectId: "git_developer_tool" });
    }
    if (dateStr === GIT_COMPLETE_DATE) {
      addTask(day, { id: extId(dateStr, "github_complete"), category: "github", title: "MILESTONE: Git Developer Tool COMPLETE (one week to DubHacks)", duration: 2.0, fixed: true, milestone: true, projectId: "git_developer_tool" });
    }

    // --- Hackathons: the event, plus prep on the 2 preceding days ---
    HACKATHONS_2026.forEach(h => {
      if (dateStr === h.date) {
        addTask(day, { id: extId(dateStr, `hack_${h.id}`), category: "hackathons", title: `${h.name} — event day`, duration: 8.0, fixed: true, milestone: true, hackathonId: h.id, projectId: h.projectId || null });
      } else if (dateStr === addDaysStr(h.date, -1) || dateStr === addDaysStr(h.date, -2)) {
        const n = dateStr === addDaysStr(h.date, -2) ? 1 : 2;
        addTask(day, { id: extId(dateStr, `hackprep_${h.id}_${n}`), category: "hackathons", title: `${h.name} prep (${n} of 2)`, duration: 1.5, fixed: true, hackathonId: h.id, projectId: h.projectId || null });
      }
    });

    // --- AHF milestones & windows ---
    AHF_MILESTONES.forEach((m, i) => {
      if (dateStr === m.date) {
        addTask(day, { id: extId(dateStr, `ahf_ms_${i}`), category: "ahf", title: m.title, duration: m.duration, fixed: true, milestone: true });
      }
    });
    if (inRange(dateStr, AHF_ROSLYN_WINDOW.start, AHF_ROSLYN_WINDOW.end)) {
      addTask(day, { id: extId(dateStr, "ahf_roslyn"), category: "ahf", title: "AHF: Apply Roslyn's feedback to the task management site", duration: 1.5, fixed: true });
    }
    if (inRange(dateStr, AHF_OCT_WEEK.start, AHF_OCT_WEEK.end)) {
      addTask(day, { id: extId(dateStr, "ahf_passwordless"), category: "ahf", title: "AHF: Set up passwordless authentication", duration: 1.5, fixed: true });
      addTask(day, { id: extId(dateStr, "ahf_informatics"), category: "ahf", title: "AHF: Learn Informatics website updates", duration: 1.0, fixed: true });
    }

    // --- Palana: one-off privacy policy, planning block, then weekly cycle ---
    if (dateStr === PALANA_PRIVACY_POLICY_DATE) {
      addTask(day, { id: extId(dateStr, "palana_privacy"), category: "palana", title: "Update the Palana privacy policy", duration: 2.0, fixed: true });
    }
    if (dateStr === PALANA_PLANNING_DATE) {
      addTask(day, { id: extId(dateStr, "palana_plan"), category: "palana", title: "Plan Palana scope for October through December", duration: 1.5, fixed: true, milestone: true });
    }
    if (dateStr >= PALANA_CYCLE_RESTART) {
      const PALANA_WEEK = {
        1: { slug: "threatmodel_a", title: "Palana: threat model work", duration: 2.0 },
        2: { slug: "threatmodel_b", title: "Palana: threat model work", duration: 2.0 },
        3: { slug: "pentest_a",     title: "Palana: pen test",          duration: 2.5 },
        4: { slug: "pentest_b",     title: "Palana: pen test",          duration: 2.5 },
        5: { slug: "docs",          title: "Palana: documentation",     duration: 1.5 }
      };
      const p = PALANA_WEEK[d];
      if (p) {
        addTask(day, { id: extId(dateStr, `palana_${p.slug}`), category: "palana", title: p.title, duration: p.duration, fixed: true });
      }
    }

    // --- WINFO: sprinkled sponsorship outreach + two concrete budget steps ---
    const isRollingOutreach = dateStr >= WINFO_OUTREACH_ROLLING_START && (d === 2 || d === 5);
    if (WINFO_OUTREACH_EXPLICIT.includes(dateStr) || isRollingOutreach) {
      addTask(day, { id: extId(dateStr, "winfo_outreach"), category: "winfo", title: "WINFO: sponsorship outreach", duration: 1.0, fixed: true });
    }
    if (dateStr === "2026-09-21") {
      addTask(day, { id: extId(dateStr, "winfo_budget_pull"), category: "winfo", title: "WINFO budget: pull current numbers and list what changed", duration: 1.5, fixed: true });
    }
    if (dateStr === "2026-09-24") {
      addTask(day, { id: extId(dateStr, "winfo_budget_send"), category: "winfo", title: "WINFO budget: update the sheet and send it out for review", duration: 1.5, fixed: true });
    }

    // --- Interviews: weekly Sunday check (Oct 11 skipped for DubHacks) ---
    if (d === 0 && dateStr >= INTERVIEW_CHECK_START && !INTERVIEW_CHECK_SKIP.includes(dateStr)) {
      addTask(day, { id: extId(dateStr, "interview_check"), category: "interviews", title: "Check for upcoming interviews and prep any that are scheduled", duration: 1.0, fixed: true });
    }

    // --- Mentor: Matt meeting moved Mon → Tue, with a Monday prep block ---
    if (d === 2 && dateStr >= MENTOR_TUESDAY_START) {
      addTask(day, { id: extId(dateStr, "mentor_matt"), category: "mentor", title: "Mentor meeting with Matt", duration: 1.0, fixed: true, recurring: true });
    }
    if (d === 1 && dateStr >= "2026-09-21") {
      addTask(day, { id: extId(dateStr, "mentor_prep"), category: "mentor", title: "Prep for Matt meeting: review what I committed to last time", duration: 0.5, fixed: true, recurring: true });
    }

    // --- One-off: personal website ---
    if (dateStr === PERSONAL_SITE_DATE) {
      addTask(day, { id: extId(dateStr, "personal_site"), category: "projects", title: "Personal website update", duration: 2.0, fixed: true });
    }

    return day;
  }

  // ── 8. THE MIGRATION ──────────────────────────────────────────────────────
  const EXTENSION_VERSION = 1;

  function extendPlanThroughDec2026(force) {
    if (typeof appState !== "object" || !appState) return false;
    appState.settings = appState.settings || {};
    if (!Array.isArray(appState.days)) return false;
    if (!force && appState.settings.planExtensionFallV1 === EXTENSION_VERSION) {
      // Already applied. Still re-run the marking passes below is unnecessary —
      // they are idempotent but pure cost. Bail out.
      return false;
    }

    const nowIso = new Date().toISOString();
    _lcCursor = 0;

    // (a) Rule 1 — every task on every day in August 2026 reads as complete.
    //     Days with no tasks are left empty; nothing is invented.
    appState.days.forEach(day => {
      if (!inRange(day.date, AUGUST_START, AUGUST_END)) return;
      day.tasks.forEach(t => markComplete(t, day.date, nowIso));
    });

    // (b) Rule 2 — PortSwigger (Track 1) is retired. Marking every task
    //     complete both records the track as done and drops it out of every
    //     "remaining work" counter, while keeping the rows for history.
    appState.days.forEach(day => {
      day.tasks.forEach(t => {
        if (t.category === "portswigger") {
          t.retired = true;
          markComplete(t, day.date, nowIso);
        }
      });
    });
    appState.settings.portswiggerRetired = true;

    // (c) Backfill Sept 3 → Sept 15, all complete.
    eachDate(EXT_BACKFILL_START, EXT_BACKFILL_END, dateStr => {
      buildBackfillDay(dateStr);
    });
    BACKFILL_INTERVIEWS.forEach(iv => {
      const day = ensureDay(iv.date);
      addTask(day, { id: extId(iv.date, "interview"), category: "interviews", title: iv.title, duration: 1.5 });
    });
    eachDate(EXT_BACKFILL_START, EXT_BACKFILL_END, dateStr => {
      const day = appState.days.find(d => d.date === dateStr);
      if (day) day.tasks.forEach(t => markComplete(t, dateStr, nowIso));
    });

    // (d) Forward plan Sept 16 → Dec 31. Nothing here is pre-checked.
    eachDate(EXT_FORWARD_START, EXT_FORWARD_END, dateStr => {
      buildForwardDay(dateStr);
    });

    // (e) Keep days chronological so the calendar and streak logic stay sane.
    appState.days.sort((a, b) => a.date.localeCompare(b.date));

    appState.settings.planExtensionFallV1 = EXTENSION_VERSION;
    if (typeof saveState === "function") saveState();
    return true;
  }

  // ── 9. QUERY HELPERS used by the UI ───────────────────────────────────────
  function isPortswiggerRetired() {
    return !!(appState && appState.settings && appState.settings.portswiggerRetired);
  }

  // A task is "surfaceable" in the daily checklist / remaining counters if it
  // isn't from a retired track.
  function isSurfacedTask(t) {
    if (!t) return false;
    if (t.category === "portswigger" && isPortswiggerRetired()) return false;
    return true;
  }

  // Days where a hard deadline collides with other heavy work.
  const HEAVY_DAYS = {
    "2026-09-26": "Threat Modeling Project DUE + Security Hackathon",
    "2026-09-28": "Kiro Hackathon + AWS CP review day 2"
  };
  function heavyDayReason(dateStr) { return HEAVY_DAYS[dateStr] || null; }

  // Progress for a dated TRACK_4 project, derived from tagged tasks.
  function datedProjectProgress(projectId) {
    let total = 0, done = 0;
    (appState.days || []).forEach(day => {
      day.tasks.forEach(t => {
        if (t.projectId !== projectId) return;
        total++;
        if (t.completed) done++;
      });
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  window.extendPlanThroughDec2026 = extendPlanThroughDec2026;
  window.isPortswiggerRetired = isPortswiggerRetired;
  window.isSurfacedTask = isSurfacedTask;
  window.heavyDayReason = heavyDayReason;
  window.HEAVY_DAYS = HEAVY_DAYS;
  window.datedProjectProgress = datedProjectProgress;
  window.EXT_FORWARD_END = EXT_FORWARD_END;
})();
