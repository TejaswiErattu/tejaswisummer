// Git Developer Productivity Tool — SUMMER roadmap (Tejaswi + Thanishka), history only
// Loaded before app.js; exposes GIT_PROJECT_ROADMAP and buildGitProjectTasksForDay()
//
// These dates are in the past and already completed, so they are deliberately
// NOT rescheduled. The roadmap is 8 numbered weeks over 11 calendar weeks:
//   - Weeks 1-3 run Jun 15 - Jul 5. Week 1 (Jun 15-21) and the first days of
//     Week 2 fall in the heavyPrep window (Jun 15-23, intensive Palana
//     onboarding prep): only the Monday planning meeting is generated there,
//     so Week 1 has no roadmap work items and no Wednesday DEADLINE (Jun 17).
//   - Week 3 (Jun 29 - Jul 5) falls entirely inside the India trip
//     (Jun 24 - Jul 8): only travelFriendly items are generated, capped at 0.5 h.
//   - Jul 6 - Jul 26 is an intentional gap (end of the trip + catch-up), so
//     Week 4 starts Jul 27. No day in the gap belongs to any week.
//   - Weeks 4-8 run Jul 27 - Aug 30.
// validateGitRoadmap() checks the table stays consistent (ordered,
// non-overlapping, 7-day weeks).
//
// From Sept 16 the plan's Git work is tracked by the dated "Git Developer
// Tool" project in plan-extension-2026.js (sessions tagged
// projectId "git_developer_tool", COMPLETE milestone Oct 4), not by this file.

const GIT_PROJECT_START = "2026-06-15";
// Cadence: Monday start-of-week planning, lead-up work on Mon/Tue, and a
// hard deliverable DEADLINE every Wednesday.
const GIT_PROJECT_MEETINGS = {
  planning: { dayOfWeek: 1, title: "Git Project: Start-of-week planning", duration: 0.75, owner: "shared" }
};

const GIT_PROJECT_ROADMAP = [
  {
    week: 1, label: "Problem definition & research", start: "2026-06-15", end: "2026-06-21",
    tasks: [
      { title: "Research Git pain points for beginners", duration: 1.0, owner: "tejaswi", travelFriendly: true },
      { title: "Draft problem statement & MVP scope", duration: 1.0, owner: "tejaswi", travelFriendly: true },
      { title: "Research VS Code Source Control, GitLens, GitHub Desktop", duration: 1.5, owner: "thanishka", travelFriendly: true },
      { title: "Create competitor comparison & user personas", duration: 1.0, owner: "thanishka", travelFriendly: true },
      { title: "Finalize MVP scope & set up GitHub repo", duration: 1.0, owner: "shared", travelFriendly: true },
      { title: "Create shared research/design folders", duration: 0.5, owner: "shared", travelFriendly: true }
    ],
    deliverables: "Problem statement, personas, competitor comparison, MVP scope, repo setup"
  },
  {
    week: 2, label: "UX & architecture", start: "2026-06-22", end: "2026-06-28",
    tasks: [
      { title: "Wireframe home, branch viz, NL assistant, warning modal", duration: 1.5, owner: "tejaswi", travelFriendly: true },
      { title: "Create main user journeys", duration: 1.0, owner: "tejaswi", travelFriendly: true },
      { title: "Research VS Code extension architecture", duration: 1.0, owner: "thanishka", travelFriendly: true },
      { title: "Draft command/UI/data/Git/validation layers", duration: 1.0, owner: "thanishka", travelFriendly: true },
      { title: "Review wireframes & create GitHub issues", duration: 1.0, owner: "shared", travelFriendly: true },
      { title: "Define sprint plan & completion criteria", duration: 0.5, owner: "shared", travelFriendly: true }
    ],
    deliverables: "Wireframes, user flows, architecture diagram, issue breakdown"
  },
  {
    week: 3, label: "Extension foundation", start: "2026-06-29", end: "2026-07-05",
    tasks: [
      { title: "Set up extension UI shell (panel/webview)", duration: 1.0, owner: "tejaswi", travelFriendly: false },
      { title: "Build base navigation, cards, empty states", duration: 1.0, owner: "tejaswi", travelFriendly: false },
      { title: "Register extension commands", duration: 1.0, owner: "thanishka", travelFriendly: true },
      { title: "Connect to local Git repo (branch, commits, changed files)", duration: 1.5, owner: "thanishka", travelFriendly: true },
      { title: "Test with sample repo & document setup", duration: 0.75, owner: "shared", travelFriendly: true }
    ],
    deliverables: "Running extension, repo connection, README setup"
  },
  {
    week: 4, label: "Branch & activity visualization", start: "2026-07-27", end: "2026-08-02",
    tasks: [
      { title: "Build branch list/cards & commit summaries", duration: 1.5, owner: "tejaswi", travelFriendly: false },
      { title: "Add activity sections & file-change indicators", duration: 1.0, owner: "tejaswi", travelFriendly: false },
      { title: "Data logic for branch/commit visualization", duration: 1.5, owner: "thanishka", travelFriendly: false },
      { title: "Build activity timeline", duration: 1.0, owner: "thanishka", travelFriendly: false },
      { title: "Test across repos & capture demo screenshots", duration: 0.75, owner: "shared", travelFriendly: true }
    ],
    deliverables: "Branch/activity screen, demo screenshots"
  },
  {
    week: 5, label: "Natural-language Git assistant", start: "2026-08-03", end: "2026-08-09",
    tasks: [
      { title: "Design assistant interaction & confirmation flow", duration: 1.5, owner: "tejaswi", travelFriendly: false },
      { title: "Build input/response UI with beginner-friendly messages", duration: 1.0, owner: "tejaswi", travelFriendly: false },
      { title: "Map user intent to Git actions (add, commit, push, pull, status, branch)", duration: 1.5, owner: "thanishka", travelFriendly: false },
      { title: "Add safety validation & uncertain-intent fallback", duration: 1.0, owner: "thanishka", travelFriendly: false },
      { title: "Build supported-phrase list & test prompts", duration: 0.75, owner: "shared", travelFriendly: true }
    ],
    deliverables: "NL input, command interpretation, confirmation flow"
  },
  {
    week: 6, label: "Secret detection & testing", start: "2026-08-10", end: "2026-08-16",
    tasks: [
      { title: "Design secret-warning experience", duration: 1.0, owner: "tejaswi", travelFriendly: false },
      { title: "Connect warning flow to Git assistant", duration: 1.0, owner: "tejaswi", travelFriendly: false },
      { title: "Detect API keys, tokens, credentials in staged files", duration: 1.5, owner: "thanishka", travelFriendly: false },
      { title: "Add automated tests & warning/block logic", duration: 1.5, owner: "thanishka", travelFriendly: false },
      { title: "Test with fake keys & write test plan", duration: 0.75, owner: "shared", travelFriendly: true }
    ],
    deliverables: "Secret detection, warning UI, automated tests"
  },
  {
    week: 7, label: "Debugging & refinement", start: "2026-08-17", end: "2026-08-23",
    tasks: [
      { title: "Merge-conflict guidance or activity-over-time view", duration: 1.5, owner: "tejaswi", travelFriendly: false },
      { title: "Improve onboarding & empty states", duration: 1.0, owner: "tejaswi", travelFriendly: false },
      { title: "Improve interface consistency & demo path", duration: 1.0, owner: "thanishka", travelFriendly: false },
      { title: "Run full bug bash & create demo repository", duration: 1.0, owner: "shared", travelFriendly: false }
    ],
    deliverables: "Fixed bugs, demo repo, polished UI"
  },
  {
    week: 8, label: "Final MVP & presentation", start: "2026-08-24", end: "2026-08-30",
    tasks: [
      { title: "Draft executive summary & product story", duration: 1.5, owner: "tejaswi", travelFriendly: true },
      { title: "Prepare presentation narrative", duration: 1.0, owner: "tejaswi", travelFriendly: true },
      { title: "Write system overview & setup documentation", duration: 1.5, owner: "thanishka", travelFriendly: true },
      { title: "Finalize repo structure & technical talking points", duration: 1.0, owner: "thanishka", travelFriendly: true },
      { title: "Rehearse demo, build slides, record backup demo", duration: 1.5, owner: "shared", travelFriendly: true }
    ],
    deliverables: "Final MVP, deck, README, demo script"
  }
];

function getGitWeekForDate(dateStr) {
  for (const w of GIT_PROJECT_ROADMAP) {
    if (dateStr >= w.start && dateStr <= w.end) return w;
  }
  return null;
}

function buildGitProjectTasksForDay(dateStr, dayOfWeek, isIndia) {
  if (dateStr < GIT_PROJECT_START) return [];
  const week = getGitWeekForDate(dateStr);
  if (!week) return [];

  const tasks = [];
  const ownerLabel = { tejaswi: "Tejaswi", thanishka: "Thanishka", shared: "Shared" };
  const heavyPrep = dateStr >= "2026-06-15" && dateStr <= "2026-06-23";

  // Monday: start-of-week planning meeting (fixed)
  if (dayOfWeek === GIT_PROJECT_MEETINGS.planning.dayOfWeek) {
    tasks.push({
      id: `${dateStr}_git_planning`,
      category: "github",
      title: GIT_PROJECT_MEETINGS.planning.title,
      duration: GIT_PROJECT_MEETINGS.planning.duration,
      completed: false,
      fixed: true,
      owner: GIT_PROJECT_MEETINGS.planning.owner,
      link: null,
      projectWeek: week.week
    });
  }

  // During intensive Palana prep, only the planning meeting (no roadmap work).
  if (heavyPrep) return tasks;

  // Lead-up work tasks: spread the week's roadmap items across Mon & Tue,
  // each as its own dated item leading up to the Wednesday deadline.
  const pool = week.tasks.filter(t => (isIndia ? t.travelFriendly : true));
  if ((dayOfWeek === 1 || dayOfWeek === 2) && pool.length) {
    const half = Math.ceil(pool.length / 2);
    const slice = dayOfWeek === 1 ? pool.slice(0, half) : pool.slice(half);
    slice.forEach((src, i) => {
      tasks.push({
        id: `${dateStr}_git_task_${i}`,
        category: "github",
        title: `[W${week.week}] ${src.title} (${ownerLabel[src.owner]})`,
        duration: isIndia ? Math.min(src.duration, 0.5) : src.duration,
        completed: false,
        owner: src.owner,
        travelFriendly: src.travelFriendly,
        link: null,
        projectWeek: week.week,
        deliverable: week.deliverables
      });
    });
  }

  // Wednesday: weekly deliverable DEADLINE.
  if (dayOfWeek === 3) {
    tasks.push({
      id: `${dateStr}_git_deadline`,
      category: "github",
      title: `[W${week.week}] DEADLINE — ${week.label}: ${week.deliverables}`,
      duration: 1.0,
      completed: false,
      fixed: true,
      owner: "shared",
      link: null,
      projectWeek: week.week,
      deliverable: week.deliverables,
      deadline: true
    });
  }

  return tasks;
}

// Returns a list of problems with GIT_PROJECT_ROADMAP (empty when consistent).
function validateGitRoadmap(roadmap) {
  const weeks = roadmap || GIT_PROJECT_ROADMAP;
  const issues = [];
  const DAY = 86400000;
  weeks.forEach((w, i) => {
    if (w.week !== i + 1) issues.push(`entry ${i} is numbered week ${w.week}`);
    if (!(w.start <= w.end)) issues.push(`week ${w.week} ends before it starts`);
    const span = Math.round((parseGitDate(w.end) - parseGitDate(w.start)) / DAY) + 1;
    if (span !== 7) issues.push(`week ${w.week} spans ${span} days`);
    if (new Date(parseGitDate(w.start)).getDay() !== 1) issues.push(`week ${w.week} doesn't start on a Monday`);
    if (!Array.isArray(w.tasks) || !w.tasks.length) issues.push(`week ${w.week} has no tasks`);
    if (i > 0 && !(weeks[i - 1].end < w.start)) issues.push(`week ${w.week} overlaps week ${weeks[i - 1].week}`);
  });
  return issues;
}

function parseGitDate(str) {
  const p = str.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
}
