// Sample data for "View demo" mode.
//
// buildDemoState(todayStr) returns a complete appState with the shape app.js
// expects, about 8 weeks of days centred on today. Every string in here is an
// invented, hardcoded constant: nothing is read from the URL, storage, the
// network or the real plan, and none of the real plan's categories, titles,
// links or dates are reused. Dates are computed from todayStr so the demo
// never goes stale.
//
// The state lives in memory only. See "DEMO MODE" in app.js for how it is
// entered and why it can never be saved or synced.

(function (root) {
  "use strict";

  var DAYS_BEFORE = 28;
  var DAYS_AFTER = 27;   // 28 + today + 27 = 56 days (8 weeks)

  var DEMO_CATEGORIES = [
    { id: "demo_reading",   name: "Reading",           icon: "📚", color: "#8be9fd", weeklyTarget: 4,   description: "Textbook chapters" },
    { id: "demo_practice",  name: "Practice sets",     icon: "✏️", color: "#ffb86c", weeklyTarget: 3.5, description: "Problem sets" },
    { id: "demo_portfolio", name: "Portfolio project", icon: "🛠️", color: "#c9a7ff", weeklyTarget: 6.5, description: "A sample long-running project" },
    { id: "demo_language",  name: "Language study",    icon: "🗣️", color: "#8ff0b0", weeklyTarget: 2,   description: "Lessons and vocabulary" },
    { id: "demo_fitness",   name: "Fitness",           icon: "🏃", color: "#ff9ad5", weeklyTarget: 2.25, description: "Movement breaks" },
    { id: "demo_group",     name: "Study group",       icon: "👥", color: "#ffe680", weeklyTarget: 1.5, description: "Weekly meetup" },
    { id: "demo_review",    name: "Weekly review",     icon: "🔁", color: "#a9c4ff", weeklyTarget: 1,   description: "Plan the week ahead" }
  ];

  var PORTFOLIO_STEPS = [
    "sketch the idea", "list requirements", "set up the workspace", "draft the outline",
    "build the first screen", "add sample content", "write the summary", "collect feedback",
    "revise the layout", "add a second section", "polish the wording", "check on a phone",
    "fix rough edges", "write the walkthrough", "record a short clip", "tidy the files",
    "add a contact page", "review accessibility", "trim the scope", "prepare the draft",
    "proofread everything", "plan the next version", "share with a friend", "archive notes"
  ];

  var READING_LINK = "https://example.com/reading-list";
  var PRACTICE_LINK = "https://example.com/practice-sets";

  // Sunday-first weekly rhythm. `n` picks which running counter numbers the title.
  var WEEK_TEMPLATE = [
    [ { cat: "demo_review", title: "Weekly review and planning", duration: 1 },
      { cat: "demo_language", title: "Vocabulary drill", n: "unit", duration: 0.5 } ],
    [ { cat: "demo_reading", title: "Read chapter", n: "chapter", duration: 1.5, link: READING_LINK },
      { cat: "demo_practice", title: "Practice set", n: "set", duration: 1, link: PRACTICE_LINK },
      { cat: "demo_fitness", title: "Morning run", duration: 0.5 } ],
    [ { cat: "demo_portfolio", title: "Portfolio project", n: "step", duration: 2 },
      { cat: "demo_language", title: "Language lesson", n: "unit", duration: 1 } ],
    [ { cat: "demo_reading", title: "Read chapter", n: "chapter", duration: 1.5, link: READING_LINK },
      { cat: "demo_group", title: "Study group meetup", duration: 1.5, fixed: true },
      { cat: "demo_practice", title: "Practice set", n: "set", duration: 1, link: PRACTICE_LINK } ],
    [ { cat: "demo_portfolio", title: "Portfolio project", n: "step", duration: 2 },
      { cat: "demo_fitness", title: "Strength session", duration: 0.75 } ],
    [ { cat: "demo_reading", title: "Read chapter", n: "chapter", duration: 1, link: READING_LINK },
      { cat: "demo_practice", title: "Practice set", n: "set", duration: 1.5, link: PRACTICE_LINK },
      { cat: "demo_language", title: "Vocabulary drill", n: "unit", duration: 0.5 } ],
    [ { cat: "demo_portfolio", title: "Portfolio project", n: "step", duration: 2.5 },
      { cat: "demo_fitness", title: "Long walk", duration: 1 } ]
  ];

  var DEMO_EXTRACURRICULARS = [
    { id: "demo_ec_books",  name: "Book club",        role: "Organizer", categoryId: "demo_reading", status: "active", weeklyHours: 2,   nextEvent: "Monthly discussion night", notes: "Sample commitment for the demo." },
    { id: "demo_ec_garden", name: "Community garden", role: "Volunteer", categoryId: "demo_fitness", status: "active", weeklyHours: 1.5, nextEvent: "Saturday planting shift",  notes: "" },
    { id: "demo_ec_chess",  name: "Chess club",       role: "Member",    categoryId: "demo_group",   status: "paused", weeklyHours: 1,   nextEvent: "Back next month",          notes: "" }
  ];

  // Static text swapped into the page while in demo mode (see applyDemoChrome()).
  var DEMO_COPY = {
    visitorName: "Demo visitor",
    logoLead: "DEMO //",
    logoAccent: "SAMPLE_STUDY_PLAN",
    exportUnavailable: "Export is not available in demo",
    ecNamePlaceholder: "e.g., Book club",
    ecRolePlaceholder: "e.g., Organizer",
    ecNextEventPlaceholder: "e.g., Monthly meetup",
    quotes: [
      "This is sample data. Click around, nothing is saved. ✨",
      "Small steps, every day. 🌱",
      "One chapter at a time. 📚",
      "Progress over perfection. 🌟",
      "Tick a box, feel the sparkle. ✅"
    ]
  };

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function addDays(dateStr, n) {
    var p = String(dateStr).split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }

  function dayOfWeek(dateStr) {
    var p = String(dateStr).split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }

  function titleFor(spec, counters) {
    if (!spec.n) return spec.title;
    var i = counters[spec.n]++;
    if (spec.n === "chapter") return spec.title + " " + (i + 1);
    if (spec.n === "set") return spec.title + " " + String.fromCharCode(65 + (i % 26));
    if (spec.n === "unit") return spec.title + ": unit " + (i + 1);
    return spec.title + ": " + PORTFOLIO_STEPS[i % PORTFOLIO_STEPS.length];
  }

  // Deterministic, so the demo looks the same on every visit: most past work is
  // done, a few items were missed, and the last week is a clean streak.
  function wasCompleted(offset, taskIndex) {
    if (offset >= -7) return true;
    return (Math.abs(offset) * 7 + taskIndex * 3) % 11 !== 0;
  }

  function buildDemoState(todayStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayStr || ""))) {
      var now = new Date();
      todayStr = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    }

    var counters = { chapter: 0, set: 0, unit: 0, step: 0 };
    var days = [];
    var taskNotes = {};
    var subtasksPlaced = false;

    for (var offset = -DAYS_BEFORE; offset <= DAYS_AFTER; offset++) {
      var date = addDays(todayStr, offset);
      var dow = dayOfWeek(date);
      var tasks = WEEK_TEMPLATE[dow].map(function (spec, i) {
        var task = {
          id: "demo_" + date + "_" + i,
          category: spec.cat,
          title: titleFor(spec, counters),
          duration: spec.duration,
          completed: false,
          source: "demo"
        };
        if (spec.link) task.link = spec.link;
        if (spec.fixed) task.fixed = true;

        if (offset < 0 && wasCompleted(offset, i)) {
          task.completed = true;
        } else if (offset === 0 && i === 0) {
          task.completed = true;
        }
        if (task.completed) {
          task.status = "done";
          task.completedOnDate = date;
        }

        if (!subtasksPlaced && offset >= 0 && !task.completed && spec.cat === "demo_portfolio") {
          subtasksPlaced = true;
          task.subtasks = [
            { title: "Gather materials", completed: true },
            { title: "Do the main work", completed: false },
            { title: "Write a short recap", completed: false }
          ];
        }
        return task;
      });

      if (offset === 10) {
        tasks.push({
          id: "demo_" + date + "_milestone",
          category: "demo_portfolio",
          title: "Portfolio project: publish first draft",
          duration: 1,
          completed: false,
          fixed: true,
          milestone: true,
          source: "demo"
        });
      }

      if (offset === 0 && tasks.length) {
        taskNotes[tasks[0].id] = {
          text: "Sample note. Notes stay attached to a task when it moves to another day.",
          plannedOutcome: "Finish the section and jot down questions.",
          actualOutcome: "Done, with two questions for the study group.",
          learned: "",
          blockers: "",
          nextStep: "Bring the questions to the next meetup.",
          links: "https://example.com/notes",
          lastUpdated: date + "T09:00:00.000Z"
        };
      }

      days.push({
        date: date,
        isIndia: false,   // field name the app expects for "light-load day"; always false here
        maxCapacity: (dow === 0 || dow === 6) ? 4 : 6,
        rolledOver: false,
        tasks: tasks
      });
    }

    var categories = {};
    DEMO_CATEGORIES.forEach(function (c, i) {
      categories[c.id] = {
        id: c.id, name: c.name, icon: c.icon, color: c.color,
        weeklyTarget: c.weeklyTarget, description: c.description,
        priority: i + 1, order: i + 1,
        exportEnabled: true, active: true, archived: false
      };
    });

    return {
      settings: {
        maxNormalDailyHours: 6,
        selectedProjects: [],
        lastRolloverDay: null,
        origin: "demo"
      },
      days: days,
      categories: categories,
      extracurriculars: DEMO_EXTRACURRICULARS.map(function (e) { return Object.assign({}, e); }),
      rescheduleLedger: {},
      taskNotes: taskNotes,
      archivedTasks: []
    };
  }

  root.buildDemoState = buildDemoState;
  root.DEMO_COPY = DEMO_COPY;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildDemoState: buildDemoState, DEMO_COPY: DEMO_COPY };
  }
})(typeof window !== "undefined" ? window : globalThis);
