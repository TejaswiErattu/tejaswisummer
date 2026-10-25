// Cybersecurity Study Plan - Core Scheduler & UI Engine

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function safeUrl(url) {
  try {
    const u = String(url ?? "").trim();
    if (/^(https?|mailto):/i.test(u)) return u;
  } catch (e) {}
  return "#";
}

const MOTIVATIONAL_QUOTES = [
  "Hacking in style... 💖",
  "SecOps, but make it fashion. 💅",
  "Keep compiling, cutie! ✨",
  "Security is hot! Keep studying. 🔒",
  "PortSwigger academy is my happy place! 🍬",
  "Stay secure, stay sparkling. 🌟",
  "Password complexity: high. Cutest tracker: also high. 🔐",
  "LeetCode solved? Time for sweet rewards! 🍧",
  "Protecting databases and looking fabulous. 🕸️🌸",
  "Hackers don't wait for opportunities, they create them in pink! 💻✨"
];

// ⭐ NEW: CATEGORY DEFINITIONS with colors, icons, and metadata
const BUILT_IN_CATEGORIES = {
  portswigger: {
    name: "PortSwigger",
    icon: "🔓",
    color: "#87f0b5",
    weeklyTarget: 12,
    priority: 1,
    required: true,
    description: "Web security labs and exercises"
  },
  secplus: {
    name: "CompTIA Security+",
    icon: "🎓",
    color: "#a6c0fe",
    weeklyTarget: 10,
    priority: 2,
    required: true,
    description: "Security certification prep"
  },
  aws: {
    name: "AWS AI Practitioner",
    icon: "☁️",
    color: "#ffb3a7",
    weeklyTarget: 6,
    priority: 3,
    required: true,
    description: "AWS certification exam prep"
  },
  leetcode: {
    name: "LeetCode Blind 75",
    icon: "💻",
    color: "#c5b3fa",
    weeklyTarget: 5,
    priority: 4,
    required: true,
    description: "Algorithm and data structure practice"
  },
  ahf: {
    name: "AHF Tech Lead",
    icon: "👩‍💼",
    color: "#ff758c",
    weeklyTarget: 7,
    priority: 5,
    required: true,
    description: "Hopeful Fridays tech leadership"
  },
  palana: {
    name: "Palana Preparation",
    icon: "🚀",
    color: "#ff85a2",
    weeklyTarget: 0,
    priority: 7,
    required: false,
    description: "Palana onboarding preparation"
  },
  github: {
    name: "Git Developer Tool",
    icon: "🧑‍💻",
    color: "#ffea79",
    weeklyTarget: 8,
    priority: 8,
    required: false,
    description: "VS Code extension project (with Thanishka)"
  },
  projects: {
    name: "Cybersecurity Projects",
    icon: "🔧",
    color: "#e2bbfd",
    weeklyTarget: 0,
    priority: 9,
    required: false,
    description: "Custom security projects and exercises"
  },
  winfo: {
    name: "WINFO",
    icon: "💰",
    color: "#90EE90",
    weeklyTarget: 5,
    priority: 10,
    required: false,
    description: "Women in finance organization"
  },
  mentor: {
    name: "Mentor Meetings",
    icon: "👨‍🏫",
    color: "#FFD700",
    weeklyTarget: 3,
    priority: 11,
    required: false,
    description: "Cybersecurity mentorship sessions"
  },
  travel: {
    name: "Travel",
    icon: "✈️",
    color: "#87CEEB",
    weeklyTarget: 0,
    priority: 12,
    required: false,
    description: "Travel days with reduced capacity"
  },
  catchup: {
    name: "Catch-Up",
    icon: "🔄",
    color: "#DDA0DD",
    weeklyTarget: 0,
    priority: 13,
    required: false,
    description: "Catch-up and rescheduled work"
  },
  personal: {
    name: "Personal",
    icon: "🏠",
    color: "#F0E68C",
    weeklyTarget: 0,
    priority: 14,
    required: false,
    description: "Personal tasks and breaks"
  },
  palana_security: {
    name: "Palana Security",
    icon: "🛡️",
    color: "#FF6B6B",
    weeklyTarget: 10,
    priority: 15,
    required: false,
    description: "Active Palana security engineering role"
  },
  custom: {
    name: "Custom",
    icon: "✨",
    color: "#ffffff",
    weeklyTarget: 0,
    priority: 99,
    required: false,
    description: "Custom tasks"
  }
};

// ⭐ NEW: EXTRACURRICULAR DEFINITIONS (seed data)
const BUILT_IN_EXTRACURRICULARS = [
  {
    id: "winfo",
    name: "WINFO",
    role: "Finance Director",
    categoryId: "winfo",
    status: "active",
    weeklyHours: 5,
    nextEvent: "TBD",
    notes: "Women in finance organization"
  },
  {
    id: "ahf",
    name: "AHF (Hopeful Fridays)",
    role: "Tech Lead",
    categoryId: "ahf",
    status: "active",
    weeklyHours: 7,
    nextEvent: "TBD",
    notes: "Community platform leadership"
  },
  {
    id: "git-project",
    name: "Git Developer Productivity Tool",
    role: "Co-developer",
    categoryId: "github",
    status: "active",
    weeklyHours: 8,
    nextEvent: "TBD",
    notes: "VS Code extension with Thanishka"
  },
  {
    id: "cybersec-mentor",
    name: "Cybersecurity Mentorship",
    role: "Student",
    categoryId: "mentor",
    status: "active",
    weeklyHours: 3,
    nextEvent: "Monday (weekly meeting with Matt)",
    notes: "Weekly guidance and lab preparation"
  },
  {
    id: "palana-prep",
    name: "Palana Preparation",
    role: "Onboarding",
    categoryId: "palana",
    status: "completed",
    weeklyHours: 15,
    nextEvent: "Ended June 27",
    notes: "Pre-onboarding security engineering preparation"
  },
  {
    id: "leetcode",
    name: "LeetCode 75",
    role: "Practitioner",
    categoryId: "leetcode",
    status: "active",
    weeklyHours: 5,
    nextEvent: "Daily practice",
    notes: "Algorithm problem solving"
  },
  {
    id: "secplus",
    name: "CompTIA Security+",
    role: "Exam Candidate",
    categoryId: "secplus",
    status: "active",
    weeklyHours: 10,
    nextEvent: "Exam: Sept 18, 2026",
    notes: "Certification exam prep"
  },
  {
    id: "aws",
    name: "AWS AI Practitioner",
    role: "Exam Candidate",
    categoryId: "aws",
    status: "active-until-passed",
    weeklyHours: 6,
    nextEvent: "Exam date is set in the plan",
    notes: "Certification exam prep"
  }
];

// 2. PROJECT TASK MODULES (TRACK 4)
const TRACK_4_PROJECTS = [
  {
    id: "password_manager",
    name: "Secure Password Manager",
    desc: "Build a credential vault using Python/Flask or Node.js, implementing AES-GCM encryption for storage and bcrypt for master password hashing.",
    totalHours: 12,
    tasks: [
      { name: "Password Manager: Architecture & Encryption Setup", duration: 3 },
      { name: "Password Manager: User Authentication & Database Schema", duration: 3 },
      { name: "Password Manager: Vault GUI & Secure Copy-Paste", duration: 3 },
      { name: "Password Manager: Security Auditing & Testing", duration: 3 }
    ]
  },
  {
    id: "packet_analyzer",
    name: "Network Packet Analyzer",
    desc: "Create a custom packet sniffer using Python + Scapy to capture, parse, and analyze traffic logs. Detect ARP spoofing or port scans.",
    totalHours: 10,
    tasks: [
      { name: "Packet Sniffer: Raw socket capturing & Scapy environment", duration: 3.5 },
      { name: "Packet Sniffer: Protocol parser (TCP/UDP/ICMP header decoding)", duration: 3.5 },
      { name: "Packet Sniffer: Attack detection rules (port scanning/ARP spoofing)", duration: 3 }
    ]
  },
  {
    id: "vulnerability_scanner",
    name: "Web Vulnerability Scanner",
    desc: "Build a lightweight scanning script that checks target servers for common server misconfigurations, open ports, and basic SQLi/XSS entrypoints.",
    totalHours: 10,
    tasks: [
      { name: "Scanner: Request/Response crawler & Header security audits", duration: 3 },
      { name: "Scanner: SQLi and XSS input fuzzer payloads injection", duration: 4 },
      { name: "Scanner: HTML reporting panel of discovered vulns", duration: 3 }
    ]
  },
  {
    id: "malware_sandbox",
    name: "Keylogger / Malware Sandbox",
    desc: "Ethical keylogger development inside a host-isolated Virtual Machine. Log keystrokes securely and analyze host telemetry changes.",
    totalHours: 14,
    tasks: [
      { name: "Sandbox: VM configuration, firewall isolations, and monitoring tools", duration: 3 },
      { name: "Malware: Keystroke monitoring hook & encrypted local log storage", duration: 4 },
      { name: "Sandbox: Process telemetry, registry audits, and network call tracking", duration: 4 },
      { name: "Sandbox: Indicators of Compromise (IOC) report compilation", duration: 3 }
    ]
  },
  {
    id: "honeypot_setup",
    name: "SSH/Web Honeypot Setup",
    desc: "Deploy a decoy SSH or web listener to log intrusion attempts, brute-force logs, and attacker commands. Push reports to a security dashboard.",
    totalHours: 8,
    tasks: [
      { name: "Honeypot: Mock SSH service configuration & login listener", duration: 3 },
      { name: "Honeypot: Request logger, geolocation API tracker, and alerts system", duration: 3 },
      { name: "Honeypot: Attack pattern analysis & dashboard integration", duration: 2 }
    ]
  }
];

// 3. CURRICULUM BASE DATASET
const CORE_CURRICULUM = {
  // AWS Tasks (Track 2)
  aws: [
    { id: "aws_udemy_1", title: "Udemy AWS Course: Finish remaining hours (Part 1)", duration: 1.5, link: "https://www.udemy.com/" },
    { id: "aws_udemy_2", title: "Udemy AWS Course: Finish remaining hours (Part 2)", duration: 1.5, link: "https://www.udemy.com/" },
    { id: "aws_rev_1", title: "AWS Review: IAM & Identity Access Security", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_rev_2", title: "AWS Review: EC2 & Compute Infrastructure", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_rev_3", title: "AWS Review: S3 & Storage Solutions", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_rev_4", title: "AWS Review: VPC & Cloud Networking", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_rev_5", title: "AWS Review: Databases (RDS, DynamoDB, Redshift)", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_rev_6", title: "AWS Review: Monitoring, Scaling & Elasticity", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_rev_7", title: "AWS Review: Pricing, Support Plans & TCO", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_exam_prep", title: "AWS Skill Builder Mock Exam & Review", duration: 1.5, link: "https://skillbuilder.aws/exam-prep/cloud-practitioner" },
    { id: "aws_exam", title: "AWS AI Practitioner Certification Exam", duration: 1.5, exam: true, link: "https://aws.amazon.com/certification/certified-ai-practitioner/" }
  ],
  
  // PortSwigger Tasks (Track 1)
  portswigger: [
    { id: "ps_lab_1", title: "PortSwigger Lab: SQL Injection (SQLi) union attacks", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_2", title: "PortSwigger Lab: SQLi blind vulnerabilities", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_3", title: "PortSwigger Lab: Authentication bypass & brute-forcing", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_4", title: "PortSwigger Lab: Directory Traversal file access", duration: 1.5, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_5", title: "PortSwigger Lab: Command Injection execution flaws", duration: 1.5, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_6", title: "PortSwigger Lab: Business Logic flaws & bypasses", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_7", title: "PortSwigger Lab: Information Disclosure leaks", duration: 1.5, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_8", title: "PortSwigger Lab: Access Control privileges escalation", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_9", title: "PortSwigger Lab: File Upload remote execution", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_10", title: "PortSwigger Lab: Server-Side Request Forgery (SSRF)", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_11", title: "PortSwigger Lab: Cross-Site Scripting (XSS) reflected", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_12", title: "PortSwigger Lab: Stored XSS & DOM-based XSS", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_13", title: "PortSwigger Lab: CSRF validation bypasses", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_14", title: "PortSwigger Lab: CORS configurations exploits", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_15", title: "PortSwigger Lab: Clickjacking vulnerabilities", duration: 1.5, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_16", title: "PortSwigger Lab: DOM-based open redirects", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_17", title: "PortSwigger Lab: WebSockets message manipulation", duration: 1.5, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_18", title: "PortSwigger Lab: XML External Entity (XXE) attacks", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_19", title: "PortSwigger Lab: Advanced SQLi & Filter bypasses", duration: 2, link: "https://portswigger.net/web-security/all-topics" },
    { id: "ps_lab_20", title: "PortSwigger Lab: Advanced XSS & CSP Bypasses", duration: 2, link: "https://portswigger.net/web-security/all-topics" }
  ],
  
  // CompTIA Security+ Tasks (Track 3) — 29-day fixed daily plan (Aug 3 - Aug 31, 2026); exam Sep 1.
  // Each task is pinned to a specific plan day and mapped to a real date by applySecplusDailyPlan.
  // Videos/PDFs use the Professor Messer link; practice exams use the Dion link.
  secplus: (function() {
    const MESSER = "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/";
    const DION = "https://www.udemy.com/course/securityplus/";
    const plan = [
      { planDay: 1,  title: "Security+ Day 1: Watch sections 1 and 2 (download PDFs)", duration: 2.5, link: MESSER },
      { planDay: 2,  title: "Security+ Day 2: Watch sections 3 and 4", duration: 2.5, link: MESSER },
      { planDay: 3,  title: "Security+ Day 3: Watch sections 5 and 6", duration: 2.5, link: MESSER },
      { planDay: 4,  title: "Security+ Day 4: Watch sections 7 and 8", duration: 2.5, link: MESSER },
      { planDay: 5,  title: "Security+ Day 5: Watch sections 9, 10, and 11", duration: 2.5, link: MESSER },
      { planDay: 6,  title: "Security+ Day 6: Watch sections 12 and 13", duration: 2.5, link: MESSER },
      { planDay: 7,  title: "Security+ Day 7: Watch sections 14 and 15", duration: 2.5, link: MESSER },
      { planDay: 8,  title: "Security+ Day 8: Watch sections 10 and 11", duration: 2.5, link: MESSER },
      // Aug 11-17: 1 section/day (lightened for Microsoft OA week). Aug 16 (Day 14) stays as Review.
      { planDay: 9,  title: "Security+ Day 9: Watch section 12", duration: 1.5, link: MESSER },
      { planDay: 10, title: "Security+ Day 10: Watch section 13", duration: 1.5, link: MESSER },
      { planDay: 11, title: "Security+ Day 11: Watch section 14", duration: 1.5, link: MESSER },
      { planDay: 12, title: "Security+ Day 12: Watch section 15", duration: 1.5, link: MESSER },
      { planDay: 13, title: "Security+ Day 13: Watch section 16", duration: 1.5, link: MESSER },
      { planDay: 14, title: "Security+ Day 14: Review sections 1-20", duration: 2.5, link: MESSER },
      { planDay: 15, title: "Security+ Day 15: Watch section 17", duration: 1.5, link: MESSER },
      // Aug 18-20: resume 2 sections/day to cover the displaced material.
      { planDay: 16, title: "Security+ Day 16: Watch sections 18 and 19", duration: 2.5, link: MESSER },
      { planDay: 17, title: "Security+ Day 17: Watch sections 20 and 21", duration: 2.5, link: MESSER },
      { planDay: 18, title: "Security+ Day 18: Watch sections 22 and 23", duration: 2.5, link: MESSER },
      // Aug 21-30: practice exams. Aug 21-25 pair with a section (24-28) to finish material displaced from OA week.
      { planDay: 19, title: "Security+ Day 19: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 20, title: "Security+ Day 20: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 21, title: "Security+ Day 21: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 22, title: "Security+ Day 22: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 23, title: "Security+ Day 23: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 24, title: "Security+ Day 24: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 25, title: "Security+ Day 25: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 26, title: "Security+ Day 26: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 27, title: "Security+ Day 27: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 28, title: "Security+ Day 28: Take 1 Practice Exam", duration: 2, link: DION },
      { planDay: 29, title: "Security+ Day 29: Final review (weak areas + missed questions)", duration: 2.5, link: MESSER },
      // Displaced-section pairings (paired with practice exams on Aug 21-25).
      { planDay: 30, dateOverride: "2026-08-21", title: "Security+ Day 19 extra: Watch section 24", duration: 1.5, link: MESSER },
      { planDay: 31, dateOverride: "2026-08-22", title: "Security+ Day 20 extra: Watch section 25", duration: 1.5, link: MESSER },
      { planDay: 32, dateOverride: "2026-08-23", title: "Security+ Day 21 extra: Watch section 26", duration: 1.5, link: MESSER },
      { planDay: 33, dateOverride: "2026-08-24", title: "Security+ Day 22 extra: Watch section 27", duration: 1.5, link: MESSER },
      { planDay: 34, dateOverride: "2026-08-25", title: "Security+ Day 23 extra: Watch section 28", duration: 1.5, link: MESSER }
    ];
    return plan.map(t => Object.assign({ id: `sec_d${t.planDay}` }, t));
  })()
};

// 4. GLOBAL STATE VARIABLES

// Bump this whenever the schedule-generation logic changes. On load, saved states
// (local + cloud) with an older version auto-migrate while preserving completed tasks.
const SCHEDULE_VERSION = 8;
const PLAN_TIMEZONE = "America/Los_Angeles";

// False until a signed-in user's state has been chosen (cloud vs local) and run
// through runStatePipeline(); saving before then could persist the wrong user's data.
let stateReady = false;

// True while appState is a plan generated on this page load because there was
// no local save (first visit, or right after sign-out wiped local progress).
// It holds no real progress, so it must never stand in for the cloud copy:
// firebase-sync.js keeps the app locked and retries the cloud load instead of
// running on it. Cleared once a cloud load succeeds.
let localStateIsPlaceholder = false;

// "View demo" mode. One in-memory flag, set only by enterDemoMode() (the gate's
// "View demo" button). It is never read from the URL, storage or a message, and
// it clears only by reloading the page. While it is true nothing is saved,
// synced, exported or sent anywhere. See "13. DEMO MODE" below.
let demoMode = false;
function isDemoMode() { return demoMode; }

// Settings for a brand-new or reset plan. origin: "fresh" marks a state that
// has no personal history, so the one-time "mark past days complete" passes
// (August, June/July, Sept 1-2, Sept 3-15) never run on it. The owner's
// pre-existing state has no origin field and keeps its history behaviour.
function defaultSettings() {
  return {
    maxNormalDailyHours: 8,
    palanaEnabled: true,
    awsExamPassed: false,
    securityPlusExamPassed: false,
    awscpExamPassed: false,
    selectedProjects: ["password_manager", "packet_analyzer", "vulnerability_scanner"],
    lastRolloverDay: null,
    scheduleVersion: SCHEDULE_VERSION,
    palanaSecurityEnabled: true,
    ahfWeeklyTarget: 7,
    origin: "fresh"
  };
}

function isFreshState() {
  return !!(appState && appState.settings && appState.settings.origin === "fresh");
}

let appState = {
  settings: {
    maxNormalDailyHours: 8,
    palanaEnabled: true,
    awsExamPassed: false,
    securityPlusExamPassed: false,
    awscpExamPassed: false,
    selectedProjects: ["password_manager", "packet_analyzer", "vulnerability_scanner"], // default projects
    lastRolloverDay: null, // date string representing the last day forced rollover
    scheduleVersion: SCHEDULE_VERSION,
    palanaSecurityEnabled: true, // Palana Security role secured — cycle always runs post-onboarding
    ahfWeeklyTarget: 7 // ⭐ NEW: AHF weekly hours (editable)
  },
  days: [], // array of all days
  categories: {}, // ⭐ NEW: Custom category storage
  extracurriculars: [], // ⭐ NEW: Extracurricular tracking
  rescheduleLedger: {} // Track reschedule history
};

// Date constants
const START_DATE_STR = "2026-06-13";
const END_DATE_STR = "2026-12-31"; // plan now runs through the end of 2026
// The original summer generator (June 13 - Sep 2) still builds only its own
// window; everything after it is added additively by plan-extension-2026.js.
const BASE_SCHEDULE_END = "2026-09-02";
const INDIA_START_STR = "2026-06-24";
const INDIA_END_STR = "2026-07-08";
const INFO_START_STR = "2026-06-22";
const INFO_END_STR = "2026-08-21";
const SECPLUS_START_DATE = "2026-08-03";
// Old base-plan exam date. The exam now lives on 2026-09-18 (plan extension);
// kept only so migrateRolloverAndExamsV1 can find the retired Sept 1 copy.
const SECPLUS_EXAM_DATE = "2026-09-01";
const SECPLUS_PLAN_DEADLINE = "2026-09-01";
const LEETCODE_START_2PERDAY = "2026-07-26";

// Detailed Palana Preparation tasks (June 15–28, 2026). Mentor meetings come from buildMentorTasksForDay().
const PALANA_PREP_TASKS_DETAILED = {
  "2026-06-15": [ // Monday
    { title: "Create Palana security workspace (meeting notes, architecture, threat model, findings, questions, weekly updates)", duration: 0.75 },
    { title: "Write down known Palana technology stack (React Native, Expo, Go, Firebase, GCP, Railway, Next.js, WebSockets)", duration: 0.33 },
    { title: "Begin cybersecurity threat-modeling course (first section of 3.5h total)", duration: 1.0 }
  ],
  "2026-06-16": [ // Tuesday
    { title: "Continue threat-modeling course (CIA, assets, threats, vulnerabilities, risk, controls)", duration: 1.0 }
  ],
  "2026-06-17": [ // Wednesday
    { title: "Finish remaining threat-modeling course portions", duration: 1.5 },
    { title: "Review four core threat-modeling questions", duration: 0.5 }
  ],
  "2026-06-18": [ // Thursday
    { title: "Watch cybersecurity videos from Matt (add video links in notes)", duration: 1.0 }
  ],
  "2026-06-19": [ // Friday
    { title: "Study STRIDE and apply to Palana ride-request flow (2+ threats per category)", duration: 1.0 },
    { title: "Complete PortSwigger threat/vulnerability analysis (attach lab link)", duration: 1.0 }
  ],
  "2026-06-20": [ // Saturday
    { title: "Review Firebase security (auth vs authorization, rules, emulator suite)", duration: 1.5 }
  ],
  "2026-06-21": [ // Sunday
    { title: "Complete beginner Firebase/access-control exercise", duration: 0.5 },
    { title: "Write questions for Matt and create Week 1 summary", duration: 0.75 }
  ],
  "2026-06-22": [ // Monday
    { title: "Study broken access control and IDOR", duration: 1.0 }
  ],
  "2026-06-23": [ // Tuesday
    { title: "Practice Burp Suite (proxy, repeater, modify IDs/headers/tokens)", duration: 1.5 },
    { title: "Complete PortSwigger access-control lab (record request, impact, mitigation)", duration: 0.5 }
  ],
  "2026-06-24": [ // Wednesday — travel day
    { title: "Save notes for offline access", duration: 0.25 },
    { title: "Download diagrams and save onboarding questions", duration: 0.15 },
    { title: "Review CIA and STRIDE if convenient", duration: 0.15 }
  ],
  "2026-06-26": [ // Friday
    { title: "Organize onboarding questions into categories and choose top 12", duration: 0.5 },
    { title: "Prepare short introduction for onboarding", duration: 0.25 }
  ],
  "2026-06-27": [ // Saturday — onboarding day
    { title: "Attend Palana onboarding", duration: 2.0 },
    { title: "Ask for architecture docs, schema, Firebase products, repo/staging access", duration: 0.5 },
    { title: "Confirm testing boundaries and reporting process", duration: 0.5 },
    { title: "Write immediate onboarding notes — Palana Security Onboarding Summary", duration: 0.75 }
  ],
  "2026-06-28": [ // Sunday — optional follow-up
    { title: "Organize onboarding notes (optional)", duration: 0.75 },
    { title: "Record access received and missing access", duration: 0.25 },
    { title: "List first three likely tasks", duration: 0.5 },
    { title: "Decide whether to activate Palana Security Role", duration: 0.25 }
  ]
};

// ⭐ NEW: DETAILED AHF TASKS (June 15-July 26)
const AHF_TASKS_DETAILED = {
  "2026-06-15": [
    { title: "Log in to AHF Microsoft 365", duration: 0.1, time: 6 },
    { title: "Find Outlook Scheduling Poll", duration: 0.1, time: 6 },
    { title: "Confirm access: GoHighLevel, Microsoft Planner, Teams, GitHub", duration: 0.25, time: 15 },
    { title: "Create 'AHF Summer Tasks and Findings' document (sections: GHL workflows, task mgmt, website/GitHub, Rahul questions, Danny questions)", duration: 0.5, time: 30 },
    { title: "List missing access and send Rahul one consolidated permissions message", duration: 0.5, time: 30 }
  ],
  "2026-06-16": [
    { title: "Create one-hour Saturday scheduling poll (Danny, Rahul, Roslyn, Cale, Tejaswi, Patricia; Pacific afternoon options)", duration: 1.0, time: 60 },
    { title: "Mark existing tasks as: unclear, duplicate, outdated, missing owner, or needs leadership decision", duration: 0.75, time: 45 }
  ],
  "2026-06-17": [
    { title: "Understand GoHighLevel workflows (record for each: name, trigger, entry criteria, email frequency, wait steps, conditions, sender, recipient group, repetition, Corey dependency, reply behavior, exit condition; take screenshots)", duration: 1.5, time: 90 }
  ],
  "2026-06-18": [
    { title: "Create TEST workflow: Tejaswi Recurring Email (test daily + weekly recurring, easy stop condition, clear labels, don't affect real members)", duration: 1.0, time: 60 }
  ],
  "2026-06-19": [
    { title: "Create Hopeful Fridays – Planner POC (buckets: leadership decisions, website/portal, technology, operations, communications, completed)", duration: 1.0, time: 60 },
    { title: "Test Planner features: assignment, due dates, labels, checklists, comments, attachments, Teams view, GitHub links, notifications", duration: 0.75, time: 45 }
  ],
  "2026-06-20": [
    { title: "Leadership meeting on: community platform vs member portal, GHL temporary status, website updates location, new website approval, WordPress pre-alpha, account ownership, priorities before India", duration: 1.5, time: 90 },
    { title: "Record: decisions, open questions, owners, deadlines, approved priorities", duration: 0.5, time: 30 }
  ],
  "2026-06-21": [
    { title: "Clean notes and send recap if needed", duration: 0.5, time: 30 },
    { title: "Check GHL test emails and update task document", duration: 0.5, time: 30 },
    { title: "Select next three priorities", duration: 0.25, time: 15 }
  ],
  "2026-06-22": [
    { title: "Create Hopeful Fridays – Trello POC (test: boards/lists, assignments, labels, due dates, GitHub links, PR attachments, Teams, automation, updates)", duration: 1.5, time: 90 },
    { title: "Compare Planner vs Trello", duration: 0.5, time: 30 }
  ],
  "2026-06-23": [
    { title: "Create pre-travel handoff status update (poll/meeting status, GHL findings, email test results, Planner findings, Trello findings, missing permissions, decisions needed, recommended next step)", duration: 1.0, time: 60 },
    { title: "Save documents in AHF-controlled location and share access", duration: 0.5, time: 30 },
    { title: "Turn off test workflows and mark incomplete work", duration: 0.5, time: 30 }
  ],
  "2026-07-09": [
    { title: "Review messages and decisions after travel", duration: 0.75 },
    { title: "Update master task document and identify active work", duration: 0.75 },
    { title: "Meet Rahul if needed; confirm website approval and GitHub access", duration: 1.0 }
  ],
  "2026-07-10": [
    { title: "Practice feature branches, pull requests, and review workflow", duration: 1.0 },
    { title: "Practice merge conflicts and branch protection", duration: 1.0 }
  ],
  "2026-07-13": [
    { title: "Receive knowledge-transfer documentation and clone/run website", duration: 1.5 },
    { title: "Review file structure, form-to-GHL connection, env vars, hosting", duration: 1.0 }
  ],
  "2026-07-14": [
    { title: "Plan dev/staging/production branches and document deployment", duration: 1.0 },
    { title: "Make one small feature-branch change (if website approved)", duration: 1.0 }
  ],
  "2026-07-20": [
    { title: "Set up development and staging environments", duration: 1.5 },
    { title: "Add branch protections and require PR approval", duration: 1.0 }
  ],
  "2026-07-21": [
    { title: "Test one deployment and document rollback procedure", duration: 1.0 },
    { title: "Prevent accidental production deployment", duration: 0.5 }
  ]
};

// 5. HELPER DATE FUNCTIONS
function parseDate(dateStr) {
  const parts = dateStr.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDaysBetween(startStr, endStr) {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const diffTime = Math.abs(end - start);
  // round, not ceil: across a DST change two local midnights are 23 or 25 hours
  // apart, and ceil would count that as an extra day.
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function getDayOfWeek(dateStr) {
  const date = parseDate(dateStr);
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
}

// ⭐ NEW: Get the real current date in America/Los_Angeles timezone
function getRealCurrentDate() {
  // Get current date in browser's local timezone
  const now = new Date();
  
  // Convert to LA timezone using Intl API (timezone-aware)
  const laFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PLAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = laFormatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
}

// ⭐ NEW: Get real current date as Date object (midnight LA time)
function getRealCurrentDateObj() {
  const dateStr = getRealCurrentDate();
  return parseDate(dateStr);
}

// Plan "today" — real LA date clamped to plan window (never hardcoded June 13)
function planToday() {
  const real = getRealCurrentDate();
  if (demoMode) return real; // demo days are built around the real date
  if (real < START_DATE_STR) return START_DATE_STR;
  if (real > END_DATE_STR) return END_DATE_STR;
  return real;
}

// Merge built-in + user custom categories
function getAllCategories() {
  const merged = {};
  if (demoMode) {
    // Demo shows only the sample categories (plus the generic fallback).
    merged.custom = Object.assign({ id: "custom", builtIn: true, active: true, archived: false, exportEnabled: true, order: 99 }, BUILT_IN_CATEGORIES.custom);
    Object.entries(appState.categories || {}).forEach(([id, cat]) => {
      merged[id] = Object.assign({ id, builtIn: false }, cat);
    });
    return merged;
  }
  Object.entries(BUILT_IN_CATEGORIES).forEach(([id, cat]) => {
    merged[id] = Object.assign({ id, builtIn: true, active: true, archived: false, exportEnabled: true, order: cat.priority || 99 }, cat);
  });
  Object.entries(appState.categories || {}).forEach(([id, cat]) => {
    merged[id] = Object.assign({ id, builtIn: false }, cat);
  });
  return merged;
}

// Push each category's color into the matching CSS variable (--cat-<id>) so
// every place that renders a color — calendar dots/blocks, today rows, badges,
// legend, track borders — updates at once when a color is edited.
function applyCategoryColors() {
  const cats = getAllCategories();
  Object.values(cats).forEach(cat => {
    if (cat.id && cat.color) {
      document.documentElement.style.setProperty(`--cat-${cat.id}`, cat.color);
    }
  });
}

function getCategoryDef(catId) {
  const all = getAllCategories();
  return all[catId] || BUILT_IN_CATEGORIES.custom || { name: catId, icon: "✨", color: "#ffffff" };
}

function getCategoryLabel(catId) {
  return getCategoryDef(catId).name || catId;
}

function isIndiaTrip(dateStr) {
  return dateStr >= INDIA_START_STR && dateStr <= INDIA_END_STR;
}

function isInfo310Class(dateStr) {
  return dateStr >= INFO_START_STR && dateStr <= INFO_END_STR;
}

// ⭐ NEW: Helper function to build AHF tasks for a day
function buildAHFTasksForDay(dateStr) {
  // Use detailed tasks if available for June 15-23 period
  if (dateStr in AHF_TASKS_DETAILED) {
    const tasksForDay = AHF_TASKS_DETAILED[dateStr];
    return tasksForDay.map((task, index) => ({
      id: `${dateStr}_ahf_${index}`,
      category: "ahf",
      title: task.title,
      duration: task.duration,
      completed: false,
      link: null
    }));
  }
  
  // Default: daily AHF tech lead work, sized from Settings → AHF weekly target.
  return [{
    id: `${dateStr}_ahf`,
    category: "ahf",
    title: "AHF Work (Tech Lead Duties)",
    duration: ahfDailyHoursFromTarget(),
    completed: false,
    link: null
  }];
}

// Settings → "AHF Weekly Hour Target" / 7, e.g. the default 7 h → 1 h per day.
function ahfDailyHoursFromTarget() {
  const target = Number(appState.settings && appState.settings.ahfWeeklyTarget);
  return target > 0 ? Math.round((target / 7) * 100) / 100 : 1.0;
}

// Applies a changed AHF weekly target to the default daily AHF tasks that are
// still ahead (base "<date>_ahf" and extension "<date>_x_ahf"), unchecked only.
function resizeFutureAhfTasks() {
  const today = getRealCurrentDate();
  const hours = ahfDailyHoursFromTarget();
  let n = 0;
  appState.days.forEach(day => {
    if (day.date <= today) return;
    day.tasks.forEach(t => {
      if (t.completed || (t.id !== `${day.date}_ahf` && !/_x_ahf$/.test(t.id))) return;
      if (t.duration === hours) return;
      t.duration = hours;
      if (typeof touchTask === "function") touchTask(t);
      n++;
    });
  });
  return n;
}

// ⭐ NEW: Helper function to build recurring mentor meetings
function buildMentorTasksForDay(dateStr) {
  const tasks = [];
  const dayOfWeek = getDayOfWeek(dateStr);
  
  // Every Monday: Weekly meeting with Matt (1 hour)
  if (dayOfWeek === 1) {
    tasks.push({
      id: `${dateStr}_mentor_meeting`,
      category: "mentor",
      title: "Cybersecurity Mentor Meeting with Matt",
      duration: 1.0,
      completed: false,
      recurring: "weekly-monday",
      fixed: true,
      link: null
    });
  }
  
  // Every Sunday: Mentor Lab Preparation (1-2 hours)
  if (dayOfWeek === 0) {
    tasks.push({
      id: `${dateStr}_mentor_prep`,
      category: "mentor",
      title: "Mentor Lab Preparation (prep for Monday meeting)",
      duration: 1.5,
      completed: false,
      recurring: "weekly-sunday",
      fixed: true,
      link: null
    });
  }
  
  return tasks;
}

// ⭐ WINFO — Finance Director duties (recurring weekly on Tuesdays)
function buildWinfoTasksForDay(dateStr) {
  const tasks = [];
  if (isIndiaTrip(dateStr)) return tasks; // paused during India trip
  const dayOfWeek = getDayOfWeek(dateStr);
  if (dayOfWeek === 2) { // Tuesday
    tasks.push({
      id: `${dateStr}_winfo_meeting`,
      category: "winfo",
      title: "WINFO Meeting",
      duration: 1.0,
      completed: false,
      recurring: "weekly-tuesday",
      fixed: true,
      link: null
    });
    tasks.push({
      id: `${dateStr}_winfo_reimb`,
      category: "winfo",
      title: "WINFO: Check reimbursements",
      duration: 0.5,
      completed: false,
      link: null
    });
    tasks.push({
      id: `${dateStr}_winfo_grants`,
      category: "winfo",
      title: "WINFO: Check open grants & scholarships",
      duration: 0.5,
      completed: false,
      link: null
    });
  }
  return tasks;
}

// Builds the Palana task for a given day (or null if none should be scheduled).
// Before onboarding: intensive daily "Palana Onboarding Prep" blocks.
// Post-onboarding Palana Security work runs on a repeating 3-week cycle,
// Monday–Friday, anchored to the first Monday after onboarding (June 29):
//   week 1 → threat modeling, week 2 → test vulnerabilities,
//   week 3 → document & help dev team mitigate, then repeat to end of summer.
const PALANA_CYCLE_START = "2026-06-29";
const PALANA_CYCLE_PHASES = [
  "Threat modeling",
  "Test the vulnerabilities",
  "Document findings & help dev team mitigate"
];

// After onboarding: regular weekday safety-engineering work blocks.
function buildPalanaTaskForDay(dateStr, dayOfWeek, isIndia) {
  if (!appState.settings.palanaEnabled) return [];
  if (isIndia && dateStr !== "2026-06-24") return [];

  // Detailed prep through June 28
  if (dateStr in PALANA_PREP_TASKS_DETAILED) {
    return PALANA_PREP_TASKS_DETAILED[dateStr].map((task, index) => ({
      id: `${dateStr}_palana_${index}`,
      category: "palana",
      title: task.title,
      duration: task.duration,
      completed: false,
      fixed: dateStr <= "2026-06-27",
      link: null
    }));
  }

  // After onboarding, the Palana Security cycle runs Mon–Fri on the repeating
  // 3-week threat-model → test → mitigate rotation, while Settings → "Activate
  // Palana Security Role" (palanaSecurityEnabled) is on.
  if (dateStr >= PALANA_CYCLE_START && appState.settings.palanaSecurityEnabled !== false) {
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const weeksIn = Math.floor(getDaysBetween(PALANA_CYCLE_START, dateStr) / 7);
      const phaseIdx = ((weeksIn % 3) + 3) % 3;
      const phase = PALANA_CYCLE_PHASES[phaseIdx];
      const palanaHours = dayOfWeek === 5 ? 2.0 : 1.5;
      return [{
        id: `${dateStr}_palana_sec`,
        category: "palana_security",
        title: `Palana Security — ${phase}`,
        duration: palanaHours,
        completed: false,
        cyclePhase: phaseIdx + 1,
        link: null
      }];
    }
  }
  return [];
}

// Check if a day is a rest day (for capacity variation)
// Sunday is the default rest day (capacity 2).
function getBaseCapacityForDay(dateStr, maxNormal) {
  if (isIndiaTrip(dateStr)) {
    return 3.0; // Hard max of 2-3 hours during India trip
  }
  const dayOfWeek = getDayOfWeek(dateStr);
  if (dayOfWeek === 0) { // Sunday
    return 2.0; // 0-2 hours rest day
  } else if (dayOfWeek === 6) { // Saturday
    return 4.0; // Weekend lighter day (3-5 hours)
  }
  
  // Weekday variation (Mon=max, Tue=max-2, Wed=max, Thu=max-2, Fri=max)
  if (dayOfWeek === 2 || dayOfWeek === 4) { // Tue, Thu
    return Math.max(5.0, maxNormal - 2.0); // 5-6 hours
  }
  
  return maxNormal; // Normal weekday max (8 hours)
}

// 6. SCHEDULER ENGINE - BASE GENERATOR
// This function creates the complete schedule from scratch.
function generateBaseSchedule() {
  const daysList = [];
  const start = parseDate(START_DATE_STR);
  const end = parseDate(BASE_SCHEDULE_END);
  
  let current = new Date(start);
  while (current <= end) {
    const dateStr = formatDate(current);
    const dayOfWeek = getDayOfWeek(dateStr);
    const isIndia = isIndiaTrip(dateStr);
    
    const dayObj = {
      date: dateStr,
      isIndia: isIndia,
      maxCapacity: getBaseCapacityForDay(dateStr, appState.settings.maxNormalDailyHours),
      tasks: [],
      rolledOver: false
    };
    
    // Add Routines for this day
    // 1. AHF Tech Lead Work (1h base + detailed tasks June 15-23)
    const ahfTasks = buildAHFTasksForDay(dateStr);
    ahfTasks.forEach(task => {
      dayObj.tasks.push(task);
    });
    
    // 2. LeetCode — Microsoft OA prep (Aug 11-17) overrides Blind 75 with 6 targeted problems.
    //    Otherwise, 2 Blind 75 problems/day from LEETCODE_START_2PERDAY onward.
    if (typeof MICROSOFT_OA_OVERRIDE !== "undefined" && MICROSOFT_OA_OVERRIDE[dateStr]) {
      MICROSOFT_OA_OVERRIDE[dateStr].forEach((p, i) => {
        dayObj.tasks.push({
          id: `${dateStr}_msoa_${i + 1}`,
          category: "leetcode",
          title: `Microsoft OA Prep: LC #${p.id} - ${p.name}`,
          duration: 0.75,
          completed: false,
          link: p.link,
          leetcodeNumber: p.id,
          microsoftOA: true
        });
      });
    } else if (dateStr >= LEETCODE_START_2PERDAY) {
      dayObj.tasks.push({
        id: `${dateStr}_leetcode_1`,
        category: "leetcode",
        title: "LeetCode Blind 75 Problem",
        duration: 0.5,
        completed: false,
        link: "https://neetcode.io/practice/practice/blind75",
        leetcodeNumber: null
      });
      dayObj.tasks.push({
        id: `${dateStr}_leetcode_2`,
        category: "leetcode",
        title: "LeetCode Blind 75 Problem",
        duration: 0.5,
        completed: false,
        link: "https://neetcode.io/practice/practice/blind75",
        leetcodeNumber: null
      });
    }

    // (INFO 310 course removed — tracked separately in Canvas.)

    // 4. Palana — intensive onboarding prep before the job starts (week of June 27),
    //    then regular safety-engineering work blocks afterwards.
    const palanaTasks = buildPalanaTaskForDay(dateStr, dayOfWeek, isIndia);
    palanaTasks.forEach(task => {
      dayObj.tasks.push(task);
    });

    // 5. Git Developer Productivity Tool (8-week roadmap via git-roadmap.js)
    if (typeof buildGitProjectTasksForDay === "function" && dateStr >= "2026-06-15") {
      const gitTasks = buildGitProjectTasksForDay(dateStr, dayOfWeek, isIndia);
      gitTasks.forEach(t => dayObj.tasks.push(t));
    }

    // 6. ⭐ NEW: Mentor Meetings (recurring: Monday + Sunday prep)
    const mentorTasks = buildMentorTasksForDay(dateStr);
    mentorTasks.forEach(task => {
      dayObj.tasks.push(task);
    });

    // 7. ⭐ WINFO — Finance Director duties (Tuesdays)
    buildWinfoTasksForDay(dateStr).forEach(task => dayObj.tasks.push(task));

    // 8. ⭐ One-off: update resume / CV
    if (dateStr === "2026-06-23") {
      dayObj.tasks.push({
        id: `${dateStr}_resume_update`,
        category: "personal",
        title: "Update resume / CV",
        duration: 1.0,
        completed: false,
        link: null
      });
    }

    daysList.push(dayObj);
    current.setDate(current.getDate() + 1);
  }

  // Assign LeetCode questions: 2/day from LEETCODE_START_2PERDAY, remove excess placeholders.
  // Microsoft OA override tasks (microsoftOA:true) are already assigned and do not consume Blind 75 slots.
  let lcIndex = 0;
  for (let i = 0; i < daysList.length; i++) {
    const day = daysList[i];
    const lcTasks = day.tasks.filter(t => t.category === "leetcode" && !t.microsoftOA);
    for (const lcTask of lcTasks) {
      if (lcIndex < 75) {
        const q = BLIND_75_QUESTIONS[lcIndex];
        lcTask.title = blind75Title(q);
        lcTask.link = q.link;
        lcTask.leetcodeNumber = q.lc;
        lcTask.blind75Seq = q.seq;
        lcIndex++;
      }
    }
  }
  // Remove unassigned leetcode placeholders
  for (const day of daysList) {
    day.tasks = day.tasks.filter(t => t.category !== "leetcode" || t.leetcodeNumber !== null);
    day.tasks.forEach(t => { t.source = "base"; });
  }

  // Create Curriculum Backlog (Tracks 1, 2, 3, 4)
  const curriculumBacklog = [];
  
  // Add PortSwigger Tasks (Track 1)
  CORE_CURRICULUM.portswigger.forEach(t => {
    curriculumBacklog.push({
      category: "portswigger",
      title: t.title,
      duration: t.duration,
      link: t.link
    });
  });

  // Add AWS Tasks (Track 2)
  CORE_CURRICULUM.aws.forEach(t => {
    curriculumBacklog.push({
      category: "aws",
      title: t.title,
      duration: t.duration,
      link: t.link,
      exam: t.exam
    });
  });

  // Projects (Track 4) still distribute via capacity packing.
  // Security+ (Track 3) is NOT interleaved anymore — it's placed by
  // applySecplusDailyPlan onto fixed dates (one plan day per calendar day).
  appState.settings.selectedProjects.forEach(projId => {
    const proj = TRACK_4_PROJECTS.find(p => p.id === projId);
    if (proj) {
      proj.tasks.forEach(t => {
        curriculumBacklog.push({ category: "projects", title: t.name, duration: t.duration, link: "https://bestprojectideas.com/cybersecurity-project-ideas/" });
      });
    }
  });

  // Schedule Curriculum Tasks sequentially into the calendar days
  distributeCurriculumTasks(daysList, curriculumBacklog, 0);

  // Apply the fixed 30-day Security+ plan (Day 1 = SECPLUS_START_DATE)
  applySecplusDailyPlan(daysList);

  // The Security+ exam itself is owned by the plan extension (Sept 18, the
  // real booking) — the base plan no longer places one.

  appState.days = daysList;
}

// Map each 30-day Security+ plan entry to a specific date starting SECPLUS_START_DATE.
// If a plan day would fall past SECPLUS_PLAN_DEADLINE, its task stacks onto
// SECPLUS_START_DATE (overflow → today). Preserves any completed Sec+ tasks: if a
// task with the same planDay is already completed anywhere, it is not re-added.
function applySecplusDailyPlan(daysList) {
  const startDate = parseDate(SECPLUS_START_DATE);
  const deadline = parseDate(SECPLUS_PLAN_DEADLINE);

  // Any plan day already on the calendar — completed, or rolled/moved to
  // another date — is not re-issued on its original date.
  const placedPlanDays = new Set();
  daysList.forEach(d => d.tasks.forEach(t => {
    if (t.category === "secplus" && typeof t.planDay === "number") {
      placedPlanDays.add(t.planDay);
    }
  }));

  CORE_CURRICULUM.secplus.forEach(task => {
    if (placedPlanDays.has(task.planDay)) return;

    const target = new Date(startDate);
    target.setDate(target.getDate() + (task.planDay - 1));
    let dateStr = task.dateOverride || formatDate(target);
    if (!task.dateOverride && target > deadline) dateStr = SECPLUS_START_DATE;

    const day = daysList.find(d => d.date === dateStr);
    if (!day) return;

    day.tasks.push({
      id: `${dateStr}_${task.id}`,
      category: "secplus",
      title: task.title,
      duration: task.duration,
      completed: false,
      link: task.link,
      planDay: task.planDay,
      source: "base"
    });
  });
}

// 7. SCHEDULER ENGINE - TASK DISTRIBUTOR / REFLOW ENGINE
// Distributes a backlog of curriculum tasks onto future days (from `startDayIndex` onwards)
// respecting max capacities, India trip constraints, and sequencing rules.
function distributeCurriculumTasks(daysArray, backlog, startDayIndex) {
  // Clear any existing curriculum tasks from the days we are reflowing.
  // Keep completed tasks and all fixed/routine categories — only the curriculum
  // tracks (portswigger/aws/secplus/projects) get redistributed.
  // Only base-owned tasks inside the base window are ever removed; extension
  // and user tasks are never touched, completed or not.
  const KEEP_CATS = BASE_ROUTINE_CATS;
  for (let i = startDayIndex; i < daysArray.length; i++) {
    if (daysArray[i].date > BASE_SCHEDULE_END) continue;
    daysArray[i].tasks = daysArray[i].tasks.filter(t =>
      t.completed || t.source !== "base" || KEEP_CATS.has(t.category));
  }

  let backlogIndex = 0;
  
  for (let i = startDayIndex; i < daysArray.length; i++) {
    if (backlogIndex >= backlog.length) break;
    
    const day = daysArray[i];
    if (day.date > BASE_SCHEDULE_END) break;
    
    // Rule: PortSwigger (Track 1) runs June 13 - June 27, but drops to 0 hrs during India trip (starts June 24).
    // AWS runs first week (exam June 23).
    // Security+ starts August 1, exam August 25.
    // Projects run after Security+ exam (Aug 26+).
    // So we apply constraints based on date ranges:
    const isIndia = day.isIndia;
    
    if (isIndia) {
      // India Trip (reduced workload): Max 2-3 hours.
      // Already fully packed with AHF, LeetCode, and INFO 310 routines.
      // NO curriculum study blocks can be placed here.
      continue; 
    }
    
    // Calculate current scheduled hours from routines
    let scheduledHours = day.tasks.reduce((sum, t) => sum + t.duration, 0);

    // Allow slight capacity stretch in August to fit all curriculum before Sep 1
    const effectiveCap = (day.date >= SECPLUS_START_DATE && day.date <= BASE_SCHEDULE_END)
      ? day.maxCapacity + 1.0 : day.maxCapacity;

    // Distribute tasks on this day up to its maxCapacity
    while (scheduledHours < effectiveCap && backlogIndex < backlog.length) {
      const task = backlog[backlogIndex];
      
      // Check date availability constraints for the specific track:
      if (task.category === "portswigger") {
        // PortSwigger must end before/by India trip overlap (June 24).
        if (day.date >= INDIA_START_STR) {
          // Cannot schedule PortSwigger after India trip starts.
          // In baseline generation, it is forced to fit before June 24.
          // During rollovers, if it cascades past June 24, we push it to July 9 (after India trip).
          if (day.date < "2026-07-09") {
            break; // Skip scheduling PortSwigger during India trip, try next days
          }
        }
      }
      
      if (task.category === "secplus") {
        if (day.date < SECPLUS_START_DATE) {
          break;
        }
      }

      if (task.category === "projects") {
        if (day.date < SECPLUS_START_DATE) {
          break;
        }
      }

      const availableSpace = effectiveCap - scheduledHours;

      if (availableSpace >= 0.5) {
        if (task.duration <= availableSpace) {
          // Task fits fully
          day.tasks.push({
            id: `${day.date}_curr_${backlogIndex}_${task.category}`,
            category: task.category,
            title: task.title,
            duration: task.duration,
            completed: false,
            link: task.link,
            source: "base",
            ...(task.exam ? { exam: true } : {})
          });
          scheduledHours += task.duration;
          backlogIndex++;
        } else {
          // Task fits partially. Split it!
          const part1Duration = Math.round(availableSpace * 10) / 10;
          if (part1Duration >= 0.5) {
            day.tasks.push({
              id: `${day.date}_curr_${backlogIndex}_${task.category}_p1`,
              category: task.category,
              title: `${task.title} (Part A)`,
              duration: part1Duration,
              completed: false,
              link: task.link,
              source: "base"
            });
            scheduledHours += part1Duration;

            // Put Part 2 back in backlog
            const part2Duration = Math.round((task.duration - part1Duration) * 10) / 10;
            backlog[backlogIndex] = {
              category: task.category,
              title: `${task.title} (Part B)`,
              duration: part2Duration,
              link: task.link
            };
            // Do not increment backlogIndex so we process Part B on the next day
          } else {
            // Space too small to split, push task to next day
            break;
          }
        }
      } else {
        break; // No more capacity on this day
      }
    }
  }

  // If there are still tasks left in the backlog after September 1st, 
  // we create EXTRA days in the schedule to hold them, which flags the At-Risk state.
  if (backlogIndex < backlog.length) {
    let overflowDate = parseDate(BASE_SCHEDULE_END);
    
    while (backlogIndex < backlog.length) {
      overflowDate.setDate(overflowDate.getDate() + 1);
      const dateStr = formatDate(overflowDate);
      
      // Past the base window the date may already exist (plan extension).
      // Put overflow on that day instead of creating a duplicate date; the
      // tasks carry overflow:true so the next reflow can take them back.
      const existingDay = daysArray.find(d => d.date === dateStr);
      const overflowDay = existingDay || {
        date: dateStr,
        isIndia: false,
        maxCapacity: appState.settings.maxNormalDailyHours,
        tasks: [],
        rolledOver: false,
        isOverflow: true
      };
      
      let scheduledHours = existingDay ? existingDay.tasks.reduce((s, t) => s + t.duration, 0) : 0;
      if (existingDay && scheduledHours >= overflowDay.maxCapacity) continue;
      
      while (scheduledHours < overflowDay.maxCapacity && backlogIndex < backlog.length) {
        const task = backlog[backlogIndex];
        const availableSpace = overflowDay.maxCapacity - scheduledHours;
        
        if (task.duration <= availableSpace) {
          overflowDay.tasks.push({
            id: `${dateStr}_curr_${backlogIndex}_${task.category}`,
            category: task.category,
            title: task.title,
            duration: task.duration,
            completed: false,
            link: task.link,
            source: "base",
            overflow: true,
            ...(task.exam ? { exam: true } : {})
          });
          scheduledHours += task.duration;
          backlogIndex++;
        } else {
          const part1Duration = availableSpace;
          if (part1Duration >= 0.5) {
            overflowDay.tasks.push({
              id: `${dateStr}_curr_${backlogIndex}_${task.category}_p1`,
              category: task.category,
              title: `${task.title} (Part A)`,
              duration: part1Duration,
              completed: false,
              link: task.link,
              source: "base",
              overflow: true
            });
            scheduledHours += part1Duration;
            
            backlog[backlogIndex] = {
              category: task.category,
              title: `${task.title} (Part B)`,
              duration: task.duration - part1Duration,
              link: task.link
            };
          } else {
            break;
          }
        }
      }
      
      if (!existingDay) daysArray.push(overflowDay);
    }
  }
}

// 8. SMART ROLLOVER LOGIC ("I didn't finish today")
// Categories that get spread across later days by available capacity
// instead of piling onto the rollover target day.
const ROLLOVER_DISTRIBUTE = new Set(["aws", "secplus", "leetcode"]);
// Curriculum categories that get a reschedule-ledger entry for exports.
const ROLLOVER_CURRICULUM = new Set(["portswigger", "aws", "secplus", "projects"]);

// Legacy rolled-over marker. Rolled tasks are identified by `rolledFrom` now;
// the suffix is only stripped (from old saved titles and ledger keys).
function stripRolledSuffix(title) {
  return String(title || "").replace(/ \(Rolled Over\)/g, "");
}

// Exams are identified by an explicit flag, never by title text.
function isExamTask(t) {
  return !!(t && t.exam === true);
}

function shortDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function notifyUser(message, type) {
  if (typeof showAuthToast === "function" && typeof document !== "undefined" && document.body) {
    showAuthToast(message, type || "info");
  } else {
    console.log(message);
  }
}

// Rolls the uncompleted, non-fixed tasks of `dayDateStr` forward.
//   - Fixed tasks (exams, meetings, hackathon days, milestones) stay put.
//   - Target day: today if the rolled day is today or in the past, otherwise
//     the day after the rolled day.
//   - AWS / Security+ / LeetCode spread across days after the target by
//     capacity; everything else lands on the target.
//   - Rolled tasks keep every field (id, planDay, projectId, subtasks, source…)
//     and gain `rolledFrom`.
// Returns a summary { target, toTarget, distributed, leftInPlace } or null.
function forceRollover(dayDateStr) {
  const activeDayIndex = appState.days.findIndex(d => d.date === dayDateStr);
  if (activeDayIndex === -1) return null;
  const rolledDay = appState.days[activeDayIndex];

  const todayStr = getRealCurrentDate();
  let targetDay;
  if (dayDateStr <= todayStr) {
    targetDay = appState.days.find(d => d.date === todayStr);
    if (!targetDay) {
      alert("Today isn't in your plan range, so there's nowhere to roll tasks into. Nothing was changed.");
      return null;
    }
  } else {
    targetDay = appState.days.find(d => d.date > dayDateStr);
    if (!targetDay) {
      alert("There's no later day in your plan to roll these tasks into. Nothing was changed.");
      return null;
    }
  }

  // Save undo snapshot before modifying anything
  appState.rolloverUndoSnapshot = {
    days: JSON.parse(JSON.stringify(appState.days)),
    lastRolloverDay: appState.settings.lastRolloverDay,
    rescheduleLedger: JSON.parse(JSON.stringify(appState.rescheduleLedger || {})),
    fromDate: dayDateStr
  };

  rolledDay.rolledOver = true;
  appState.settings.lastRolloverDay = dayDateStr;

  const recordLedger = (t, fromDate) => {
    if (!ROLLOVER_CURRICULUM.has(t.category)) return;
    const cleanTitle = stripRolledSuffix(t.title).replace(" (Part A)", "").replace(" (Part B)", "");
    appState.rescheduleLedger = appState.rescheduleLedger || {};
    const led = appState.rescheduleLedger[cleanTitle] || { originalDate: (t.originalDate || fromDate), count: 0 };
    led.count += 1;
    led.lastMovedFrom = fromDate;
    led.movedOn = new Date().toISOString();
    appState.rescheduleLedger[cleanTitle] = led;
  };

  // Only the day you actually rolled over is touched.
  const toDistribute = [];
  const toTarget = [];
  const leftInPlace = [];
  rolledDay.tasks.forEach(t => {
    if (t.completed) return;
    if (t.fixed) { leftInPlace.push(t); return; }
    recordLedger(t, rolledDay.date);
    const moved = Object.assign({}, t, {
      title: stripRolledSuffix(t.title),
      completed: false,
      rolledFrom: rolledDay.date,
      originalDate: t.originalDate || rolledDay.date,
      rescheduleCount: (t.rescheduleCount || 0) + 1,
      updatedAt: Date.now()
    });
    (ROLLOVER_DISTRIBUTE.has(t.category) ? toDistribute : toTarget).push(moved);
  });
  rolledDay.tasks = rolledDay.tasks.filter(t => t.completed || t.fixed);

  // 1. Everything else goes onto the target day.
  toTarget.forEach(t => targetDay.tasks.push(t));

  // 2. AWS / Security+ / LeetCode spread across later days with spare capacity
  //    (skip India-trip days). Security+ first so it lands soonest.
  const distOrder = { secplus: 1, aws: 2, leetcode: 3 };
  toDistribute.sort((a, b) => (distOrder[a.category] || 9) - (distOrder[b.category] || 9));

  const candidateDays = appState.days.filter(d => d.date > targetDay.date && !d.isIndia);
  const loadOf = (day) => day.tasks.reduce((s, t) => s + (t.duration || 0), 0);
  const distributed = [];
  toDistribute.forEach(t => {
    const dest = candidateDays.find(d => loadOf(d) + (t.duration || 0) <= d.maxCapacity) || targetDay;
    dest.tasks.push(t);
    distributed.push({ task: t, date: dest.date });
  });

  const summary = { target: targetDay.date, toTarget, distributed, leftInPlace };
  appState.lastRolloverSummary = {
    from: dayDateStr,
    target: targetDay.date,
    movedToTarget: toTarget.length,
    distributed: distributed.map(d => ({ id: d.task.id, date: d.date })),
    leftInPlace: leftInPlace.map(t => t.id)
  };

  saveState();
  applyCategoryColors();
  initUI();
  showDayDetails(dayDateStr);
  notifyUser(describeRollover(summary));
  playSynthSound("warning");
  return summary;
}

function describeRollover(summary) {
  const parts = [];
  if (summary.toTarget.length) parts.push(`${summary.toTarget.length} → ${shortDate(summary.target)}`);
  if (summary.distributed.length) {
    const dates = [...new Set(summary.distributed.map(d => d.date))].sort();
    const onTarget = dates.length === 1 && dates[0] === summary.target;
    parts.push(onTarget
      ? `${summary.distributed.length} study → ${shortDate(summary.target)} (no room later)`
      : dates.length === 1
        ? `${summary.distributed.length} study → ${shortDate(dates[0])}`
        : `${summary.distributed.length} study spread ${shortDate(dates[0])}–${shortDate(dates[dates.length - 1])}`);
  }
  if (summary.leftInPlace.length) parts.push(`${summary.leftInPlace.length} fixed left in place`);
  return parts.length ? `Rolled over: ${parts.join(" · ")}` : "Nothing to roll over.";
}

function undoRollover() {
  const snap = appState.rolloverUndoSnapshot;
  if (!snap) return alert("Nothing to undo.");
  appState.days = snap.days;
  appState.settings.lastRolloverDay = snap.lastRolloverDay;
  appState.rescheduleLedger = snap.rescheduleLedger;
  appState.rolloverUndoSnapshot = null;
  saveState();
  initUI();
  showDayDetails(snap.fromDate);
  playSynthSound("click");
}

// One-time repair for schedules damaged by the old multi-day rollover (which
// swept every day from the plan start through the rolled day). Rebuilds any
// day that's missing its original tasks from a freshly generated pristine
// schedule, removes the rolled-over piles, and preserves completion
// checkmarks. Run from the console: repairRolloverDamage()
function repairRolloverDamage(silent) {
  const cleanTitle = (s) => (s || "")
    .replace(/ \(Part [AB]\)/g, "")
    .replace(/ \(Rolled Over\)/g, "")
    .trim();

  // Build a pristine schedule without losing the real one.
  const realDays = appState.days;
  generateBaseSchedule();          // overwrites appState.days with pristine
  const pristine = appState.days;
  appState.days = realDays;        // restore the user's actual days
  const pristineByDate = {};
  pristine.forEach(d => { pristineByDate[d.date] = d; });

  // 1. Remove every rolled-over dumped task (these are the displaced copies).
  let removedRolled = 0;
  appState.days.forEach(d => {
    const before = d.tasks.length;
    d.tasks = d.tasks.filter(t => !t.rolledFrom);
    removedRolled += before - d.tasks.length;
  });

  // 2. For each day, re-add any pristine task that's now missing, preserving
  //    completion if that task title was completed on that day.
  let restoredTasks = 0, repairedDays = 0;
  appState.days.forEach(d => {
    const pris = pristineByDate[d.date];
    if (!pris) return;
    const completedTitles = new Set(
      d.tasks.filter(t => t.completed).map(t => cleanTitle(t.title))
    );
    const currentTitles = new Set(d.tasks.map(t => cleanTitle(t.title)));
    let added = 0;
    pris.tasks.forEach(pt => {
      if (!currentTitles.has(cleanTitle(pt.title))) {
        const copy = JSON.parse(JSON.stringify(pt));
        if (completedTitles.has(cleanTitle(pt.title))) copy.completed = true;
        d.tasks.push(copy);
        added++;
      }
    });
    if (added) { repairedDays++; restoredTasks += added; }
  });

  appState.rolloverUndoSnapshot = null;
  appState.settings.lastRolloverDay = null;
  saveState();
  applyCategoryColors();
  initUI();
  const summary = `Repair complete: restored ${restoredTasks} task(s) across ${repairedDays} day(s), removed ${removedRolled} rolled-over copy(ies).`;
  console.log(summary);
  if (!silent) alert(summary);
  else if (typeof showAuthToast === "function" && (restoredTasks || removedRolled)) {
    showAuthToast("✅ Schedule restored — " + restoredTasks + " tasks recovered.", "success");
  }
  return { restoredTasks, repairedDays, removedRolled };
}
window.repairRolloverDamage = repairRolloverDamage;

// One-time auto-repair: runs once on the next load to undo damage from the old
// multi-day rollover, then sets a flag so it never runs again (future rollovers
// are left alone). Safe no-op on an already-clean schedule.
function maybeAutoRepairRollover() {
  appState.settings = appState.settings || {};
  if (appState.settings.rolloverRepairV1Done) return;
  try {
    repairRolloverDamage(true);
  } catch (e) {
    console.error("Auto-repair failed:", e);
  }
  appState.settings.rolloverRepairV1Done = true;
  saveState();
}

// Categories the base generator adds as fixed daily/weekly routines.
const BASE_ROUTINE_CATS = new Set(["ahf", "leetcode", "palana", "palana_security", "github", "mentor", "winfo", "personal"]);

// Tags every task that has no `source` yet with who owns it. New tasks are
// tagged at creation; this infers it for states saved before the field
// existed. Only untagged tasks are touched, so it is safe to run every load.
// Inference rules, in order:
//   1. id contains "_x_" or planExtension:true  -> "extension"
//      (plan-extension-2026.js namespaces every id with _x_ and sets planExtension)
//   2. createdByChatbot, id contains "_custom_", or category "custom" -> "user"
//      (manual add-task ids are `${date}_custom_${ts}`; the chatbot sets createdByChatbot)
//   3. rolled-over copies (rolledFrom set) keep the owner of where they came
//      from: rolledFrom inside the base window -> "base", later -> "extension"
//   4. everything else was produced by app.js's generator, reflow, backfill or
//      rollover-repair (_ahf_, _leetcode_, _msoa_, _curr_, Sec+ plan ids, …) -> "base".
//      A "base" task dated after BASE_SCHEDULE_END is residue of the old reflow
//      bug; repairReflowDamage() cleans those up.
function inferTaskSources() {
  (appState.days || []).forEach(day => {
    (day.tasks || []).forEach(t => {
      if (t.source) return;
      const id = String(t.id || "");
      if (id.includes("_x_") || t.planExtension) t.source = "extension";
      else if (t.createdByChatbot || id.includes("_custom_") || t.category === "custom") t.source = "user";
      else if (t.rolledFrom) t.source = t.rolledFrom <= BASE_SCHEDULE_END ? "base" : "extension";
      else t.source = "base";
    });
  });
}

// One-time repair for states damaged by the old reflow, which deleted every
// unfinished extension task after Sept 2 and stacked summer routines on
// Sept–Dec. Removes unfinished base routines dated after the base window, then
// re-inserts any extension task whose id is missing (additive; never changes
// an existing task's completion).
function repairReflowDamage() {
  appState.settings = appState.settings || {};
  if (appState.settings.reflowRepairV1Done) return false;
  inferTaskSources();
  let removed = 0;
  appState.days.forEach(day => {
    if (day.date <= BASE_SCHEDULE_END) return;
    const before = day.tasks.length;
    day.tasks = day.tasks.filter(t => !(t.source === "base" && !t.completed && !t.rolledFrom && BASE_ROUTINE_CATS.has(t.category)));
    removed += before - day.tasks.length;
  });
  let inserted = 0;
  if (typeof extendPlanThroughDec2026 === "function") {
    inserted = extendPlanThroughDec2026({ additiveOnly: true }) || 0;
  }
  appState.settings.reflowRepairV1Done = true;
  if (removed || inserted) console.log(`Reflow repair: removed ${removed} stray base routine(s), restored ${inserted} extension task(s).`);
  return { removed, inserted };
}
window.repairReflowDamage = repairReflowDamage;

// Reflows scheduled hours if Palana Project toggle or settings are modified.
// Does NOT lock any days, just reflows the future curriculum.
function reflowRemainingCurriculum() {
  if (demoMode) return; // would schedule the real curriculum into the sample days
  inferTaskSources();
  const inBase = (day) => day.date <= BASE_SCHEDULE_END;
  const isBase = (t) => t.source === "base";

  // Find current date or last rollover date to start reflowing
  let startReflowIndex = 0;
  if (appState.settings.lastRolloverDay) {
    const idx = appState.days.findIndex(d => d.date === appState.settings.lastRolloverDay);
    if (idx !== -1) {
      startReflowIndex = idx + 1;
    }
  }

  // Blind 75 seqs held by base-window tasks that survive this reflow (before
  // the reflow start, completed, or not base-owned). Top-ups take the lowest
  // seq not in this set. Only the base window counts: the plan extension runs
  // its own continuation and later review cycles through all 75, which would
  // otherwise leave nothing for the summer. Backfilled filler holds no seq.
  const usedSeqs = new Set();
  appState.days.forEach((d, i) => d.tasks.forEach(t => {
    if (t.category !== "leetcode" || !t.blind75Seq || t.backfilled || !inBase(d)) return;
    if (i < startReflowIndex || t.completed || !isBase(t)) usedSeqs.add(t.blind75Seq);
  }));

  // Snapshot the uncompleted curriculum backlog BEFORE rebuilding routines below,
  // because that rebuild clears each day's task list. (Without this, toggling
  // Palana/settings would silently wipe all PortSwigger/AWS/Sec+ tasks.)
  const curriculumBacklog = [];
  for (let i = startReflowIndex; i < appState.days.length; i++) {
    if (!inBase(appState.days[i])) continue;
    appState.days[i].tasks.forEach(t => {
      if (!isBase(t)) return;
      // Security+ is placed by applySecplusDailyPlan, not by capacity-based reflow.
      // Skip incomplete Sec+ tasks here so they're dropped and re-issued from the fixed plan.
      if (t.category === "secplus") return;
      // Only curriculum tracks are backlog. A rolled task is judged by its
      // category like any other (routines stay put, projects are rebuilt below).
      const isCurriculum = t.category === "portswigger" || t.category === "aws";
      if (!t.completed && isCurriculum) {
        curriculumBacklog.push({
          category: t.category,
          title: stripRolledSuffix(t.title).replace(" (Part A)", "").replace(" (Part B)", ""),
          duration: t.duration,
          link: t.link,
          exam: t.exam
        });
      }
    });
  }

  // Re-generate fixed routines for days >= startReflowIndex (to apply Palana/capacity edits)
  for (let i = startReflowIndex; i < appState.days.length; i++) {
    const day = appState.days[i];
    // Base routines are never added after the base window (rule: reflow only
    // regenerates what generateBaseSchedule owns, where it owns it).
    if (!inBase(day)) continue;
    
    // Keep completed tasks and everything the base generator doesn't own.
    day.tasks = day.tasks.filter(t => t.completed || !isBase(t));
    
    // Update maxCapacity based on new settings
    day.maxCapacity = getBaseCapacityForDay(day.date, appState.settings.maxNormalDailyHours);
    const baseHas = (pred) => day.tasks.some(t => isBase(t) && pred(t));
    
    // Re-add routines if they were not already completed
    const dayOfWeek = getDayOfWeek(day.date);
    const isIndia = day.isIndia;
    
    // AHF — use detailed tasks when available
    if (!baseHas(t => t.category === "ahf")) {
      buildAHFTasksForDay(day.date).forEach(t => day.tasks.push(t));
    }
    
    // LeetCode — Microsoft OA prep override (Aug 11-17) uses a fixed 6-problem set;
    // otherwise, 2 Blind 75 problems per day from LEETCODE_START_2PERDAY onward.
    const existingLc = day.tasks.filter(t => isBase(t) && t.category === "leetcode" && !t.rolledFrom);
    const msOaSet = (typeof MICROSOFT_OA_OVERRIDE !== "undefined") ? MICROSOFT_OA_OVERRIDE[day.date] : null;
    if (msOaSet) {
      const existingIds = new Set(existingLc.map(t => t.leetcodeNumber));
      msOaSet.forEach((p, i) => {
        if (existingIds.has(p.id)) return;
        day.tasks.push({
          id: `${day.date}_msoa_${i + 1}`,
          category: "leetcode",
          title: `Microsoft OA Prep: LC #${p.id} - ${p.name}`,
          duration: 0.75,
          completed: false,
          link: p.link,
          leetcodeNumber: p.id,
          microsoftOA: true
        });
      });
    } else if (day.date >= LEETCODE_START_2PERDAY) {
      const targetCount = 2;
      const needed = targetCount - existingLc.length;
      for (let j = 0; j < needed; j++) {
        const problem = BLIND_75_QUESTIONS.find(q => !usedSeqs.has(q.seq));
        if (!problem) break;
        usedSeqs.add(problem.seq);
        let n = 1;
        while (day.tasks.some(t => t.id === `${day.date}_leetcode_${n}`)) n++;
        day.tasks.push({
          id: `${day.date}_leetcode_${n}`,
          category: "leetcode",
          title: blind75Title(problem),
          duration: 0.5,
          completed: false,
          link: problem.link,
          leetcodeNumber: problem.lc,
          blind75Seq: problem.seq
        });
      }
    }

    // (INFO 310 course removed — tracked separately in Canvas.)

    // Palana prep / security (array return)
    if (!baseHas(t => t.category === "palana" || t.category === "palana_security")) {
      buildPalanaTaskForDay(day.date, dayOfWeek, isIndia).forEach(t => day.tasks.push(t));
    }

    // Git Developer Productivity Tool roadmap
    if (typeof buildGitProjectTasksForDay === "function" && day.date >= "2026-06-15") {
      if (!baseHas(t => t.category === "github")) {
        buildGitProjectTasksForDay(day.date, dayOfWeek, isIndia).forEach(t => day.tasks.push(t));
      }
    }

    // Mentor meetings (fixed recurring)
    if (!baseHas(t => t.category === "mentor")) {
      buildMentorTasksForDay(day.date).forEach(t => day.tasks.push(t));
    }

    // WINFO — Finance Director duties (Tuesdays)
    if (!baseHas(t => t.category === "winfo")) {
      buildWinfoTasksForDay(day.date).forEach(t => day.tasks.push(t));
    }

    day.tasks.forEach(t => { if (!t.source) t.source = "base"; });
  }

  // Remove overflow (recreated during distribution if the plan runs long).
  // Overflow is base-owned scratch, so this is the one place base tasks past
  // BASE_SCHEDULE_END are removed.
  appState.days = appState.days.filter(d => !d.isOverflow);
  appState.days.forEach(d => {
    d.tasks = d.tasks.filter(t => !(t.overflow && isBase(t) && !t.completed));
  });

  // Track which project tasks are already completed anywhere in the plan
  // so we don't re-schedule them when rebuilding the project backlog.
  const completedProjectTitles = new Set();
  appState.days.forEach(day => {
    day.tasks.forEach(t => {
      if (t.category === "projects" && t.completed) {
        const clean = stripRolledSuffix(t.title).replace(" (Part A)", "").replace(" (Part B)", "");
        completedProjectTitles.add(clean);
      }
    });
  });

  // Rebuild project backlog from scratch using currently selected projects.
  // Only include tasks that haven't been completed yet.
  appState.settings.selectedProjects.forEach(projId => {
    const proj = TRACK_4_PROJECTS.find(p => p.id === projId);
    if (proj) {
      proj.tasks.forEach(t => {
        if (!completedProjectTitles.has(t.name)) {
          curriculumBacklog.push({
            category: "projects",
            title: t.name,
            duration: t.duration,
            link: "https://bestprojectideas.com/cybersecurity-project-ideas/"
          });
        }
      });
    }
  });

  // Sort portswigger/aws first, then projects. Sec+ is handled separately by applySecplusDailyPlan.
  const reflowOther = curriculumBacklog.filter(t => t.category !== "projects");
  const reflowProj = curriculumBacklog.filter(t => t.category === "projects");
  const categoryOrder = { "portswigger": 1, "aws": 2 };
  reflowOther.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));
  curriculumBacklog.length = 0;
  reflowOther.forEach(t => curriculumBacklog.push(t));
  reflowProj.forEach(t => curriculumBacklog.push(t));

  // Distribute non-Sec+ curriculum
  distributeCurriculumTasks(appState.days, curriculumBacklog, startReflowIndex);

  // Apply the fixed 30-day Security+ plan (preserves completed Sec+ tasks by planDay)
  applySecplusDailyPlan(appState.days);

  // Save State and Render
  saveState();
  initUI();
}

// 9. LOCAL STORAGE PERSISTENCE & MIGRATION
// ⭐ NEW: Task Notes System Functions
function initializeTaskNotes() {
  if (!appState.taskNotes) appState.taskNotes = {};
}

function getTaskNotes(taskId) {
  initializeTaskNotes();
  const n = appState.taskNotes[taskId];
  if (!n) return { text: "", plannedOutcome: "", actualOutcome: "", learned: "", blockers: "", nextStep: "", links: "", lastUpdated: null };
  if (typeof n === "string") return { text: n, plannedOutcome: "", actualOutcome: "", learned: "", blockers: "", nextStep: "", links: "", lastUpdated: null };
  return n;
}

function saveTaskNote(taskId, noteObj) {
  initializeTaskNotes();
  appState.taskNotes[taskId] = Object.assign({}, noteObj, { lastUpdated: new Date().toISOString() });
  saveState();
}

function taskHasNotes(taskId) {
  const n = getTaskNotes(taskId);
  return !!(n.text || n.plannedOutcome || n.actualOutcome || n.learned || n.blockers || n.nextStep || n.links);
}

function deleteTaskNote(taskId) {
  if (appState.taskNotes) delete appState.taskNotes[taskId];
  saveState();
}

// ⭐ NEW: Render Task Notes Modal
function showTaskNotesModal(taskId, taskTitle) {
  const notes = getTaskNotes(taskId);
  const modal = document.getElementById("task-notes-modal");
  const modalTitle = document.getElementById("task-notes-modal-title");
  const saveBtn = document.getElementById("task-notes-save-btn");
  const deleteBtn = document.getElementById("task-notes-delete-btn");
  const fields = ["task-notes-text", "task-notes-planned", "task-notes-actual", "task-notes-learned", "task-notes-blockers", "task-notes-next", "task-notes-links"];
  const keys = ["text", "plannedOutcome", "actualOutcome", "learned", "blockers", "nextStep", "links"];

  modalTitle.textContent = `Notes: ${taskTitle}`;
  fields.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.value = notes[keys[i]] || "";
  });
  const updatedEl = document.getElementById("task-notes-updated");
  if (updatedEl) updatedEl.textContent = notes.lastUpdated ? "Last updated: " + new Date(notes.lastUpdated).toLocaleString() : "";

  const closeNotesModal = () => {
    modal.classList.remove("open");
    document.getElementById("overlay-backdrop").classList.remove("active");
  };

  saveBtn.onclick = () => {
    const noteObj = {};
    fields.forEach((id, i) => { const el = document.getElementById(id); noteObj[keys[i]] = el ? el.value : ""; });
    saveTaskNote(taskId, noteObj);
    closeNotesModal();
    playSynthSound("success");
    if (selectedDate) showDayDetails(selectedDate);
    renderTodaySection();
  };

  deleteBtn.onclick = () => {
    if (confirm("Delete notes for this task?")) {
      deleteTaskNote(taskId);
      closeNotesModal();
      playSynthSound("click");
    }
  };

  modal.classList.add("open");
  document.getElementById("overlay-backdrop").classList.add("active");
}

// ── Category management ──────────────────────────────────────────────────────
function openCategoryManager() {
  renderCategoryList();
  document.getElementById("category-modal").classList.add("open");
  document.getElementById("overlay-backdrop").classList.add("active");
}

function closeCategoryManager() {
  document.getElementById("category-modal").classList.remove("open");
  document.getElementById("overlay-backdrop").classList.remove("active");
}

function renderCategoryList() {
  const list = document.getElementById("category-list");
  if (!list) return;
  const cats = getAllCategories();
  const sorted = Object.values(cats).sort((a, b) => (a.order || a.priority || 99) - (b.order || b.priority || 99));
  list.innerHTML = "";

  sorted.forEach(cat => {
    const row = document.createElement("div");
    row.className = `cat-row ${cat.archived ? "cat-archived" : ""}`;
    row.dataset.id = cat.id;

    row.innerHTML = `
      <div class="cat-row-summary">
        <span class="cat-color-dot" style="background:${escapeHtml(cat.color)}"></span>
        <span class="cat-row-icon">${escapeHtml(cat.icon)}</span>
        <span class="cat-row-name">${escapeHtml(cat.name)}</span>
        <span class="cat-row-meta">${escapeHtml(cat.weeklyTarget || 0)}h/wk</span>
        ${cat.required ? '<span class="cat-required-badge">Required</span>' : ""}
        ${cat.archived ? '<span class="cat-archived-badge">Archived</span>' : ""}
        <button class="cat-edit-toggle" title="Edit">✎</button>
        ${!cat.builtIn ? `<button class="cat-delete-btn" title="Delete">✕</button>` : ""}
      </div>
      <div class="cat-edit-inline" style="display:none">
        <div class="cat-edit-row">
          <label>Color</label>
          <input type="color" class="cat-inline-color" value="${escapeHtml(cat.color)}">
        </div>
        <div class="cat-edit-row">
          <label>Icon</label>
          <input type="text" class="cat-inline-icon form-input" value="${escapeHtml(cat.icon)}" maxlength="4">
        </div>
        ${!cat.builtIn ? `
        <div class="cat-edit-row">
          <label>Name</label>
          <input type="text" class="cat-inline-name form-input" value="${escapeHtml(cat.name)}">
        </div>` : ""}
        <div class="cat-edit-row">
          <label>h/wk</label>
          <input type="number" class="cat-inline-weekly form-input" value="${escapeHtml(cat.weeklyTarget || 0)}" min="0" step="0.5">
        </div>
        <div class="cat-edit-actions">
          ${!cat.builtIn ? `<button class="cat-archive-btn">${cat.archived ? "Restore" : "Archive"}</button>` : ""}
          <button class="cat-save-btn">Save</button>
        </div>
      </div>
    `;

    // Toggle edit panel
    row.querySelector(".cat-edit-toggle").addEventListener("click", () => {
      const panel = row.querySelector(".cat-edit-inline");
      const isOpen = panel.style.display !== "none";
      // Close all others
      list.querySelectorAll(".cat-edit-inline").forEach(p => p.style.display = "none");
      panel.style.display = isOpen ? "none" : "block";
    });

    // Live color preview on the dot
    const colorInput = row.querySelector(".cat-inline-color");
    const dot = row.querySelector(".cat-color-dot");
    colorInput.addEventListener("input", () => { dot.style.background = colorInput.value; });

    // Save
    row.querySelector(".cat-save-btn").addEventListener("click", () => {
      const color = row.querySelector(".cat-inline-color").value;
      const icon = row.querySelector(".cat-inline-icon").value || cat.icon;
      const weekly = parseFloat(row.querySelector(".cat-inline-weekly").value) || 0;

      if (cat.builtIn) {
        // Persist color + icon overrides for built-ins in appState
        appState.categoryOverrides = appState.categoryOverrides || {};
        appState.categoryOverrides[cat.id] = { color, icon, weeklyTarget: weekly };
        BUILT_IN_CATEGORIES[cat.id].color = color;
        BUILT_IN_CATEGORIES[cat.id].icon = icon;
        BUILT_IN_CATEGORIES[cat.id].weeklyTarget = weekly;
      } else {
        const nameEl = row.querySelector(".cat-inline-name");
        appState.categories[cat.id] = Object.assign({}, appState.categories[cat.id], {
          color, icon, weeklyTarget: weekly,
          name: nameEl ? nameEl.value || cat.name : cat.name
        });
      }
      saveState();
      applyCategoryColors();   // update CSS vars so every view recolors
      renderCategoryList();
      renderCalendarDays();
      populateCategorySelects();
      renderTracksChecklists();
      renderTodaySection();
      playSynthSound("success");
    });

    // Archive toggle
    const archiveBtn = row.querySelector(".cat-archive-btn");
    if (archiveBtn) {
      archiveBtn.addEventListener("click", () => {
        appState.categories[cat.id].archived = !appState.categories[cat.id].archived;
        saveState();
        renderCategoryList();
      });
    }

    // Delete
    const deleteBtn = row.querySelector(".cat-delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => deleteCategory(cat.id));
    }

    list.appendChild(row);
  });
}

function addNewCategory() {
  const name = document.getElementById("cat-new-name").value.trim();
  if (!name) {
    document.getElementById("cat-new-name").focus();
    return;
  }
  const id = "custom_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) + "_" + Date.now();
  appState.categories[id] = {
    id, name,
    icon: document.getElementById("cat-new-icon").value || "✨",
    color: document.getElementById("cat-new-color").value || "#c5b3fa",
    weeklyTarget: parseFloat(document.getElementById("cat-new-weekly").value) || 0,
    priority: 50, order: 50,
    exportEnabled: true, active: true, archived: false
  };
  saveState();
  document.getElementById("cat-new-name").value = "";
  renderCategoryList();
  populateCategorySelects();
  playSynthSound("success");
}

function deleteCategory(catId) {
  if (BUILT_IN_CATEGORIES[catId]) return alert("Built-in categories cannot be deleted.");
  if (!confirm("Delete this category? Tasks will be preserved under 'custom'.")) return;
  appState.days.forEach(day => {
    day.tasks.forEach(t => { if (t.category === catId) t.category = "custom"; });
  });
  // Extracurriculars pointing at the deleted category fall back to 'custom' too,
  // and any saved colour/icon override for it goes with it.
  (appState.extracurriculars || []).forEach(ec => { if (ec.categoryId === catId) ec.categoryId = "custom"; });
  if (appState.categoryOverrides) delete appState.categoryOverrides[catId];
  delete appState.categories[catId];
  saveState();
  renderCategoryList();
  populateCategorySelects();
}

function populateCategorySelects() {
  const sel = document.getElementById("new-task-category");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  Object.values(getAllCategories()).filter(c => !c.archived).sort((a, b) => (a.order || 99) - (b.order || 99)).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

// ── Task action helpers ──────────────────────────────────────────────────────
// Returns false (and changes nothing) when the hours aren't a number.
function markTaskPartial(task, day, completedHours) {
  if (!Number.isFinite(completedHours)) {
    alert("Enter the hours completed as a number, e.g. 1.5. Nothing was recorded.");
    return false;
  }
  const done = Math.max(0, Math.min(task.duration, completedHours));
  task.completedMinutes = Math.round(done * 60);
  task.remainingMinutes = Math.round((task.duration - done) * 60);
  task.status = done >= task.duration ? "done" : "partial";
  task.completed = done >= task.duration;
  touchTask(task);
  if (task.completed) {
    task.completedOnDate = day.date;
    task.completedAt = new Date().toISOString();
  }
  saveState();
  return true;
}

// Returns true if the task moved, false if it bailed out (fixed task, no next
// day, or a full day) — callers skip re-rendering in that case.
function moveTaskToTomorrow(task, day) {
  if (task.fixed) { alert("Fixed meetings cannot be moved automatically."); return false; }
  const idx = appState.days.findIndex(d => d.date === day.date);
  if (idx === -1 || idx + 1 >= appState.days.length) return false;
  const tomorrow = appState.days[idx + 1];
  if (tomorrow.tasks.reduce((s, t) => s + t.duration, 0) + task.duration > tomorrow.maxCapacity) {
    alert("Tomorrow is at capacity. Use Reschedule or Force Rollover.");
    return false;
  }
  day.tasks = day.tasks.filter(t => t.id !== task.id);
  task.originalDate = task.originalDate || day.date;
  task.rescheduleCount = (task.rescheduleCount || 0) + 1;
  touchTask(task);
  tomorrow.tasks.push(task);
  appState.rescheduleLedger = appState.rescheduleLedger || {};
  const key = stripRolledSuffix(task.title).trim();
  const led = appState.rescheduleLedger[key] || { originalDate: task.originalDate, count: 0 };
  led.count++; led.lastMovedFrom = day.date; led.movedOn = planToday();
  appState.rescheduleLedger[key] = led;
  saveState();
  renderDashboardMetrics();
  renderCalendarDays();
  showDayDetails(tomorrow.date);
  return true;
}

// Moves a task between days. The id never changes, so notes keyed by id
// (appState.taskNotes) follow the task.
function moveTaskToDate(task, fromDate, toDate) {
  if (!task || fromDate === toDate) return false;
  const fromDay = appState.days.find(d => d.date === fromDate);
  const toDay = appState.days.find(d => d.date === toDate);
  if (!fromDay || !toDay) return false;
  fromDay.tasks = fromDay.tasks.filter(t => t.id !== task.id);
  task.originalDate = task.originalDate || fromDate;
  task.rescheduleCount = (task.rescheduleCount || 0) + 1;
  touchTask(task);
  toDay.tasks.push(task);
  return true;
}

function skipTask(task, day) {
  task.status = "skipped";
  task.completed = false;
  touchTask(task);
  saveState();
  showDayDetails(day.date);
}

function blockTask(task, day) {
  task.status = "blocked";
  touchTask(task);
  saveState();
  showDayDetails(day.date);
}

// ── Today dashboard section ──────────────────────────────────────────────────
function renderTodaySection() {
  const container = document.getElementById("today-section-container");
  if (!container) return;
  const today = planToday();
  const day = appState.days.find(d => d.date === today);
  if (!day) { container.innerHTML = "<p>No tasks for today.</p>"; return; }

  const formatted = parseDate(today).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  // Retired tracks (PortSwigger) are excluded from the daily checklist.
  const todayTasks = day.tasks.filter(t => (typeof isSurfacedTask === "function") ? isSurfacedTask(t) : true);
  const total = todayTasks.reduce((s, t) => s + t.duration, 0);
  const done = todayTasks.filter(t => t.completed).length;
  const pending = todayTasks.filter(t => !t.completed);

  container.innerHTML = `
    <div class="today-section-header">
      <h3>📅 TODAY — ${formatted}</h3>
      <span class="today-stats">${done}/${todayTasks.length} done · ${total.toFixed(1)}h scheduled · ${day.maxCapacity}h capacity</span>
    </div>
    <div class="today-task-list">
      ${pending.length === 0 ? '<p class="today-all-done">All tasks complete for today! 🎉</p>' :
        pending.map(t => {
          const cat = getCategoryDef(t.category);
          return `<div class="today-task-row cat-${escapeHtml(t.category)}" onclick="showDayDetails('${today}')">
            <span class="today-cat-badge" style="border-color:${escapeHtml(cat.color)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.name || t.category)}</span>
            <span class="today-task-title">${escapeHtml(t.title)}</span>
            <span class="today-task-dur">${t.duration}h</span>
            ${taskHasNotes(t.id) ? '<span class="notes-dot">📝</span>' : ''}
            ${t.milestone ? '<span class="milestone-badge">◆ Milestone</span>' : ''}
            ${Array.isArray(t.subtasks) && t.subtasks.length ? `<span class="subtask-count">${t.subtasks.filter(st => st.completed).length}/${t.subtasks.length}</span>` : ''}
            ${t.fixed ? '<span class="fixed-badge">Fixed</span>' : ''}
          </div>`;
        }).join("")}
    </div>
  `;
}

// ⭐ NEW: Extracurricular Summary Rendering
function renderExtracurricularSummary() {
  const container = document.getElementById("extracurricular-summary-container");
  if (!container) return;
  
  if (!appState.extracurriculars || appState.extracurriculars.length === 0) {
    container.innerHTML = `
      <div class="extracurricular-card empty">
        <p>No extracurriculars added yet. Create one to get started!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = appState.extracurriculars.map((ec, idx) => {
    const categoryDef = getCategoryDef(ec.categoryId); // includes custom categories
    const icon = categoryDef.icon || "✨";
    const color = categoryDef.color || "#ffffff";
    
    return `
      <div class="extracurricular-card" style="border-left: 4px solid ${escapeHtml(color)}">
        <div class="extracurricular-header">
          <span class="extracurricular-icon">${escapeHtml(icon)}</span>
          <div class="extracurricular-titles">
            <div class="extracurricular-name">${escapeHtml(ec.name)}</div>
            <div class="extracurricular-role">${escapeHtml(ec.role)}</div>
          </div>
          <span class="extracurricular-status ${escapeHtml(ec.status)}">${escapeHtml(ec.status.replace("-", " "))}</span>
        </div>
        <div class="extracurricular-details">
          <div class="detail-row">
            <span class="detail-label">Weekly Hours:</span>
            <span class="detail-value">${escapeHtml(ec.weeklyHours)}h</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Next Event:</span>
            <span class="detail-value">${escapeHtml(ec.nextEvent)}</span>
          </div>
          ${ec.notes ? `<div class="detail-row"><span class="detail-value notes">${escapeHtml(ec.notes)}</span></div>` : ''}
        </div>
        <div class="extracurricular-actions">
          <button class="action-btn edit-btn" onclick="editExtracurricular(${idx})">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteExtracurricular(${idx})">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

function editExtracurricular(idx) {
  const ec = appState.extracurriculars[idx];
  const modal = document.getElementById("extracurricular-modal");
  
  document.getElementById("ec-name").value = ec.name;
  document.getElementById("ec-role").value = ec.role;
  document.getElementById("ec-category").value = ec.categoryId;
  document.getElementById("ec-status").value = ec.status;
  document.getElementById("ec-weeklyHours").value = ec.weeklyHours;
  document.getElementById("ec-nextEvent").value = ec.nextEvent;
  document.getElementById("ec-notes").value = ec.notes || "";
  
  document.getElementById("ec-save-btn").onclick = () => {
    appState.extracurriculars[idx] = {
      id: ec.id,
      name: document.getElementById("ec-name").value,
      role: document.getElementById("ec-role").value,
      categoryId: document.getElementById("ec-category").value,
      status: document.getElementById("ec-status").value,
      weeklyHours: parseFloat(document.getElementById("ec-weeklyHours").value) || 0,
      nextEvent: document.getElementById("ec-nextEvent").value,
      notes: document.getElementById("ec-notes").value
    };
    saveState();
    modal.classList.remove("open");
    document.getElementById("overlay-backdrop").classList.remove("active");
    renderExtracurricularSummary();
    playSynthSound("success");
  };

  modal.classList.add("open");
  document.getElementById("overlay-backdrop").classList.add("active");
}

function deleteExtracurricular(idx) {
  if (confirm("Remove this extracurricular?")) {
    appState.extracurriculars.splice(idx, 1);
    saveState();
    renderExtracurricularSummary();
    playSynthSound("click");
  }
}

function addNewExtracurricular() {
  const modal = document.getElementById("extracurricular-modal");
  document.getElementById("extracurricular-form").reset();
  document.getElementById("ec-status").value = "active";
  
  document.getElementById("ec-save-btn").onclick = () => {
    const newEc = {
      id: `ec_${Date.now()}`,
      name: document.getElementById("ec-name").value,
      role: document.getElementById("ec-role").value,
      categoryId: document.getElementById("ec-category").value,
      status: document.getElementById("ec-status").value,
      weeklyHours: parseFloat(document.getElementById("ec-weeklyHours").value) || 0,
      nextEvent: document.getElementById("ec-nextEvent").value,
      notes: document.getElementById("ec-notes").value
    };
    if (newEc.name && newEc.role) {
      appState.extracurriculars.push(newEc);
      saveState();
      modal.classList.remove("open");
      document.getElementById("overlay-backdrop").classList.remove("active");
      renderExtracurricularSummary();
      playSynthSound("success");
    } else {
      alert("Please fill in Name and Role");
    }
  };

  modal.classList.add("open");
}

// One-time backfill: fills in June 13 – July 31 with 2 LC/day + an AHF entry
// per day, then marks every task in that window completed. Never touches Aug/Sep.
// Guarded by settings.backfillJuneJulyV1Done — call backfillJuneJulyCompleted(true)
// from the console to force-rerun.
const BACKFILL_START = "2026-06-13";
const BACKFILL_END = "2026-07-31";

function backfillJuneJulyCompleted(force) {
  appState.settings = appState.settings || {};
  if (!force && appState.settings.backfillJuneJulyV2Done) return;
  // Owner-history only: a fresh or reset plan starts with nothing checked.
  if (isFreshState()) { appState.settings.backfillJuneJulyV2Done = true; return; }
  if (!Array.isArray(appState.days) || appState.days.length === 0) return;
  if (typeof BLIND_75_QUESTIONS === "undefined") return;

  const nowIso = new Date().toISOString();
  const window = appState.days.filter(d => d.date >= BACKFILL_START && d.date <= BACKFILL_END);
  if (window.length === 0) return;

  // Snapshot Aug 1+ completion state so nothing outside Jun/Jul can drift.
  const preservedAfter = {};
  appState.days.forEach(d => {
    if (d.date < "2026-08-01") return;
    d.tasks.forEach(t => {
      preservedAfter[t.id] = {
        completed: !!t.completed,
        completedOnDate: t.completedOnDate || null,
        completedAt: t.completedAt || null,
        status: t.status || null,
        completedMinutes: t.completedMinutes || null,
        remainingMinutes: t.remainingMinutes || null
      };
    });
  });
  const preservedSettings = {
    awsExamPassed: !!appState.settings.awsExamPassed,
    securityPlusExamPassed: !!appState.settings.securityPlusExamPassed
  };

  // 1. Ensure every day has an AHF entry
  window.forEach(day => {
    if (!day.tasks.some(t => t.category === "ahf")) {
      day.tasks.push({
        id: `${day.date}_ahf_backfill`,
        category: "ahf",
        title: "AHF Work (Tech Lead Duties)",
        duration: 1.0,
        completed: false,
        link: null,
        backfilled: true,
        source: "base"
      });
    }
  });

  // 2. Ensure exactly 2 LC per day (cycle Blind 75 if we run past 75 slots).
  //    backfilled:true so the sequential Blind 75 index isn't disturbed for Aug/Sep.
  let lcCursor = 0;
  window.forEach(day => {
    const existing = day.tasks.filter(t => t.category === "leetcode").length;
    const needed = Math.max(0, 2 - existing);
    for (let k = 0; k < needed; k++) {
      const problem = BLIND_75_QUESTIONS[lcCursor % BLIND_75_QUESTIONS.length];
      lcCursor++;
      day.tasks.push({
        id: `${day.date}_leetcode_backfill_${k + 1}`,
        category: "leetcode",
        title: blind75Title(problem),
        duration: 0.5,
        completed: false,
        link: problem.link,
        leetcodeNumber: problem.lc,
        blind75Seq: problem.seq,
        backfilled: true,
        source: "base"
      });
    }
  });

  // 3. Mark every task in the window as completed — but skip exam tasks so cert
  //    badges (AWS / Sec+) stay untouched.
  const isExamTitle = (t) => /Certification Exam/i.test(t.title || "");
  window.forEach(day => {
    day.tasks.forEach(t => {
      if (t.completed || isExamTitle(t) || isExamTask(t)) return;
      t.completed = true;
      t.completedOnDate = day.date;
      t.completedAt = nowIso;
      t.status = "done";
      const dur = t.duration || 0;
      t.completedMinutes = Math.round(dur * 60);
      t.remainingMinutes = 0;
    });
  });

  // 4. Restore Aug 1+ completion state exactly as it was before this ran.
  appState.days.forEach(d => {
    if (d.date < "2026-08-01") return;
    d.tasks.forEach(t => {
      const snap = preservedAfter[t.id];
      if (!snap) return;
      t.completed = snap.completed;
      if (snap.completedOnDate) t.completedOnDate = snap.completedOnDate; else delete t.completedOnDate;
      if (snap.completedAt) t.completedAt = snap.completedAt; else delete t.completedAt;
      if (snap.status) t.status = snap.status; else delete t.status;
      if (snap.completedMinutes != null) t.completedMinutes = snap.completedMinutes; else delete t.completedMinutes;
      if (snap.remainingMinutes != null) t.remainingMinutes = snap.remainingMinutes; else delete t.remainingMinutes;
    });
  });
  appState.settings.awsExamPassed = preservedSettings.awsExamPassed;
  appState.settings.securityPlusExamPassed = preservedSettings.securityPlusExamPassed;

  appState.settings.backfillJuneJulyV2Done = true;
  saveState();
}

// One-shot cleanup: undo any auto-completion the earlier backfill made on the
// AWS/Sec+ certification exam tasks (safe to run repeatedly — only touches
// exam tasks that got auto-completed by the backfill).
function unmarkExamTasksIfBackfilled() {
  let changed = 0;
  appState.days.forEach(d => {
    // Only the Jun/Jul backfill window — later months own their own state.
    if (d.date < BACKFILL_START || d.date > BACKFILL_END) return;
    d.tasks.forEach(t => {
      if (t.completed && /Certification Exam/i.test(t.title || "")) {
        t.completed = false;
        delete t.completedOnDate;
        delete t.completedAt;
        delete t.status;
        delete t.completedMinutes;
        delete t.remainingMinutes;
        changed++;
      }
    });
  });
  if (changed) saveState();
  return changed;
}
window.unmarkExamTasksIfBackfilled = unmarkExamTasksIfBackfilled;
window.backfillJuneJulyCompleted = backfillJuneJulyCompleted;

let _saveTimer = null;
// Stamp a task as changed now. Call on every task mutation — task.updatedAt is
// what decides which device's version wins a merge (see js/sync-core.js).
// saveState() also stamps any changed task that was missed, as a safety net.
function touchTask(task) {
  if (task) task.updatedAt = Date.now();
  return task;
}

// Content snapshot of the last save, used to (a) stamp tasks that changed and
// record deletions, and (b) bump appState.meta.updatedAt only when something
// really changed — so a load-then-save with no edits doesn't look like a new
// edit to the merge rule.
let _taskFingerprints = null;
let _lastLocalPieces = null;
function resetTaskFingerprints() {
  if (typeof SyncCore === "undefined" || !appState) return;
  _taskFingerprints = SyncCore.withStamps(SyncCore.fingerprintTasks(appState), appState);
  _lastLocalPieces = SyncCore.split(appState);
}

function saveState() {
  // Write to localStorage immediately so nothing is lost. Strip the transient
  // undo snapshot first — it's a full copy of every day and would roughly
  // double the saved size for no benefit (undo only needs to work in-session).
  // While the sign-in gate is up we don't know whose progress this is yet, so
  // nothing gets written to disk. Boot-time migrations that run before auth
  // resolves simply re-run on the next load, which is harmless.
  // Demo edits live in memory only: no localStorage write, no Firestore timer.
  if (demoMode) return;
  if (!stateReady) return;
  if (typeof SyncCore !== "undefined") {
    const now = Date.now();
    SyncCore.capArchive(appState);
    _taskFingerprints = SyncCore.stampTaskChanges(appState, _taskFingerprints, now);
    const pieces = SyncCore.split(appState);
    if (!appState.meta || SyncCore.contentDiffers(pieces, _lastLocalPieces)) {
      appState.meta = { updatedAt: now, deviceId: SyncCore.getDeviceId(localStorage) };
    }
    _lastLocalPieces = pieces;
  }
  const { rolloverUndoSnapshot, ...persistable } = appState;
  localStorage.setItem("cyber_study_plan_state_2026", JSON.stringify(persistable));
  if (typeof currentUser !== "undefined" && currentUser && typeof setSyncStatus === "function") setSyncStatus("saving");
  // Debounce Firestore writes — collapse rapid saves into one network call
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    if (typeof saveStateToFirestore === "function" && currentUser) {
      saveStateToFirestore();
    }
  }, 800);
}

function loadState() {
  if (demoMode) return;
  const saved = localStorage.getItem("cyber_study_plan_state_2026");
  localStateIsPlaceholder = false;
  if (saved) {
    try {
      appState = JSON.parse(saved);
      // Validate load
      if (!appState.days || appState.days.length === 0) {
        generateNewState();
        localStateIsPlaceholder = true;
      }
      // ⭐ NEW: Migrate from simulated today to real today
      migrateToRealCurrentDate();
      resetTaskFingerprints();
    } catch (e) {
      console.error("Failed to parse state, generating new.", e);
      generateNewState();
      localStateIsPlaceholder = true;
    }
  } else {
    generateNewState();
    localStateIsPlaceholder = true;
  }
}

function blind75Title(q) { return `LeetCode #${q.lc} - ${q.name}`; }

// Which Blind 75 problem a task covers: its own blind75Seq, or — for OA and
// other tasks — the list entry with the same real LeetCode number.
function blind75SeqOf(t) {
  if (!t || t.category !== "leetcode") return null;
  if (t.blind75Seq) return t.blind75Seq;
  const q = t.leetcodeNumber != null ? BLIND_75_BY_LC[t.leetcodeNumber] : null;
  return q ? q.seq : null;
}

function countBlind75Solved(days) {
  const seqs = new Set();
  (days || []).forEach(d => (d.tasks || []).forEach(t => {
    if (t.completed) { const s = blind75SeqOf(t); if (s) seqs.add(s); }
  }));
  return seqs.size;
}

// Real LeetCode numbers of the OLD blind75.js list, indexed by its old id - 1.
// Saved Blind 75 tasks stored that old id in leetcodeId. Ids 12 (dup 3Sum),
// 25 (142), 39 (215), 58 (377) and 64 (337) are not in the canonical list, so
// they get a leetcodeNumber but no blind75Seq.
const LEGACY_BLIND75_LC = [
  1, 121, 217, 238, 53, 152, 153, 33, 15, 11,
  125, 15, 3, 424, 76, 242, 49, 20, 141, 206,
  21, 143, 19, 23, 142, 226, 104, 100, 572, 235,
  102, 98, 230, 105, 124, 297, 295, 347, 215, 39,
  79, 133, 207, 200, 417, 261, 323, 128, 269, 73,
  54, 48, 70, 322, 300, 1143, 139, 377, 198, 213,
  91, 62, 55, 337, 57, 56, 435, 252, 253, 371,
  191, 338, 190, 268, 271
];

// One-time: leetcodeId (old list position for Blind 75 tasks, real number for
// Microsoft OA tasks) -> leetcodeNumber (+ blind75Seq for Blind 75 tasks).
// Completion is untouched; the schedule is not regenerated. Rolled-over copies
// lost leetcodeId, so their old-format title "LeetCode Blind 75: #<oldId> - …"
// is used instead. Only tasks without leetcodeNumber are touched.
function migrateLeetcodeNumbers() {
  appState.settings = appState.settings || {};
  if (appState.settings.leetcodeNumbersV1Done) return false;
  const oldTitle = /^LeetCode Blind 75: #(\d+) - [^(]*?( \(.*)?$/;
  (appState.days || []).forEach(day => (day.tasks || []).forEach(t => {
    if (t.category !== "leetcode" || t.leetcodeNumber != null) return;
    const m = typeof t.title === "string" ? t.title.match(oldTitle) : null;
    const oldId = t.leetcodeId != null ? t.leetcodeId : (m ? +m[1] : null);
    if (oldId == null || oldId === 0) { delete t.leetcodeId; return; }
    const lc = t.microsoftOA ? oldId : LEGACY_BLIND75_LC[oldId - 1];
    if (lc == null) return;
    t.leetcodeNumber = lc;
    const q = BLIND_75_BY_LC[lc];
    if (q && !t.microsoftOA) t.blind75Seq = q.seq;
    if (m) {
      const name = q ? q.name : t.title.split(" - ").slice(1).join(" - ").replace(/ \(.*$/, "");
      t.title = `LeetCode #${lc} - ${name}${m[2] || ""}`;
    }
    delete t.leetcodeId;
  }));
  appState.settings.leetcodeNumbersV1Done = true;
  return true;
}

// One-time: rolled tasks and exams are identified by fields, not title text.
//   - " (Rolled Over)" is stripped from titles; those tasks get `rolledFrom`.
//   - Existing task ids are left exactly as they are (ids are no longer
//     rewritten on move, so notes keyed by id stay attached from now on).
//   - Certification exam tasks get `exam: true` (title match, this once only).
//   - The retired base-plan Sec+ exam on Sept 1 is removed if uncompleted; a
//     completed one is kept and noted in the console.
//   - Sept 1-2 sit between the August auto-complete and the Sept 3-15 backfill,
//     so their base tasks were never checked. Once past, they are marked
//     complete the same way (exams excluded).
const SEPT_GAP_DATES = ["2026-09-01", "2026-09-02"];
function migrateRolloverAndExamsV1() {
  appState.settings = appState.settings || {};
  if (appState.settings.rolloverExamsV1Done) return false;
  const nowIso = new Date().toISOString();
  const today = getRealCurrentDate();
  const EXAM_CATS = new Set(["aws", "secplus", "awscp"]);

  (appState.days || []).forEach(day => {
    day.tasks = (day.tasks || []).filter(t => {
      if (typeof t.title === "string" && / \(Rolled Over\)/.test(t.title)) {
        t.title = stripRolledSuffix(t.title);
        if (!t.rolledFrom) t.rolledFrom = t.originalDate || day.date;
      }
      if (EXAM_CATS.has(t.category) && /Certification Exam/i.test(t.title || "")) t.exam = true;

      const retiredExam = day.date === SECPLUS_EXAM_DATE && t.category === "secplus" &&
        t.source !== "extension" && (t.id === `${SECPLUS_EXAM_DATE}_sec_exam` || t.exam);
      if (retiredExam) {
        if (!t.completed) return false;
        console.log(`Kept the completed Sept 1 Security+ exam task (${t.id}); the scheduled exam is 2026-09-18.`);
      }
      return true;
    });

    if (SEPT_GAP_DATES.includes(day.date) && day.date < today && !isFreshState()) {
      day.tasks.forEach(t => {
        if (t.completed || isExamTask(t)) return;
        t.completed = true;
        t.completedOnDate = day.date;
        t.completedAt = nowIso;
        t.status = "done";
        t.completedMinutes = Math.round((t.duration || 0) * 60);
        t.remainingMinutes = 0;
      });
    }
  });

  appState.settings.rolloverExamsV1Done = true;
  return true;
}

// Every load path (local boot, cloud load, reset) funnels through here. Each
// step is idempotent, so running it on an already-migrated state is a no-op.
let _builtInCategoryDefaults = null;
function runStatePipeline() {
  if (demoMode) return; // migrations and plan extension belong to the real plan
  // Snapshot built-in categories before any saved overrides touch them, so a
  // reset can restore them.
  if (!_builtInCategoryDefaults) _builtInCategoryDefaults = JSON.parse(JSON.stringify(BUILT_IN_CATEGORIES));
  inferTaskSources();
  migrateLeetcodeNumbers();
  if (appState.categoryOverrides) {
    Object.entries(appState.categoryOverrides).forEach(([id, ov]) => {
      if (BUILT_IN_CATEGORIES[id]) Object.assign(BUILT_IN_CATEGORIES[id], ov);
    });
  }
  migrateScheduleIfNeeded();
  maybeAutoRepairRollover();
  backfillJuneJulyCompleted();
  unmarkExamTasksIfBackfilled();
  if (typeof extendPlanThroughDec2026 === "function") extendPlanThroughDec2026();
  repairReflowDamage();
  migrateRolloverAndExamsV1();
  if (typeof migrateExtensionFlex === "function") migrateExtensionFlex();
  if (typeof rebalanceCapacity === "function") rebalanceCapacity();
  inferTaskSources();
  applyCategoryColors();
}

function generateNewState() {
  if (demoMode) return;
  appState.settings = Object.assign(defaultSettings(), { lastRolloverDay: null });
  generateBaseSchedule();
  saveState();
}

// Migrate saved state to v3 — preserves completed tasks and notes
function migrateToRealCurrentDate() {
  if (!appState.settings) return;
  // v3: do NOT overwrite lastRolloverDay with real today — that field tracks rollover only.
  // Real today is always derived from getRealCurrentDate() / planToday().
  if (appState.settings.migratedRealDateV3) return;
  appState.settings.migratedRealDateV3 = true;
  saveState();
}

function migrateScheduleIfNeeded() {
  if (!appState || !appState.settings || !appState.days || appState.days.length === 0) return false;
  if (appState.settings.scheduleVersion === SCHEDULE_VERSION) return false;

  // Archive old generic Palana work tasks (preserve completion history)
  appState.archivedTasks = appState.archivedTasks || [];
  appState.days.forEach(day => {
    day.tasks.forEach(t => {
      if (t.category === "palana" && t.title.includes("Palana Work (Safety Engineering)")) {
        appState.archivedTasks.push(Object.assign({}, t, { archivedOn: planToday(), reason: "Replaced by Palana Preparation schedule" }));
      }
      if (t.category === "github" && t.title.includes("Git Extension Project")) {
        appState.archivedTasks.push(Object.assign({}, t, { archivedOn: planToday(), reason: "Replaced by Git Developer Productivity Tool roadmap" }));
      }
    });
    day.tasks = day.tasks.filter(t =>
      !(t.category === "palana" && t.title.includes("Palana Work (Safety Engineering)")) &&
      !(t.category === "github" && t.title.includes("Git Extension Project"))
    );
  });

  // Initialize custom categories object if missing
  if (!appState.categories) appState.categories = {};
  if (!appState.taskNotes) appState.taskNotes = {};

  appState.settings.scheduleVersion = SCHEDULE_VERSION;
  appState.settings.palanaSecurityEnabled = appState.settings.palanaSecurityEnabled !== false;
  appState.settings.ahfWeeklyTarget = appState.settings.ahfWeeklyTarget || 7;
  migrateToRealCurrentDate();
  reflowRemainingCurriculum();
  return true;
}

// Full reset (the caller shows the confirm dialog first). Everything the user
// built up goes: categories, notes, extracurriculars, reschedule ledger,
// archive, chatbot projects/undo log, and every one-time migration flag (they
// live in settings, which is replaced wholesale). Only sync bookkeeping is
// kept (meta, deletedTaskIds), so the reset propagates to other devices
// instead of being merged away. Then the plan is rebuilt through the same
// pipeline every load uses.
function resetPlannerState() {
  if (demoMode) return;
  const keep = { meta: appState.meta, deletedTaskIds: appState.deletedTaskIds };
  Object.keys(appState).forEach(k => { delete appState[k]; });
  Object.assign(appState, {
    settings: defaultSettings(),
    days: [],
    categories: {},
    extracurriculars: [],
    rescheduleLedger: {},
    taskNotes: {},
    archivedTasks: []
  });
  if (keep.meta) appState.meta = keep.meta;
  if (keep.deletedTaskIds) appState.deletedTaskIds = keep.deletedTaskIds;

  // Undo in-memory side effects of the old state.
  if (_builtInCategoryDefaults) {
    Object.keys(BUILT_IN_CATEGORIES).forEach(id => {
      if (_builtInCategoryDefaults[id]) BUILT_IN_CATEGORIES[id] = JSON.parse(JSON.stringify(_builtInCategoryDefaults[id]));
    });
  }
  for (let i = TRACK_4_PROJECTS.length - 1; i >= 0; i--) {
    if (TRACK_4_PROJECTS[i].createdByChatbot) TRACK_4_PROJECTS.splice(i, 1);
  }

  generateBaseSchedule();
  runStatePipeline();
  saveState();
  initUI();
  playSynthSound("reset");
}

// 10. SYNTH AUDIO FOR RETRO HACKER CHIMES
// Creates offline sound pulses using Web Audio API
let _sharedAudioCtx = null;
function playSynthSound(type) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    // Reuse ONE AudioContext for the whole session. Creating a new one per
    // click leaks contexts and crashes the tab once the browser's hard cap
    // (~6) is hit.
    if (!_sharedAudioCtx) _sharedAudioCtx = new AudioContextClass();
    const ctx = _sharedAudioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "success") {
      // Arpeggio
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "warning") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.linearRampToValueAtTime(110, now + 0.15); // A2
      osc.frequency.setValueAtTime(220, now + 0.16); 
      osc.frequency.linearRampToValueAtTime(110, now + 0.32);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "reset") {
      osc.type = "square";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.5);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // Ignore audio failures if blocked by browser autoplay rules
  }
}

// 10.5 SPARKLE PARTICLE EMITTER (KAWAII METRIC IMPACT)
function spawnSparkles(e) {
  const rect = e.target.getBoundingClientRect();
  const x = rect.left + rect.width / 2 + window.scrollX;
  const y = rect.top + rect.height / 2 + window.scrollY;
  
  const particles = ["✨", "💖", "⭐", "🌸", "🍬"];
  
  for (let i = 0; i < 8; i++) {
    const span = document.createElement("span");
    span.className = "sparkle-particle";
    span.innerText = particles[Math.floor(Math.random() * particles.length)];
    
    // Random angle and distance vector
    const angle = Math.random() * Math.PI * 2;
    const velocity = 30 + Math.random() * 60;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;
    
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.setProperty("--dx", `${dx}px`);
    span.style.setProperty("--dy", `${dy}px`);
    
    document.body.appendChild(span);
    
    // Remove span after particle animation ends
    setTimeout(() => {
      span.remove();
    }, 1000);
  }
}

// 11. UI RENDERING & COMPONENT BUILDERS
let activeMonth = "2026-06"; // Current calendar viewing month
let selectedDate = null;     // Date open in side drawer

function initUI() {
  initializeExtracurriculars();
  populateCategorySelects();
  renderDashboardMetrics();
  renderTodaySection();
  renderProjectSelector();
  renderCalendarMonthControls();
  renderCalendarDays();
  renderTracksChecklists();
  renderExtracurricularSummary();
  updateRiskBanner();
  cycleQuotes();
}

// ⭐ NEW: Initialize extracurriculars with seed data on first load
function initializeExtracurriculars() {
  if (demoMode) return;
  if (!appState.extracurriculars || appState.extracurriculars.length === 0) {
    appState.extracurriculars = [...BUILT_IN_EXTRACURRICULARS];
    saveState();
  }
}

// Overall Stats calculations
function renderDashboardMetrics() {
  // Count total tasks
  let totalTasks = 0;
  let completedTasks = 0;
  const leetCodeSolvedIds = new Set();
  let totalLeetCode = 75; // Blind 75
  
  let portswiggerDone = 0;
  let totalPortswigger = CORE_CURRICULUM.portswigger.length;
  
  let secPlusHours = 0;
  
  // PortSwigger (Track 1) is retired: its rows stay for history but are not
  // counted as outstanding work. isSurfacedTask() lives in plan-extension-2026.js.
  const surfaced = (t) => (typeof isSurfacedTask === "function") ? isSurfacedTask(t) : true;

  appState.days.forEach(day => {
    day.tasks.forEach(t => {
      if (surfaced(t)) {
        totalTasks++;
        if (t.completed) completedTasks++;
      }
      
      // Portswigger specific
      if (t.category === "portswigger" && t.completed) {
        portswiggerDone++;
      }
      
      // Distinct Blind 75 problems only (see blind75SeqOf), so repeat practice
      // doesn't push the counter past 75 and OA-only problems don't count.
      if (t.category === "leetcode" && t.completed) {
        const seq = blind75SeqOf(t);
        if (seq) leetCodeSolvedIds.add(seq);
      }
      
      // Sec+ study logged hours
      if (t.category === "secplus" && t.completed) {
        secPlusHours += t.duration;
      }
    });
  });

  // Calculate Streak
  let longestStreak = 0;
  let currentStreak = 0;
  
  // Sort days chronologically
  const sortedDays = [...appState.days].sort((a, b) => a.date.localeCompare(b.date));

  // ⭐ NEW: Use real browser date (America/Los_Angeles timezone), not simulated
  let realTodayStr = getRealCurrentDate();

  // We calculate streak based on days that have tasks and ALL tasks are completed
  // (or at least 1 task was completed and nothing left unchecked)
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i];
    // Only count days up to and including real today (NOT simulated today)
    if (day.date > realTodayStr) break;
    // Check if day has tasks
    const streakTasks = day.tasks.filter(surfaced);
    if (streakTasks.length > 0) {
      const allDone = streakTasks.every(t => t.completed);
      const anyDone = streakTasks.some(t => t.completed);
      
      if (allDone && anyDone) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
  }
  
  // Overall percentage
  const compPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  document.getElementById("metric-completion").innerText = `${compPercent}%`;
  document.getElementById("metric-completion-fill").style.width = `${compPercent}%`;
  document.getElementById("metric-completion-sub").innerText = `${completedTasks} / ${totalTasks} Tasks Completed`;
  
  // Countdown to Sept 1, 2026
  // ⭐ NEW: Use real browser date (America/Los_Angeles timezone), not simulated
  let realToday = getRealCurrentDateObj();
  const demoEnd = demoMode && appState.days.length ? appState.days[appState.days.length - 1].date : null;
  const endPlanDate = parseDate(demoEnd || END_DATE_STR);
  const diffTime = endPlanDate - realToday;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  document.getElementById("metric-countdown").innerText = `${daysLeft} days`;

  // Streak rendering
  document.getElementById("metric-streak").innerText = `${currentStreak} days`;
  document.getElementById("metric-longest-streak").innerText = `Longest: ${longestStreak} days`;
  
  // LeetCode progress
  const leetCodeDone = Math.min(totalLeetCode, leetCodeSolvedIds.size);
  document.getElementById("metric-leetcode").innerText = `${leetCodeDone} / ${totalLeetCode}`;
  const lcPercent = Math.min(100, Math.round((leetCodeDone / totalLeetCode) * 100));
  document.getElementById("metric-leetcode-fill").style.width = `${lcPercent}%`;
  
  // Certifications list update
  const awsBadge = document.getElementById("badge-aws");
  const secPlusBadge = document.getElementById("badge-secplus");

  // AWS badge
  if (appState.settings.awsExamPassed) {
    awsBadge.innerText = "PASSED ✅";
    awsBadge.className = "cert-badge status-passed";
  } else {
    // Check if exam task is checked
    const awsExamTaskCompleted = appState.days.some(d => d.tasks.some(t => t.category === "aws" && isExamTask(t) && t.completed));
    if (awsExamTaskCompleted) {
      awsBadge.innerText = "PASSED ✅";
      awsBadge.className = "cert-badge status-passed";
    } else {
      // In progress if some AWS tasks are completed
      const someAwsDone = appState.days.some(d => d.tasks.some(t => t.category === "aws" && t.completed));
      if (someAwsDone) {
        awsBadge.innerText = "IN PROGRESS";
        awsBadge.className = "cert-badge status-progress";
      } else {
        awsBadge.innerText = "NOT STARTED";
        awsBadge.className = "cert-badge status-todo";
      }
    }
  }

  // Sec+ badge
  if (appState.settings.securityPlusExamPassed) {
    secPlusBadge.innerText = "PASSED ✅";
    secPlusBadge.className = "cert-badge status-passed";
  } else {
    const secExamTaskCompleted = appState.days.some(d => d.tasks.some(t => t.category === "secplus" && isExamTask(t) && t.completed));
    if (secExamTaskCompleted) {
      secPlusBadge.innerText = "PASSED ✅";
      secPlusBadge.className = "cert-badge status-passed";
    } else {
      const someSecDone = appState.days.some(d => d.tasks.some(t => t.category === "secplus" && t.completed));
      if (someSecDone) {
        secPlusBadge.innerText = "IN PROGRESS";
        secPlusBadge.className = "cert-badge status-progress";
      } else {
        secPlusBadge.innerText = "NOT STARTED";
        secPlusBadge.className = "cert-badge status-todo";
      }
    }
  }

  // AWS Cloud Practitioner badge (separate cert from the AI Practitioner one)
  const awsCpBadge = document.getElementById("badge-awscp");
  if (awsCpBadge) {
    const cpExamDone = !!appState.settings.awscpExamPassed ||
      appState.days.some(d => d.tasks.some(t => t.category === "awscp" && isExamTask(t) && t.completed));
    const someCpDone = appState.days.some(d => d.tasks.some(t => t.category === "awscp" && t.completed));
    if (cpExamDone) {
      awsCpBadge.innerText = "PASSED ✅";
      awsCpBadge.className = "cert-badge status-passed";
    } else if (someCpDone) {
      awsCpBadge.innerText = "IN PROGRESS";
      awsCpBadge.className = "cert-badge status-progress";
    } else {
      awsCpBadge.innerText = "NOT STARTED";
      awsCpBadge.className = "cert-badge status-todo";
    }
  }

  // Bind settings modal checkboxes to state
  document.getElementById("settings-aws-passed").checked = appState.settings.awsExamPassed;
  document.getElementById("settings-secplus-passed").checked = appState.settings.securityPlusExamPassed;
  document.getElementById("settings-awscp-passed").checked = !!appState.settings.awscpExamPassed;
  document.getElementById("palana-toggle").checked = appState.settings.palanaEnabled;
  document.getElementById("settings-palana-toggle").checked = appState.settings.palanaEnabled;
}

// Sidebar project checkboxes.
// Dated projects (added by plan-extension-2026.js) render as collapsible cards
// with a target date, a progress bar and a sub-task list. The original summer
// projects keep their plain checkbox row and their completion state.
function renderProjectSelector() {
  const container = document.getElementById("project-options-list");
  container.innerHTML = "";
  if (demoMode) return; // the project list is the real plan's; its card is hidden in demo

  const datedProjects = TRACK_4_PROJECTS.filter(p => p.dated);
  const legacyProjects = TRACK_4_PROJECTS.filter(p => !p.dated);

  if (datedProjects.length) {
    const datedWrap = document.createElement("div");
    datedWrap.className = "dated-projects-list";

    datedProjects.forEach(proj => {
      const prog = (typeof datedProjectProgress === "function")
        ? datedProjectProgress(proj.id)
        : { done: 0, total: 0, pct: 0 };
      const dueLabel = proj.dueDate
        ? parseDate(proj.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";
      const isOverdue = proj.dueDate && proj.dueDate < getRealCurrentDate() && prog.pct < 100;
      const isOpen = !!(appState.settings.openProjectCards || {})[proj.id];

      const card = document.createElement("div");
      card.className = `dated-project-card ${isOpen ? 'open' : ''} ${prog.pct === 100 ? 'project-done' : ''}`;
      card.innerHTML = `
        <button class="dated-project-head" type="button">
          <span class="dated-project-caret">${isOpen ? '▾' : '▸'}</span>
          <span class="dated-project-name">${escapeHtml(proj.name)}</span>
          <span class="dated-project-due ${isOverdue ? 'due-overdue' : ''}">Due ${escapeHtml(dueLabel)}</span>
        </button>
        <div class="dated-project-progress">
          <div class="dated-project-bar"><div class="dated-project-fill" style="width:${prog.pct}%"></div></div>
          <span class="dated-project-pct">${prog.done}/${prog.total} · ${prog.pct}%</span>
        </div>
        <div class="dated-project-body" ${isOpen ? '' : 'hidden'}>
          <p class="dated-project-desc">${escapeHtml(proj.desc)}</p>
          <ul class="dated-project-subtasks">
            ${proj.tasks.map(t => `<li><span class="sub-bullet">▫</span>${escapeHtml(t.name)}<span class="sub-hours">${escapeHtml(t.duration)}h</span></li>`).join("")}
          </ul>
        </div>
      `;
      card.querySelector(".dated-project-head").addEventListener("click", () => {
        playSynthSound("click");
        appState.settings.openProjectCards = appState.settings.openProjectCards || {};
        appState.settings.openProjectCards[proj.id] = !isOpen;
        saveState();
        renderProjectSelector();
      });
      datedWrap.appendChild(card);
    });

    container.appendChild(datedWrap);

    const divider = document.createElement("div");
    divider.className = "project-list-divider";
    divider.innerText = "SUMMER 2026 PROJECTS";
    container.appendChild(divider);
  }

  legacyProjects.forEach(proj => {
    const isSelected = appState.settings.selectedProjects.includes(proj.id);
    
    const label = document.createElement("label");
    label.className = "checkbox-container";
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(proj.id)}" ${isSelected ? 'checked' : ''}>
      <span class="custom-checkbox"></span>
      ${escapeHtml(proj.name)}
      <span class="proj-meta">${escapeHtml(proj.totalHours)} hrs • 1-2 weeks</span>
    `;
    
    // Listen for change
    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      playSynthSound("click");
      if (e.target.checked) {
        appState.settings.selectedProjects.push(proj.id);
      } else {
        appState.settings.selectedProjects = appState.settings.selectedProjects.filter(id => id !== proj.id);
      }
      reflowRemainingCurriculum();
    });
    
    container.appendChild(label);
  });
}

// Monthly Navigation tabs for Calendar
function renderCalendarMonthControls() {
  const container = document.getElementById("month-tabs");
  container.innerHTML = "";
  
  const months = demoMode ? demoMonths() : [
    { code: "2026-06", label: "JUNE 2026" },
    { code: "2026-07", label: "JULY 2026" },
    { code: "2026-08", label: "AUGUST 2026" },
    { code: "2026-09", label: "SEPT 2026" },
    { code: "2026-10", label: "OCT 2026" },
    { code: "2026-11", label: "NOV 2026" },
    { code: "2026-12", label: "DEC 2026" }
  ];
  
  months.forEach(m => {
    const btn = document.createElement("button");
    btn.className = `month-tab-btn ${activeMonth === m.code ? 'active' : ''}`;
    btn.innerText = m.label;
    btn.addEventListener('click', () => {
      playSynthSound("click");
      activeMonth = m.code;
      renderCalendarMonthControls();
      renderCalendarDays();
    });
    container.appendChild(btn);
  });
}

// Render Days inside Calendar View
function renderCalendarDays() {
  const container = document.getElementById("calendar-days-grid");
  container.innerHTML = "";
  
  // Filter days belonging to activeMonth
  const monthDays = appState.days.filter(d => d.date.startsWith(activeMonth));
  if (monthDays.length === 0) return;
  
  // Calculate padding based on the day-of-week of the FIRST day actually present
  // in the data for this month. The plan starts mid-month (June 13), so we can't
  // assume the month begins on the 1st — otherwise the grid columns misalign.
  const startDayPadding = getDayOfWeek(monthDays[0].date); // 0 = Sunday ... 6 = Saturday
  
  // Add empty grid slots for padding
  for (let i = 0; i < startDayPadding; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty-day";
    container.appendChild(emptyCell);
  }
  
  // Look these up once per render, not once per cell.
  const realTodayDate = getRealCurrentDate();
  const planTodayDate = planToday();
  const getHeavyReason = (!demoMode && typeof heavyDayReason === "function") ? heavyDayReason : () => null;

  monthDays.forEach(day => {
    const dayCell = document.createElement("div");
    dayCell.className = "day-cell";
    
    const isToday = realTodayDate === day.date;
    if (isToday) dayCell.classList.add("today-cell");
    if (day.date < planTodayDate) dayCell.classList.add("past-day");
    if (day.date > planTodayDate) dayCell.classList.add("future-day");
    if (day.isIndia) dayCell.classList.add("travel-day");
    
    const heavyReason = getHeavyReason(day.date);
    if (heavyReason) {
      dayCell.classList.add("heavy-day-cell");
      dayCell.title = `HEAVY DAY — ${heavyReason}`;
    }

    // Retired tracks stay in the data but stop rendering on the calendar.
    const cellTasks = day.tasks.filter(t => (typeof isSurfacedTask === "function") ? isSurfacedTask(t) : true);

    // Color load meter
    const totalScheduled = cellTasks.reduce((sum, t) => sum + t.duration, 0);
    const capacityRatio = day.maxCapacity > 0 ? (totalScheduled / day.maxCapacity) : 0;
    
    let loadClass = "load-optimal";
    if (capacityRatio > 1.0) {
      loadClass = "load-overloaded";
    } else if (capacityRatio >= 0.8) {
      loadClass = "load-warning";
    }

    // Check if there are uncompleted tasks in the past
    // E.g. warning icon on cell
    const isPast = day.date < planTodayDate;
    const hasUnfinishedPast = isPast && cellTasks.some(t => !t.completed && !t.fixed);
    
    const warningIconHtml = hasUnfinishedPast ? 
      `<span class="cell-warning-icon" title="Uncompleted tasks! Click rollover.">⚠️</span>` : '';
    
    const dayNum = parseInt(day.date.split('-')[2]);
    const displayCap = day.maxCapacity.toFixed(0);
    
    dayCell.innerHTML = `
      <div class="day-header-info">
        <span class="day-number">${dayNum}${isToday ? '<span class="today-badge">Today</span>' : ''}</span>
        <span class="day-capacity-badge">${displayCap}h Max</span>
      </div>
      <div class="day-load-meter">
        <div class="day-load-fill ${loadClass}" style="width: ${Math.min(100, Math.round(capacityRatio * 100))}%"></div>
      </div>
      <div class="day-tasks-dots">
        <!-- Dynamically filled with task tokens -->
      </div>
      ${warningIconHtml}
      ${heavyReason ? '<span class="cell-heavy-icon" title="Heavy day — two commitments collide">🔥</span>' : ''}
    `;
    
    // Add colored task blocks
    const dotsContainer = dayCell.querySelector(".day-tasks-dots");
    // Sort tasks so completed ones are pushed to bottom
    const sortedTasks = [...cellTasks].sort((a,b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));

    sortedTasks.forEach(task => {
      const block = document.createElement("div");
      block.className = `day-task-block cat-${task.category} ${task.completed ? 'task-completed' : ''} ${task.milestone ? 'block-milestone' : ''}`;
      block.innerText = task.title;
      dotsContainer.appendChild(block);
    });

    // Drop target: accept tasks dragged from the drawer
    dayCell.addEventListener('dragover', (e) => {
      if (window._dragTask) {
        e.preventDefault();
        dayCell.classList.add("drag-over");
      }
    });
    dayCell.addEventListener('dragleave', () => dayCell.classList.remove("drag-over"));
    dayCell.addEventListener('drop', (e) => {
      e.preventDefault();
      dayCell.classList.remove("drag-over");
      const { task, fromDate } = window._dragTask || {};
      if (!moveTaskToDate(task, fromDate, day.date)) return;
      saveState();
      renderDashboardMetrics();
      renderCalendarDays();
      showDayDetails(day.date);
      playSynthSound("success");
      window._dragTask = null;
    });

    // Click action opens drawer
    dayCell.addEventListener('click', () => {
      playSynthSound("click");
      showDayDetails(day.date);
    });

    container.appendChild(dayCell);
  });
}

// Side Drawer Detail Drawer Renderer
function showDayDetails(dateStr) {
  selectedDate = dateStr;
  const day = appState.days.find(d => d.date === dateStr);
  if (!day) return;
  
  const drawer = document.getElementById("day-detail-drawer");
  const backdrop = document.getElementById("overlay-backdrop");
  
  // Date titles
  const formattedTitle = parseDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById("drawer-date-title").innerText = formattedTitle;
  
  const daysDiff = getDaysBetween(demoMode ? appState.days[0].date : START_DATE_STR, dateStr) + 1;
  document.getElementById("drawer-date-code").innerText = `SYS_DAY_${String(daysDiff).padStart(2, '0')}`;
  
  // Capacity and schedule hours
  const totalScheduled = day.tasks.reduce((sum, t) => sum + t.duration, 0);
  document.getElementById("drawer-max-hours").innerText = `${day.maxCapacity.toFixed(1)} hrs`;
  document.getElementById("drawer-scheduled-hours").innerText = `${totalScheduled.toFixed(1)} hrs`;
  
  // Load status
  const statusEl = document.getElementById("drawer-status");
  if (totalScheduled > day.maxCapacity) {
    statusEl.innerText = "OVERLOADED";
    statusEl.className = "cap-val status-indicator status-heavy";
  } else if (totalScheduled >= day.maxCapacity * 0.8) {
    statusEl.innerText = "HEAVY LOAD";
    statusEl.className = "cap-val status-indicator status-warning";
  } else {
    statusEl.innerText = "OPTIMAL";
    statusEl.className = "cap-val status-indicator status-optimal";
  }

  // India Trip warning banner / heavy-day collision flag
  const noteEl = document.getElementById("drawer-day-note");
  const heavyReason = (!demoMode && typeof heavyDayReason === "function") ? heavyDayReason(dateStr) : null;
  if (day.isIndia) {
    noteEl.innerText = "INDIA TRIP: Workload capped to 2-3 hours max. Light tasks only.";
    noteEl.className = "drawer-day-note";
    noteEl.classList.remove("hidden");
  } else if (heavyReason) {
    noteEl.innerText = `HEAVY DAY: ${heavyReason}. Two commitments land together — plan around it.`;
    noteEl.className = "drawer-day-note drawer-day-note-heavy";
    noteEl.classList.remove("hidden");
  } else {
    noteEl.classList.add("hidden");
  }
  
  // Task checklist listing
  const listContainer = document.getElementById("drawer-tasks-list");
  listContainer.innerHTML = "";
  
  // Retired tracks (PortSwigger) keep their history but stop appearing here.
  const visibleTasks = day.tasks.filter(t => (typeof isSurfacedTask === "function") ? isSurfacedTask(t) : true);

  if (visibleTasks.length === 0) {
    listContainer.innerHTML = `<div class="empty-state-text" style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:1rem;">No tasks scheduled. Relax! 🛰️</div>`;
  } else {
    visibleTasks.forEach(task => {
      const itemRow = document.createElement("div");
      itemRow.className = `drawer-task-item ${task.completed ? 'task-checked' : ''} ${task.milestone ? 'task-milestone' : ''}`;
      itemRow.draggable = true;
      itemRow.title = "Drag to a calendar day to move this task";
      itemRow.addEventListener('dragstart', (e) => {
        window._dragTask = { task, fromDate: dateStr };
        itemRow.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      itemRow.addEventListener('dragend', () => {
        itemRow.classList.remove("dragging");
        document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
      });
      
      const linkHtml = task.link ?
        `<a href="${escapeHtml(safeUrl(task.link))}" target="_blank" class="task-link-arrow" title="View Reference Link">&rarr;</a>` : '';

      const isCustom = task.category === "custom";
      const deleteHtml = isCustom
        ? `<button class="task-delete-btn" title="Delete task">✕</button>`
        : '';
      
      const hasNotes = taskHasNotes(task.id);
      const notesIndicator = hasNotes ? `<span class="task-notes-indicator" title="Has notes">📝</span>` : '';
      const notesBtn = `<button class="task-notes-btn" title="Edit notes">📝</button>`;
      const statusBadge = task.status && task.status !== "done" ? `<span class="task-status-badge status-${escapeHtml(task.status)}">${escapeHtml(task.status)}</span>` : '';
      const milestoneBadge = task.milestone ? `<span class="task-milestone-badge" title="Deadline / milestone">◆ MILESTONE</span>` : '';
      const rolledBadge = task.rolledFrom ? `<span class="task-rolled-badge" title="Rolled over from ${escapeHtml(task.rolledFrom)}">↻ rolled</span>` : '';
      const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
      const subDone = subs.filter(st => st.completed).length;
      const subtasksHtml = subs.length ? `
        <div class="task-subtasks">
          <div class="task-subtasks-head">${subDone} / ${subs.length} done</div>
          ${subs.map((st, si) => `
            <label class="task-subtask-row ${st.completed ? 'subtask-checked' : ''}">
              <input type="checkbox" class="task-subtask-cb" data-sub-index="${si}" ${st.completed ? 'checked' : ''}>
              <span class="custom-checkbox custom-checkbox-sm"></span>
              <span class="task-subtask-label">${escapeHtml(st.title)}</span>
            </label>`).join("")}
        </div>` : '';
      const ownerBadge = task.owner ? `<span class="owner-badge owner-${escapeHtml(task.owner)}">${task.owner === "shared" ? "Shared" : task.owner === "tejaswi" ? "Tejaswi" : "Thanishka"}</span>` : '';
      const actionsHtml = task.completed ? '' : `
        <div class="task-actions-row">
          <button class="task-action-btn" data-action="partial" title="Partial completion">Partial</button>
          <button class="task-action-btn" data-action="tomorrow" title="Move to tomorrow">Tomorrow</button>
          <button class="task-action-btn" data-action="skip" title="Skip">Skip</button>
          <button class="task-action-btn" data-action="blocked" title="Blocked">Blocked</button>
        </div>`;
      
      itemRow.innerHTML = `
        <label class="checkbox-container">
          <input type="checkbox" ${task.completed ? 'checked' : ''}>
          <span class="custom-checkbox"></span>
        </label>
        <div class="task-details">
          <span class="task-label">${escapeHtml(task.title)}${milestoneBadge}${rolledBadge}${notesIndicator}${statusBadge}${ownerBadge}</span>
          <div class="task-sub-meta">
            <span class="task-cat-badge badge-${escapeHtml(task.category)}">${escapeHtml(getCategoryLabel(task.category))}</span>
            <span>Est: ${task.duration} hr${task.duration > 1 ? 's' : ''}${task.completedMinutes ? ` · ${(task.completedMinutes/60).toFixed(1)}h done` : ''}</span>
          </div>
          ${subtasksHtml}
          ${actionsHtml}
        </div>
        ${linkHtml}
        ${notesBtn}
        ${deleteHtml}
      `;

      // Notes button listener
      itemRow.querySelector('.task-notes-btn').addEventListener('click', () => {
        playSynthSound("click");
        showTaskNotesModal(task.id, task.title);
      });

      // Task action buttons (browser only)
      if (typeof itemRow.querySelectorAll === "function") {
        itemRow.querySelectorAll(".task-action-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const action = btn.getAttribute("data-action");
            // Each helper reports whether it changed anything; if not (cancelled
            // prompt, bad number, fixed/full day) leave the drawer exactly as it is.
            if (action === "partial") {
              const hrs = prompt(`How many hours completed? (of ${task.duration}h)`, String((task.completedMinutes || 0) / 60 || task.duration / 2));
              if (hrs == null || !markTaskPartial(task, day, parseFloat(hrs))) return;
            } else if (action === "tomorrow") {
              if (!moveTaskToTomorrow(task, day)) return;
            } else if (action === "skip") skipTask(task, day);
            else if (action === "blocked") blockTask(task, day);
            showDayDetails(dateStr);
            renderTodaySection();
            renderDashboardMetrics();
            renderCalendarDays();
          });
        });
      }

      // Delete button for custom tasks
      if (isCustom) {
        itemRow.querySelector('.task-delete-btn').addEventListener('click', () => {
          playSynthSound("click");
          day.tasks = day.tasks.filter(t => t.id !== task.id);
          saveState();
          renderDashboardMetrics();
          renderCalendarDays();
          showDayDetails(dateStr); // re-render drawer
        });
      }
      
      // Sub-checklist listeners. Ticking every sub-item completes the parent;
      // ticking the parent ticks every sub-item.
      itemRow.querySelectorAll(".task-subtask-cb").forEach(subCb => {
        subCb.addEventListener("change", (e) => {
          e.stopPropagation();
          const si = parseInt(subCb.getAttribute("data-sub-index"), 10);
          if (!task.subtasks || !task.subtasks[si]) return;
          task.subtasks[si].completed = subCb.checked;
          touchTask(task);
          const allSubsDone = task.subtasks.every(st => st.completed);
          if (allSubsDone && !task.completed) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            task.completedOnDate = dateStr;
            playSynthSound("success");
            spawnSparkles(e);
          } else if (!allSubsDone && task.completed) {
            task.completed = false;
            delete task.completedAt;
            delete task.completedOnDate;
            playSynthSound("click");
          } else {
            playSynthSound("click");
          }
          saveState();
          renderDashboardMetrics();
          renderCalendarDays();
          showDayDetails(dateStr);
        });
      });

      // Checkbox listener
      const cb = itemRow.querySelector('input');
      cb.addEventListener('change', (e) => {
        task.completed = e.target.checked;
        touchTask(task);
        if (Array.isArray(task.subtasks)) {
          task.subtasks.forEach(st => { st.completed = task.completed; });
        }
        if (task.completed) {
          // Record completion metadata for accurate exports / reporting
          task.completedAt = new Date().toISOString();
          task.completedOnDate = dateStr;
          playSynthSound("success");
          spawnSparkles(e);
        } else {
          delete task.completedAt;
          delete task.completedOnDate;
          playSynthSound("click");
        }
        saveState();
        
        // Re-draw metrics, calendar dots
        renderDashboardMetrics();
        renderCalendarDays();
        renderTracksChecklists();
        
        // Refresh drawer metrics
        const newTotal = day.tasks.reduce((sum, t) => sum + t.duration, 0);
        document.getElementById("drawer-scheduled-hours").innerText = `${newTotal.toFixed(1)} hrs`;
        
        if (task.completed) {
          itemRow.classList.add('task-checked');
        } else {
          itemRow.classList.remove('task-checked');
        }
        if (Array.isArray(task.subtasks) && task.subtasks.length) showDayDetails(dateStr);
      });
      
      listContainer.appendChild(itemRow);
    });
  }
  
  // Wire up Add Task button
  const addTaskBtn = document.getElementById("add-task-btn");
  const newTaskBtn = addTaskBtn.cloneNode(true); // clone to remove old listeners
  addTaskBtn.parentNode.replaceChild(newTaskBtn, addTaskBtn);
  newTaskBtn.addEventListener('click', () => {
    const titleInput = document.getElementById("new-task-title");
    const categoryInput = document.getElementById("new-task-category");
    const durationInput = document.getElementById("new-task-duration");

    const title = titleInput.value.trim();
    const category = categoryInput.value;
    const duration = parseFloat(durationInput.value) || 1;

    if (!title) {
      titleInput.focus();
      titleInput.style.borderColor = "var(--neon-pink)";
      setTimeout(() => titleInput.style.borderColor = "", 1000);
      return;
    }

    const newTask = {
      id: `${dateStr}_custom_${Date.now()}`,
      category: category,
      title: title,
      duration: duration,
      completed: false,
      link: null,
      source: "user"
    };

    day.tasks.push(touchTask(newTask));
    saveState();
    playSynthSound("success");
    titleInput.value = "";
    durationInput.value = "1";

    // Re-render everything
    renderDashboardMetrics();
    renderCalendarDays();
    showDayDetails(dateStr); // re-render drawer with new task
  });

  // Show undo button if a rollover snapshot exists for this day
  const undoBtn = document.getElementById("undo-rollover-btn");
  if (undoBtn) undoBtn.style.display = appState.rolloverUndoSnapshot ? "block" : "none";

  // Open the drawer UI
  drawer.classList.add("open");
  backdrop.classList.add("active");
}

function closeDrawer() {
  document.getElementById("day-detail-drawer").classList.remove("open");
  document.getElementById("overlay-backdrop").classList.remove("active");
  selectedDate = null;
}

// Tab 2: Render Syllabus Progression Lists
function renderTracksChecklists() {
  if (demoMode) return; // the four tracks are the real plan's; the tab is hidden in demo
  const tracks = ["portswigger", "aws", "secplus", "projects"];
  
  tracks.forEach(track => {
    const listContainer = document.getElementById(`list-${track}-tasks`);
    listContainer.innerHTML = "";
    
    // Extract all unique tasks of this category across the entire plan
    const uniqueTasks = [];
    const seenTitles = new Set();
    let completedCount = 0;
    
    appState.days.forEach(day => {
      day.tasks.forEach(task => {
        if (task.category === track) {
          // Clean name for grouping
          const cleanTitle = task.title.replace(" (Part A)", "").replace(" (Part B)", "");
          
          if (!seenTitles.has(cleanTitle)) {
            seenTitles.add(cleanTitle);
            uniqueTasks.push({
              title: cleanTitle,
              link: task.link,
              completed: task.completed,
              originalDay: day.date
            });
          } else {
            // If already seen, we aggregate completion status (completed if all parts are completed)
            const idx = uniqueTasks.findIndex(ut => ut.title === cleanTitle);
            if (idx !== -1 && !task.completed) {
              uniqueTasks[idx].completed = false; // if any part is unfinished, set group to unfinished
            }
          }
        }
      });
    });

    // Recalculate complete count
    uniqueTasks.forEach(ut => {
      if (ut.completed) completedCount++;
    });

    document.getElementById(`substats-${track}`).innerText = `${completedCount} / ${uniqueTasks.length} Modules Finished`;

    if (uniqueTasks.length === 0) {
      listContainer.innerHTML = `<div class="empty-state-text" style="font-size:0.75rem; color:var(--text-muted); text-align:center; width:100%; padding:1rem;">No modules scheduled for this track.</div>`;
    } else {
      uniqueTasks.forEach(ut => {
        const row = document.createElement("div");
        row.className = `track-item-row comp-${track} ${ut.completed ? 'task-checked' : ''}`;
        
        const linkHtml = ut.link ? ` (<a href="${escapeHtml(safeUrl(ut.link))}" target="_blank">Link</a>)` : '';
        const dateParts = ut.originalDay.split('-');
        const displayDate = `${dateParts[1]}/${dateParts[2]}`;

        row.innerHTML = `
          <span style="color:${ut.completed ? 'var(--neon-green)' : 'var(--text-muted)'}">${ut.completed ? '✅' : '⚙️'}</span>
          <span style="flex-grow:1">${escapeHtml(ut.title)}${linkHtml}</span>
          <span style="font-size:0.65rem; color:var(--text-muted); font-family:var(--font-mono)">Sched: ${escapeHtml(displayDate)}</span>
        `;
        listContainer.appendChild(row);
      });
    }
  });
}

// Flashes UI alert warning if we scheduled past September 1st
function updateRiskBanner() {
  const atRisk = appState.days.some(d => d.isOverflow || d.tasks.some(t => t.overflow && !t.completed));
  const warningBanner = document.getElementById("at-risk-warning");
  if (atRisk) {
    warningBanner.classList.remove("hidden");
  } else {
    warningBanner.classList.add("hidden");
  }
}

// Cycles through motivational hacker quotes
let quoteInterval = null;
function cycleQuotes() {
  const quoteEl = document.getElementById("motivational-quote");
  
  // Set initial quote
  const quotes = (demoMode && typeof DEMO_COPY !== "undefined" && DEMO_COPY.quotes.length) ? DEMO_COPY.quotes : MOTIVATIONAL_QUOTES;
  const index = Math.floor(Math.random() * quotes.length);
  quoteEl.innerText = quotes[index];
  
  if (quoteInterval) clearInterval(quoteInterval);
  quoteInterval = setInterval(() => {
    // Typewriter emulation
    quoteEl.style.opacity = 0;
    setTimeout(() => {
      const idx = Math.floor(Math.random() * quotes.length);
      quoteEl.innerText = quotes[idx];
      quoteEl.style.opacity = 1;
    }, 400);
  }, 12000);
}

// ⭐ NEW: Go to Today - Jump calendar to today's date and open the day details
function goToToday() {
  const realToday = getRealCurrentDate();
  const todayMonth = realToday.substring(0, 7); // "2026-06" format
  
  // Switch active month to today's month
  activeMonth = todayMonth;
  
  playSynthSound("click");
  
  // Re-render calendar and month controls
  renderCalendarMonthControls();
  renderCalendarDays();
  
  // Open today's day details
  setTimeout(() => {
    showDayDetails(realToday);
    
    // Scroll today's cell into view
    const todayCell = document.querySelector(".day-cell.today-cell");
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}

// Expose for export.js
window.planToday = planToday;
window.getRealCurrentDate = getRealCurrentDate;
window.getAllCategories = getAllCategories;
window.getCategoryLabel = getCategoryLabel;
window.openCategoryManager = openCategoryManager;
window.addNewCategory = addNewCategory;
window.deleteCategory = deleteCategory;
window.showDayDetails = showDayDetails;
window.runStatePipeline = runStatePipeline;
window.addNewExtracurricular = addNewExtracurricular;

// 13. DEMO MODE
// Lets a signed-out visitor explore the UI with the invented plan from
// demo-data.js. Isolation rules:
//   - entered only by enterDemoMode(), and only while nobody is signed in;
//   - appState is replaced in memory; localStorage is neither read nor written,
//     so real local progress on this browser is left exactly as it was;
//   - saveState(), the load/migration pipeline and every Firestore path return
//     early while demoMode is set (see firebase-sync.js);
//   - the only way out is a full reload. firebase-sync.js merges in-memory
//     state into the cloud on sign-in, so the sample state must be gone from
//     memory before anyone authenticates.
function demoMonths() {
  const seen = [];
  appState.days.forEach(d => {
    const code = d.date.substring(0, 7);
    if (!seen.includes(code)) seen.push(code);
  });
  return seen.map(code => ({
    code,
    label: parseDate(`${code}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()
  }));
}

function enterDemoMode() {
  if (demoMode) return true;
  // A signed-in session owns appState; the demo must never replace it.
  if (typeof currentUser !== "undefined" && currentUser) return false;
  try {
    if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) return false;
  } catch (e) { return false; }
  if (typeof buildDemoState !== "function") return false;

  const today = getRealCurrentDate();
  const demoState = buildDemoState(today);
  demoMode = true;
  clearTimeout(_saveTimer);
  _taskFingerprints = null;
  _lastLocalPieces = null;
  appState = demoState;
  activeMonth = today.substring(0, 7);
  selectedDate = null;

  applyDemoChrome();
  applyCategoryColors();
  initUI();
  window.dispatchEvent(new Event("app:demo-entered"));
  return true;
}

function exitDemoMode() {
  location.reload();
}

// Swaps or hides the page's hardcoded personal content. Elements marked
// data-demo-hide in index.html are hidden by body.demo-mode (css/auth-gate.css).
function applyDemoChrome() {
  const copy = (typeof DEMO_COPY !== "undefined" && DEMO_COPY) || {};
  const byId = (id) => document.getElementById(id);
  document.body.classList.add("demo-mode");

  const banner = byId("demo-banner");
  if (banner) banner.hidden = false;

  // Auth bar: a named visitor, no avatar, no sync indicator.
  const userInfo = byId("auth-user-info");
  if (userInfo) { userInfo.innerText = copy.visitorName || "Demo visitor"; userInfo.classList.remove("hidden"); }
  const avatar = byId("auth-avatar");
  if (avatar) { avatar.removeAttribute("src"); avatar.classList.add("hidden"); }
  const ind = byId("sync-indicator");
  if (ind) ind.classList.add("hidden");
  const signOutBtn = byId("auth-signout-btn");
  if (signOutBtn) signOutBtn.classList.add("hidden");

  const logo = byId("logo-text");
  if (logo) logo.innerHTML = `${escapeHtml(copy.logoLead)} <span class="accent-text-cyan">${escapeHtml(copy.logoAccent)}</span>`;

  const lastDay = appState.days.length ? appState.days[appState.days.length - 1].date : null;
  const target = byId("metric-countdown-target");
  if (target && lastDay) {
    target.innerText = `Target: ${parseDate(lastDay).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  // Export is off in demo (export.js also refuses).
  ["dash-export-excel", "dash-export-csv", "dash-export-options"].forEach(id => {
    const btn = byId(id);
    if (btn) { btn.disabled = true; btn.title = copy.exportUnavailable || ""; }
  });
  const exportLabel = byId("last-export-label");
  if (exportLabel) exportLabel.textContent = copy.exportUnavailable || "";

  // Legend and category colours come from the sample categories.
  const cats = Object.values(getAllCategories()).filter(c => c.id !== "custom" && /^[a-z0-9_]+$/.test(c.id) && /^#[0-9a-fA-F]{6}$/.test(c.color));
  const legend = document.querySelector(".legend-grid");
  if (legend) {
    legend.innerHTML = cats.map(c =>
      `<div class="legend-item"><span class="legend-dot" style="background:${escapeHtml(c.color)}; box-shadow:0 0 6px ${escapeHtml(c.color)}"></span> ${escapeHtml(c.name)}</div>`
    ).join("");
  }
  const style = document.createElement("style");
  style.id = "demo-category-style";
  style.textContent = cats.map(c =>
    `.day-task-block.cat-${c.id}{background:${c.color};border-color:transparent}` +
    `.today-task-row.cat-${c.id}{border-left-color:${c.color}}` +
    `.task-cat-badge.badge-${c.id}{color:${c.color};border:1px solid ${c.color};background:color-mix(in srgb, ${c.color} 12%, transparent)}`
  ).join("\n");
  (document.head || document.body).appendChild(style);

  // Extracurricular form: sample categories and neutral placeholders.
  const ecCat = byId("ec-category");
  if (ecCat) {
    ecCat.innerHTML = Object.values(getAllCategories())
      .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  }
  [["ec-name", copy.ecNamePlaceholder], ["ec-role", copy.ecRolePlaceholder], ["ec-nextEvent", copy.ecNextEventPlaceholder]].forEach(([id, text]) => {
    const el = byId(id);
    if (el && text) el.placeholder = text;
  });
}
window.isDemoMode = isDemoMode;
window.enterDemoMode = enterDemoMode;
window.exitDemoMode = exitDemoMode;

// 12. EVENT LISTENERS & SETUP
function bootApp() {
  // Read local state only so loadStateFromFirestore can compare it with the
  // cloud copy. Migrations and rendering wait for auth (firebase-sync.js).
  loadState();
  
  // 1. Overlay click handler
  document.getElementById("overlay-backdrop").addEventListener("click", () => {
    closeDrawer();
    closeSettings();
    closeCategoryManager();
    document.getElementById("task-notes-modal").classList.remove("open");
    document.getElementById("extracurricular-modal").classList.remove("open");
    document.getElementById("overlay-backdrop").classList.remove("active");
  });
  
  // 2. Drawer actions
  document.getElementById("close-drawer-btn").addEventListener("click", closeDrawer);
  document.getElementById("rollover-btn").addEventListener("click", () => {
    if (selectedDate) {
      forceRollover(selectedDate);
      document.getElementById("undo-rollover-btn").style.display = "block";
    }
  });
  document.getElementById("undo-rollover-btn").addEventListener("click", () => {
    undoRollover();
    document.getElementById("undo-rollover-btn").style.display = appState.rolloverUndoSnapshot ? "block" : "none";
  });

  // 3. Tab navigation switcher
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      playSynthSound("click");
      tabButtons.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // 4. Header quick toggle
  document.getElementById("palana-toggle").addEventListener("change", (e) => {
    playSynthSound("click");
    appState.settings.palanaEnabled = e.target.checked;
    reflowRemainingCurriculum();
  });

  // 5. Settings modal handlers
  const settingsModal = document.getElementById("settings-modal");
  const openSettingsBtn = document.getElementById("open-settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const maxHoursInput = document.getElementById("input-max-hours");
  const maxHoursVal = document.getElementById("val-max-hours");

  function openSettings() {
    playSynthSound("click");
    // Sync UI values from state
    maxHoursInput.value = appState.settings.maxNormalDailyHours;
    maxHoursVal.innerText = appState.settings.maxNormalDailyHours;
    document.getElementById("settings-palana-toggle").checked = appState.settings.palanaEnabled;
    const palSec = document.getElementById("settings-palana-security-toggle");
    if (palSec) palSec.checked = appState.settings.palanaSecurityEnabled;
    const ahfTarget = document.getElementById("settings-ahf-weekly");
    if (ahfTarget) ahfTarget.value = appState.settings.ahfWeeklyTarget || 7;
    document.getElementById("settings-aws-passed").checked = appState.settings.awsExamPassed;
    document.getElementById("settings-secplus-passed").checked = appState.settings.securityPlusExamPassed;
    document.getElementById("settings-awscp-passed").checked = !!appState.settings.awscpExamPassed;
    
    settingsModal.classList.add("open");
    document.getElementById("overlay-backdrop").classList.add("active");
  }

  function closeSettings() {
    settingsModal.classList.remove("open");
    document.getElementById("overlay-backdrop").classList.remove("active");
  }

  openSettingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", () => {
    playSynthSound("click");
    closeSettings();
  });
  
  maxHoursInput.addEventListener("input", (e) => {
    maxHoursVal.innerText = e.target.value;
  });

  saveSettingsBtn.addEventListener("click", () => {
    playSynthSound("success");
    // Apply options to state
    appState.settings.maxNormalDailyHours = parseFloat(maxHoursInput.value);
    appState.settings.palanaEnabled = document.getElementById("settings-palana-toggle").checked;
    const palSec = document.getElementById("settings-palana-security-toggle");
    if (palSec) appState.settings.palanaSecurityEnabled = palSec.checked;
    const ahfTarget = document.getElementById("settings-ahf-weekly");
    const prevAhfTarget = appState.settings.ahfWeeklyTarget;
    if (ahfTarget) appState.settings.ahfWeeklyTarget = parseFloat(ahfTarget.value) || 7;
    if (appState.settings.ahfWeeklyTarget !== prevAhfTarget) resizeFutureAhfTasks();
    appState.settings.awsExamPassed = document.getElementById("settings-aws-passed").checked;
    appState.settings.securityPlusExamPassed = document.getElementById("settings-secplus-passed").checked;
    appState.settings.awscpExamPassed = document.getElementById("settings-awscp-passed").checked;
    
    closeSettings();
    reflowRemainingCurriculum();
  });

  // 6. Reset planner
  document.getElementById("reset-system-btn").addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("WARNING: Are you sure you want to hard reset your system state? All checked tasks will be wiped.")) {
      resetPlannerState();
      closeSettings();
    }
  });

  const demoExitBtn = document.getElementById("demo-exit-btn");
  if (demoExitBtn) demoExitBtn.addEventListener("click", exitDemoMode);

  // 7. Firebase auth buttons
  document.getElementById("auth-signin-btn").addEventListener("click", () => {
    if (typeof signInWithGoogle === "function") signInWithGoogle();
  });
  document.getElementById("auth-signout-btn").addEventListener("click", () => {
    if (typeof signOutFirebase === "function") signOutFirebase();
  });
  
  // ⭐ NEW: Go to Today button
  const goToTodayBtn = document.getElementById("go-to-today-btn");
  if (goToTodayBtn) {
    goToTodayBtn.addEventListener("click", goToToday);
  }
  
  // ⭐ Auto-open the month containing today on page load
  const realTodayDate = getRealCurrentDate();
  activeMonth = realTodayDate.substring(0, 7);
  renderCalendarMonthControls();
  renderCalendarDays();

  // Refresh today highlight after midnight (LA timezone)
  setInterval(() => {
    const nowToday = getRealCurrentDate();
    if (nowToday !== realTodayDate) {
      activeMonth = nowToday.substring(0, 7);
      initUI();
    }
  }, 60000);

  // Category manager button
  const catMgrBtn = document.getElementById("open-category-manager-btn");
  if (catMgrBtn) catMgrBtn.addEventListener("click", openCategoryManager);

  const palanaSecToggle = document.getElementById("settings-palana-security-toggle");
  if (palanaSecToggle) {
    palanaSecToggle.addEventListener("change", (e) => {
      appState.settings.palanaSecurityEnabled = e.target.checked;
      reflowRemainingCurriculum();
    });
  }
}

// Run boot immediately if the DOM is already parsed (scripts at end of body
// can execute after DOMContentLoaded has already fired, in which case a
// DOMContentLoaded listener would never run — leaving every button dead).
if (typeof window !== 'undefined' && !window.__NO_BOOT__) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApp);
  } else {
    bootApp();
  }
}
