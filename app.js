// Cybersecurity Study Plan - Core Scheduler & UI Engine

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
    { id: "aws_exam", title: "AWS Cloud Practitioner Certification Exam", duration: 1.5, link: "https://aws.amazon.com/certification/certified-cloud-practitioner/" }
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
  
  // CompTIA Security+ Tasks (Track 3)
  secplus: [
    { id: "sec_mod_1a", title: "Security+ Study: Module 1 - General Security Concepts (Part A)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_1b", title: "Security+ Study: Module 1 - General Security Concepts (Part B)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_2a", title: "Security+ Study: Module 2 - Threats, Vulnerabilities & Mitigations (Part A)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_2b", title: "Security+ Study: Module 2 - Threats, Vulnerabilities & Mitigations (Part B)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_2c", title: "Security+ Study: Module 2 - Threats, Vulnerabilities & Mitigations (Part C)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_3a", title: "Security+ Study: Module 3 - Security Architecture (Part A)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_3b", title: "Security+ Study: Module 3 - Security Architecture (Part B)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_3c", title: "Security+ Study: Module 3 - Security Architecture (Part C)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_4a", title: "Security+ Study: Module 4 - Security Operations (Part A)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_4b", title: "Security+ Study: Module 4 - Security Operations (Part B)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_4c", title: "Security+ Study: Module 4 - Security Operations (Part C)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_5a", title: "Security+ Study: Module 5 - Security Program Management (Part A)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_mod_5b", title: "Security+ Study: Module 5 - Security Program Management (Part B)", duration: 2.5, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_prac_1", title: "Security+ Dion Practice Exam 1 & Explanations", duration: 2, link: "https://www.udemy.com/course/securityplus/" },
    { id: "sec_prac_2", title: "Security+ Dion Practice Exam 2 & Explanations", duration: 2, link: "https://www.udemy.com/course/securityplus/" },
    { id: "sec_prac_3", title: "Security+ Dion Practice Exam 3 & Explanations", duration: 2, link: "https://www.udemy.com/course/securityplus/" },
    { id: "sec_prac_4", title: "Security+ Dion Practice Exam 4 & Explanations", duration: 2, link: "https://www.udemy.com/course/securityplus/" },
    { id: "sec_review", title: "Security+ Messer Videos Speed Run & Notes Review", duration: 2, link: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" },
    { id: "sec_exam", title: "CompTIA Security+ SY0-701 Certification Exam", duration: 2.5, link: "https://www.comptia.org/certifications/security" }
  ]
};

// 4. GLOBAL STATE VARIABLES

// Bump this whenever the schedule-generation logic changes. On load, saved states
// (local + cloud) with an older version auto-migrate while preserving completed tasks.
const SCHEDULE_VERSION = 2;

let appState = {
  settings: {
    maxNormalDailyHours: 8,
    palanaEnabled: true,
    awsExamPassed: false,
    securityPlusExamPassed: false,
    selectedProjects: ["password_manager", "packet_analyzer", "vulnerability_scanner"], // default projects
    lastRolloverDay: null, // date string representing the last day forced rollover
    scheduleVersion: SCHEDULE_VERSION
  },
  days: [] // array of all days
};

// Date constants
const START_DATE_STR = "2026-06-13";
const END_DATE_STR = "2026-09-01";
const INDIA_START_STR = "2026-06-24";
const INDIA_END_STR = "2026-07-08";
const INFO_START_STR = "2026-06-22";
const INFO_END_STR = "2026-08-21";

// Palana job: onboarding begins the week of June 27, 2026. Intensive prep is
// front-loaded into the lead-up window (plan start → day before onboarding).
const PALANA_ONBOARDING_STR = "2026-06-27";
const PALANA_PREP_TASKS = [
  "Palana Prep: Company mission, safety domain & product deep-dive",
  "Palana Prep: Set up dev environment, accounts & onboarding tooling",
  "Palana Prep: Study the tech stack & architecture documentation",
  "Palana Prep: Review safety/compliance standards & domain knowledge",
  "Palana Prep: Role-specific skill brush-up & hands-on exercises",
  "Palana Prep: Read team repos, codebase & contribution guidelines",
  "Palana Prep: Draft onboarding goals, questions & a 30-day plan",
  "Palana Prep: Research the team & prepare intro/networking notes",
  "Palana Prep: Mock tasks & practice in the problem space",
  "Palana Prep: Consolidate notes & final onboarding readiness review"
];

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
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getDayOfWeek(dateStr) {
  const date = parseDate(dateStr);
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
}

function isIndiaTrip(dateStr) {
  return dateStr >= INDIA_START_STR && dateStr <= INDIA_END_STR;
}

function isInfo310Class(dateStr) {
  return dateStr >= INFO_START_STR && dateStr <= INFO_END_STR;
}

// True during the Palana onboarding lead-up window (plan start → day before onboarding).
function isPalanaPrepWindow(dateStr) {
  return dateStr >= START_DATE_STR && dateStr < PALANA_ONBOARDING_STR;
}

// Builds the Palana task for a given day (or null if none should be scheduled).
// Before onboarding: intensive daily "Palana Onboarding Prep" blocks.
// After onboarding: regular weekday safety-engineering work blocks.
function buildPalanaTaskForDay(dateStr, dayOfWeek, isIndia) {
  if (!appState.settings.palanaEnabled) return null;
  if (isIndia) return null; // India trip is capacity-capped; no Palana blocks

  if (isPalanaPrepWindow(dateStr)) {
    // Intensive onboarding prep — front-loaded before the job starts.
    let hours;
    if (dayOfWeek === 0) hours = 1.0;        // Sunday (light, it's a rest day)
    else if (dayOfWeek === 6) hours = 2.0;   // Saturday
    else hours = 3.0;                         // Weekday — intensive
    const offset = getDaysBetween(START_DATE_STR, dateStr);
    const title = PALANA_PREP_TASKS[offset % PALANA_PREP_TASKS.length];
    return {
      id: `${dateStr}_palana`,
      category: "palana",
      title: `🚀 ${title}`,
      duration: hours,
      completed: false,
      link: null
    };
  }

  // Regular Palana work after onboarding (weekdays only): Mon-Thu 1.5h, Fri 2h.
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const palanaHours = (dayOfWeek === 5) ? 2.0 : 1.5;
    return {
      id: `${dateStr}_palana`,
      category: "palana",
      title: "Palana Work (Safety Engineering)",
      duration: palanaHours,
      completed: false,
      link: null
    };
  }
  return null;
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
  const end = parseDate(END_DATE_STR);
  
  let current = new Date(start);
  while (current <= end) {
    const dateStr = formatDate(current);
    const dayOfWeek = getDayOfWeek(dateStr);
    const isIndia = isIndiaTrip(dateStr);
    const isClassActive = isInfo310Class(dateStr);
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    const dayObj = {
      date: dateStr,
      isIndia: isIndia,
      maxCapacity: getBaseCapacityForDay(dateStr, appState.settings.maxNormalDailyHours),
      tasks: [],
      rolledOver: false
    };
    
    // Add Routines for this day
    // 1. AHF Tech Lead Work (1h every single day, no exceptions)
    dayObj.tasks.push({
      id: `${dateStr}_ahf`,
      category: "ahf",
      title: "AHF Work (Tech Lead Duties)",
      duration: 1.0,
      completed: false,
      link: null
    });
    
    // 2. LeetCode (1 problem/day, daily, ~0.5h)
    // Draw problem id from 1 to 75. Let's do it sequentially.
    // For indexing: let's map it based on the number of days we've generated
    // (We will adjust LC problem IDs dynamically so that Sunday can be skipped/grouped)
    dayObj.tasks.push({
      id: `${dateStr}_leetcode`,
      category: "leetcode",
      title: "LeetCode Blind 75 Problem",
      duration: 0.5,
      completed: false,
      link: "https://neetcode.io/practice/practice/blind75",
      leetcodeId: null // will populate below
    });

    // 3. College class INFO 310 (June 22 - Aug 21, Weekdays only, 1h)
    if (isClassActive && isWeekday) {
      dayObj.tasks.push({
        id: `${dateStr}_info310`,
        category: "info310",
        title: "INFO 310 – Security Studies (Lecture/Review)",
        duration: 1.0,
        completed: false,
        link: null
      });
    }

    // 4. Palana — intensive onboarding prep before the job starts (week of June 27),
    //    then regular safety-engineering work blocks afterwards.
    const palanaTask = buildPalanaTaskForDay(dateStr, dayOfWeek, isIndia);
    if (palanaTask) {
      dayObj.tasks.push(palanaTask);
    }

    // 5. GitHub Extension Passion Project (2 hours/week, Saturday preferred, unless on India Trip).
    //    Paused on Palana-prep Saturdays so the day stays within capacity for job prep.
    if (dayOfWeek === 6 && !isIndia && !(appState.settings.palanaEnabled && isPalanaPrepWindow(dateStr))) {
      dayObj.tasks.push({
        id: `${dateStr}_github`,
        category: "github",
        title: "Git Extension Project – Beginner/Pro GitHub Tool (with friend)",
        duration: 2.0,
        completed: false,
        link: null
      });
    }

    daysList.push(dayObj);
    current.setDate(current.getDate() + 1);
  }

  // Assign exact LeetCode questions from BLIND_75_QUESTIONS array (excluding Sundays)
  let lcIndex = 0;
  for (let i = 0; i < daysList.length; i++) {
    const day = daysList[i];
    const dayOfWeek = getDayOfWeek(day.date);
    const lcTask = day.tasks.find(t => t.category === "leetcode");
    
    // Standard rule: 1 per day. On rest days (Sunday) we can skip it, and do 2 on Monday (or next day)
    // Let's make LeetCode skipped on Sundays, and schedule 2 problems on Monday!
    if (dayOfWeek === 0) {
      // Skip on Sunday! Remove the task or set duration to 0. Let's just remove the task block.
      day.tasks = day.tasks.filter(t => t.category !== "leetcode");
    } else {
      // Weekday / Saturday
      if (dayOfWeek === 1 && lcIndex > 0) {
        // Monday: Schedule 2 problems (Sunday rollover built-in)
        lcTask.title = `LeetCode Blind 75: #${BLIND_75_QUESTIONS[lcIndex % 75].id} - ${BLIND_75_QUESTIONS[lcIndex % 75].name}`;
        lcTask.link = BLIND_75_QUESTIONS[lcIndex % 75].link;
        lcTask.leetcodeId = BLIND_75_QUESTIONS[lcIndex % 75].id;
        lcIndex++;
        
        // Add second LeetCode task for Monday
        day.tasks.push({
          id: `${day.date}_leetcode_2`,
          category: "leetcode",
          title: `LeetCode Blind 75: #${BLIND_75_QUESTIONS[lcIndex % 75].id} - ${BLIND_75_QUESTIONS[lcIndex % 75].name}`,
          duration: 0.5,
          completed: false,
          link: BLIND_75_QUESTIONS[lcIndex % 75].link,
          leetcodeId: BLIND_75_QUESTIONS[lcIndex % 75].id
        });
        lcIndex++;
      } else {
        // Standard Day: Schedule 1 problem
        lcTask.title = `LeetCode Blind 75: #${BLIND_75_QUESTIONS[lcIndex % 75].id} - ${BLIND_75_QUESTIONS[lcIndex % 75].name}`;
        lcTask.link = BLIND_75_QUESTIONS[lcIndex % 75].link;
        lcTask.leetcodeId = BLIND_75_QUESTIONS[lcIndex % 75].id;
        lcIndex++;
      }
    }
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
      link: t.link
    });
  });

  // Add Security+ Tasks (Track 3)
  CORE_CURRICULUM.secplus.forEach(t => {
    curriculumBacklog.push({
      category: "secplus",
      title: t.title,
      duration: t.duration,
      link: t.link
    });
  });

  // Add Selected Projects Tasks (Track 4)
  appState.settings.selectedProjects.forEach(projId => {
    const proj = TRACK_4_PROJECTS.find(p => p.id === projId);
    if (proj) {
      proj.tasks.forEach(t => {
        curriculumBacklog.push({
          category: "projects",
          title: t.name,
          duration: t.duration,
          link: "https://bestprojectideas.com/cybersecurity-project-ideas/"
        });
      });
    }
  });

  // Schedule Curriculum Tasks sequentially into the calendar days
  distributeCurriculumTasks(daysList, curriculumBacklog, 0);

  appState.days = daysList;
}

// 7. SCHEDULER ENGINE - TASK DISTRIBUTOR / REFLOW ENGINE
// Distributes a backlog of curriculum tasks onto future days (from `startDayIndex` onwards)
// respecting max capacities, India trip constraints, and sequencing rules.
function distributeCurriculumTasks(daysArray, backlog, startDayIndex) {
  // Clear any existing curriculum tasks from the days we are reflowing
  for (let i = startDayIndex; i < daysArray.length; i++) {
    daysArray[i].tasks = daysArray[i].tasks.filter(t => 
      t.completed || 
      t.category === "ahf" || 
      t.category === "leetcode" || 
      t.category === "info310" || 
      t.category === "palana" || 
      t.category === "github"
    );
  }

  let backlogIndex = 0;
  
  for (let i = startDayIndex; i < daysArray.length; i++) {
    if (backlogIndex >= backlog.length) break;
    
    const day = daysArray[i];
    
    // Rule: PortSwigger (Track 1) runs June 13 - June 27, but drops to 0 hrs during India trip (starts June 24).
    // AWS runs first week (exam June 23).
    // Security+ starts July 9.
    // Projects run after Security+ exam.
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
    
    // Distribute tasks on this day up to its maxCapacity
    while (scheduledHours < day.maxCapacity && backlogIndex < backlog.length) {
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
        // Security+ starts after India trip (July 9)
        if (day.date < "2026-07-09") {
          break; // Cannot schedule Sec+ before July 9. Move to next day.
        }
      }

      if (task.category === "projects") {
        // Projects start after Security+ exam (target August 22/23)
        if (day.date < "2026-08-22") {
          break; // Cannot schedule projects before Sec+ finishes
        }
      }

      const availableSpace = day.maxCapacity - scheduledHours;
      
      if (availableSpace >= 0.5) {
        if (task.duration <= availableSpace) {
          // Task fits fully
          day.tasks.push({
            id: `${day.date}_curr_${backlogIndex}_${task.category}`,
            category: task.category,
            title: task.title,
            duration: task.duration,
            completed: false,
            link: task.link
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
              link: task.link
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
    let overflowDate = parseDate(END_DATE_STR);
    
    while (backlogIndex < backlog.length) {
      overflowDate.setDate(overflowDate.getDate() + 1);
      const dateStr = formatDate(overflowDate);
      
      const overflowDay = {
        date: dateStr,
        isIndia: false,
        maxCapacity: appState.settings.maxNormalDailyHours,
        tasks: [],
        rolledOver: false,
        isOverflow: true
      };
      
      let scheduledHours = 0;
      
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
            link: task.link
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
              link: task.link
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
      
      daysArray.push(overflowDay);
    }
  }
}

// 8. SMART ROLLOVER LOGIC ("I didn't finish today")
function forceRollover(dayDateStr) {
  const activeDayIndex = appState.days.findIndex(d => d.date === dayDateStr);
  if (activeDayIndex === -1) return;

  // Mark the day itself as rolled over
  appState.days[activeDayIndex].rolledOver = true;
  appState.settings.lastRolloverDay = dayDateStr;

  // 1. Gather all uncompleted CURRICULUM tasks on or before the selected day
  // Routine tasks (ahf, leetcode, info310, palana, github) are not rolled over —
  // missed daily routines are just dropped rather than duplicated on future days.
  const pastUncompletedTasks = [];
  for (let i = 0; i <= activeDayIndex; i++) {
    const day = appState.days[i];
    const uncompleted = day.tasks.filter(t => !t.completed);
    
    uncompleted.forEach(t => {
      // Only roll over curriculum study tasks, not daily routines
      const isCurriculum = t.category === "portswigger" || t.category === "aws" ||
                           t.category === "secplus" || t.category === "projects";
      if (isCurriculum) {
        // Record reschedule history in a lightweight ledger (keyed by clean title)
        // so exports can report original date, move count, and last-moved-from.
        const cleanTitle = t.title.replace(" (Part A)", "").replace(" (Part B)", "").replace(" (Rolled Over)", "");
        appState.rescheduleLedger = appState.rescheduleLedger || {};
        const led = appState.rescheduleLedger[cleanTitle] || { originalDate: (t.originalDate || day.date), count: 0 };
        led.count += 1;
        led.lastMovedFrom = day.date;
        led.movedOn = new Date().toISOString();
        appState.rescheduleLedger[cleanTitle] = led;

        pastUncompletedTasks.push({
          category: t.category,
          title: t.title.replace(" (Part A)", "").replace(" (Part B)", "") + " (Rolled Over)",
          duration: t.duration,
          link: t.link
        });
      }
    });
    
    // Clear uncompleted tasks from these past days so they aren't duplicated
    day.tasks = day.tasks.filter(t => t.completed);
  }

  // 2. Gather all uncompleted curriculum tasks on days AFTER the selected day
  const futureCurriculumBacklog = [];
  
  // We remove any extra overflow days that were created previously before recalculating
  appState.days = appState.days.filter(d => !d.isOverflow);

  for (let i = activeDayIndex + 1; i < appState.days.length; i++) {
    const day = appState.days[i];
    const curriculumTasks = day.tasks.filter(t => 
      t.category === "portswigger" || 
      t.category === "aws" || 
      t.category === "secplus" || 
      t.category === "projects"
    );
    
    // Separate completed vs uncompleted
    curriculumTasks.forEach(t => {
      if (!t.completed) {
        futureCurriculumBacklog.push({
          category: t.category,
          title: t.title.replace(" (Part A)", "").replace(" (Part B)", ""), // remove partial tags
          duration: t.duration,
          link: t.link
        });
      }
    });

    // Remove uncompleted curriculum tasks from the day (keep completed ones)
    day.tasks = day.tasks.filter(t => 
      t.completed || 
      !(t.category === "portswigger" || t.category === "aws" || t.category === "secplus" || t.category === "projects")
    );
  }

  // Combine past rolled-over tasks + future uncompleted curriculum tasks
  // Keep original sorting: PortSwigger -> AWS -> Sec+ -> Projects
  const combinedBacklog = [...pastUncompletedTasks, ...futureCurriculumBacklog];
  
  // Group and sort combinedBacklog by category order
  const categoryOrder = { "portswigger": 1, "aws": 2, "secplus": 3, "projects": 4, "ahf": 5, "leetcode": 6, "info310": 7, "palana": 8, "github": 9 };
  combinedBacklog.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));

  // 3. Redistribute all backlog tasks starting from Day D+1
  distributeCurriculumTasks(appState.days, combinedBacklog, activeDayIndex + 1);

  // Save state & redraw UI
  saveState();
  initUI();
  
  // Open the next day detail automatically to guide user flow
  if (activeDayIndex + 1 < appState.days.length) {
    showDayDetails(appState.days[activeDayIndex + 1].date);
  } else {
    closeDrawer();
  }
  
  // Sound effect
  playSynthSound("warning");
}

// Reflows scheduled hours if Palana Project toggle or settings are modified.
// Does NOT lock any days, just reflows the future curriculum.
function reflowRemainingCurriculum() {
  // Find current date or last rollover date to start reflowing
  let startReflowIndex = 0;
  if (appState.settings.lastRolloverDay) {
    const idx = appState.days.findIndex(d => d.date === appState.settings.lastRolloverDay);
    if (idx !== -1) {
      startReflowIndex = idx + 1;
    }
  }

  // Pre-calculate the correct LeetCode Blind 75 question index up to startReflowIndex
  let lcIndex = 0;
  for (let i = 0; i < startReflowIndex; i++) {
    const d = appState.days[i];
    d.tasks.forEach(t => {
      // Only count standard LeetCode tasks, not rolled-over ones
      if (t.category === "leetcode" && !t.title.includes("Rolled Over")) {
        lcIndex++;
      }
    });
  }

  // Snapshot the uncompleted curriculum backlog BEFORE rebuilding routines below,
  // because that rebuild clears each day's task list. (Without this, toggling
  // Palana/settings would silently wipe all PortSwigger/AWS/Sec+ tasks.)
  const curriculumBacklog = [];
  for (let i = startReflowIndex; i < appState.days.length; i++) {
    appState.days[i].tasks.forEach(t => {
      const isCurriculum = t.category === "portswigger" || t.category === "aws" || t.category === "secplus";
      if (!t.completed && (isCurriculum || t.title.includes("Rolled Over"))) {
        curriculumBacklog.push({
          category: t.category,
          title: t.title.replace(" (Part A)", "").replace(" (Part B)", ""),
          duration: t.duration,
          link: t.link
        });
      }
    });
  }

  // Re-generate fixed routines for days >= startReflowIndex (to apply Palana/capacity edits)
  for (let i = startReflowIndex; i < appState.days.length; i++) {
    const day = appState.days[i];
    
    // Save any completed tasks first!
    const completedTasks = day.tasks.filter(t => t.completed);
    
    // Clean all tasks
    day.tasks = [];
    
    // Update maxCapacity based on new settings
    day.maxCapacity = getBaseCapacityForDay(day.date, appState.settings.maxNormalDailyHours);
    
    // Restore completed tasks
    completedTasks.forEach(ct => day.tasks.push(ct));
    
    // Re-add routines if they were not already completed
    const dayOfWeek = getDayOfWeek(day.date);
    const isIndia = day.isIndia;
    const isClassActive = isInfo310Class(day.date);
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    // AHF (unless completed)
    if (!day.tasks.some(t => t.category === "ahf")) {
      day.tasks.push({
        id: `${day.date}_ahf`,
        category: "ahf",
        title: "AHF Work (Tech Lead Duties)",
        duration: 1.0,
        completed: false,
        link: null
      });
    }
    
    // Check if LeetCode task already exists as completed
    const existingLcCount = day.tasks.filter(t => t.category === "leetcode" && !t.title.includes("Rolled Over")).length;
    lcIndex += existingLcCount;

    // LeetCode (unless completed and not Sunday)
    if (dayOfWeek !== 0 && existingLcCount === 0) {
      const problem = BLIND_75_QUESTIONS[lcIndex % 75];
      const lcTitle = `LeetCode Blind 75: #${problem.id} - ${problem.name}`;
      const lcLink = problem.link;
      const lcId = problem.id;
      lcIndex++;
      
      day.tasks.push({
        id: `${day.date}_leetcode`,
        category: "leetcode",
        title: lcTitle,
        duration: 0.5,
        completed: false,
        link: lcLink,
        leetcodeId: lcId
      });

      // If it's Monday, add second problem (since Sunday was skipped)
      if (dayOfWeek === 1 && lcIndex > 0) {
        const problem2 = BLIND_75_QUESTIONS[lcIndex % 75];
        day.tasks.push({
          id: `${day.date}_leetcode_2`,
          category: "leetcode",
          title: `LeetCode Blind 75: #${problem2.id} - ${problem2.name}`,
          duration: 0.5,
          completed: false,
          link: problem2.link,
          leetcodeId: problem2.id
        });
        lcIndex++;
      }
    }

    // INFO 310 (unless completed)
    if (isClassActive && isWeekday && !day.tasks.some(t => t.category === "info310")) {
      day.tasks.push({
        id: `${day.date}_info310`,
        category: "info310",
        title: "INFO 310 – Security Studies (Lecture/Review)",
        duration: 1.0,
        completed: false,
        link: null
      });
    }

    // Palana — intensive onboarding prep in lead-up window, regular work after
    // (unless a Palana task is already present/completed for this day)
    if (!day.tasks.some(t => t.category === "palana")) {
      const palanaTask = buildPalanaTaskForDay(day.date, dayOfWeek, isIndia);
      if (palanaTask) {
        day.tasks.push(palanaTask);
      }
    }

    // Git Project (unless completed). Paused on Palana-prep Saturdays for job-prep capacity.
    if (dayOfWeek === 6 && !isIndia && !(appState.settings.palanaEnabled && isPalanaPrepWindow(day.date)) && !day.tasks.some(t => t.category === "github")) {
      day.tasks.push({
        id: `${day.date}_github`,
        category: "github",
        title: "Git Extension Project – Beginner/Pro GitHub Tool (with friend)",
        duration: 2.0,
        completed: false,
        link: null
      });
    }
  }

  // Remove overflow days (recreated during distribution if the plan runs long)
  appState.days = appState.days.filter(d => !d.isOverflow);

  // Track which project tasks are already completed anywhere in the plan
  // so we don't re-schedule them when rebuilding the project backlog.
  const completedProjectTitles = new Set();
  appState.days.forEach(day => {
    day.tasks.forEach(t => {
      if (t.category === "projects" && t.completed) {
        const clean = t.title.replace(" (Part A)", "").replace(" (Part B)", "").replace(" (Rolled Over)", "");
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

  // Sort backlog by original sequence
  const categoryOrder = { "portswigger": 1, "aws": 2, "secplus": 3, "projects": 4 };
  curriculumBacklog.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));

  // Distribute tasks
  distributeCurriculumTasks(appState.days, curriculumBacklog, startReflowIndex);

  // Save State and Render
  saveState();
  initUI();
}

// 9. LOCAL STORAGE PERSISTENCE
function saveState() {
  localStorage.setItem("cyber_study_plan_state_2026", JSON.stringify(appState));
  // Also sync to Firebase cloud if user is signed in
  if (typeof saveStateToFirestore === "function" && currentUser) {
    saveStateToFirestore();
  }
}

function loadState() {
  const saved = localStorage.getItem("cyber_study_plan_state_2026");
  if (saved) {
    try {
      appState = JSON.parse(saved);
      // Validate load
      if (!appState.days || appState.days.length === 0) {
        generateNewState();
      }
    } catch (e) {
      console.error("Failed to parse state, generating new.", e);
      generateNewState();
    }
  } else {
    generateNewState();
  }
}

function generateNewState() {
  generateBaseSchedule();
  saveState();
}

// Upgrades an older saved schedule (local or cloud) to the current SCHEDULE_VERSION.
// Re-applies routines (including the new Palana onboarding prep) and redistributes
// curriculum while preserving any tasks already marked complete. Returns true if it ran.
function migrateScheduleIfNeeded() {
  if (!appState || !appState.settings || !appState.days || appState.days.length === 0) return false;
  if (appState.settings.scheduleVersion === SCHEDULE_VERSION) return false;
  appState.settings.scheduleVersion = SCHEDULE_VERSION;
  reflowRemainingCurriculum(); // preserves completed tasks; re-renders + saves
  return true;
}

function resetPlannerState() {
  localStorage.removeItem("cyber_study_plan_state_2026");
  appState.settings = {
    maxNormalDailyHours: 8,
    palanaEnabled: true,
    awsExamPassed: false,
    securityPlusExamPassed: false,
    selectedProjects: ["password_manager", "packet_analyzer", "vulnerability_scanner"],
    lastRolloverDay: null,
    scheduleVersion: SCHEDULE_VERSION
  };
  generateNewState();
  initUI();
  playSynthSound("reset");
}

// 10. SYNTH AUDIO FOR RETRO HACKER CHIMES
// Creates offline sound pulses using Web Audio API
function playSynthSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
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
  renderDashboardMetrics();
  renderProjectSelector();
  renderCalendarMonthControls();
  renderCalendarDays();
  renderTracksChecklists();
  updateRiskBanner();
  cycleQuotes();
}

// Overall Stats calculations
function renderDashboardMetrics() {
  // Count total tasks
  let totalTasks = 0;
  let completedTasks = 0;
  let leetCodeDone = 0;
  let totalLeetCode = 75; // Blind 75
  
  let portswiggerDone = 0;
  let totalPortswigger = CORE_CURRICULUM.portswigger.length;
  
  let secPlusHours = 0;
  
  appState.days.forEach(day => {
    day.tasks.forEach(t => {
      totalTasks++;
      if (t.completed) completedTasks++;
      
      // Portswigger specific
      if (t.category === "portswigger" && t.completed) {
        portswiggerDone++;
      }
      
      // Leetcode specific
      if (t.category === "leetcode" && t.completed) {
        leetCodeDone++;
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

  // Determine the simulated "today" boundary — only count days up to and including today
  // to prevent future incomplete days from resetting the streak.
  let simulatedTodayStr = appState.settings.lastRolloverDay || START_DATE_STR;

  // We calculate streak based on days that have tasks and ALL tasks are completed
  // (or at least 1 task was completed and nothing left unchecked)
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i];
    // Only count days up to and including simulated today
    if (day.date > simulatedTodayStr) break;
    // Check if day has tasks
    if (day.tasks.length > 0) {
      const allDone = day.tasks.every(t => t.completed);
      const anyDone = day.tasks.some(t => t.completed);
      
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
  // Note: Today's date is simulated. Since this is a 2026 study plan, let's treat the date as active.
  // If we are currently in 2026 (local time), the study plan has completed, but let's mock the "current" study date.
  // Let's assume the simulated current date is the first day of the plan June 13, 2026 or the last rolled-over day.
  let simulatedToday = parseDate(START_DATE_STR);
  if (appState.settings.lastRolloverDay) {
    simulatedToday = parseDate(appState.settings.lastRolloverDay);
  }
  const endPlanDate = parseDate(END_DATE_STR);
  const diffTime = endPlanDate - simulatedToday;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  document.getElementById("metric-countdown").innerText = `${daysLeft} days`;

  // Streak rendering
  document.getElementById("metric-streak").innerText = `${currentStreak} days`;
  document.getElementById("metric-longest-streak").innerText = `Longest: ${longestStreak} days`;
  
  // LeetCode progress
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
    const awsExamTaskCompleted = appState.days.some(d => d.tasks.some(t => t.category === "aws" && t.title.includes("Certification Exam") && t.completed));
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
    const secExamTaskCompleted = appState.days.some(d => d.tasks.some(t => t.category === "secplus" && t.title.includes("Certification Exam") && t.completed));
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

  // Bind settings modal checkboxes to state
  document.getElementById("settings-aws-passed").checked = appState.settings.awsExamPassed;
  document.getElementById("settings-secplus-passed").checked = appState.settings.securityPlusExamPassed;
  document.getElementById("palana-toggle").checked = appState.settings.palanaEnabled;
  document.getElementById("settings-palana-toggle").checked = appState.settings.palanaEnabled;
}

// Sidebar project checkboxes
function renderProjectSelector() {
  const container = document.getElementById("project-options-list");
  container.innerHTML = "";
  
  TRACK_4_PROJECTS.forEach(proj => {
    const isSelected = appState.settings.selectedProjects.includes(proj.id);
    
    const label = document.createElement("label");
    label.className = "checkbox-container";
    label.innerHTML = `
      <input type="checkbox" value="${proj.id}" ${isSelected ? 'checked' : ''}>
      <span class="custom-checkbox"></span>
      ${proj.name}
      <span class="proj-meta">${proj.totalHours} hrs • 1-2 weeks</span>
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
  
  const months = [
    { code: "2026-06", label: "JUNE 2026" },
    { code: "2026-07", label: "JULY 2026" },
    { code: "2026-08", label: "AUGUST 2026" },
    { code: "2026-09", label: "SEPT 2026" }
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
  
  monthDays.forEach(day => {
    const dayCell = document.createElement("div");
    dayCell.className = "day-cell";
    
    // Highlight today (simulated: last rollover day, or plan start if no rollover yet)
    const simulatedTodayDate = appState.settings.lastRolloverDay || START_DATE_STR;
    const isToday = simulatedTodayDate === day.date;
    if (isToday) {
      dayCell.classList.add("today-cell");
    }
    
    // Color load meter
    const totalScheduled = day.tasks.reduce((sum, t) => sum + t.duration, 0);
    const capacityRatio = day.maxCapacity > 0 ? (totalScheduled / day.maxCapacity) : 0;
    
    let loadClass = "load-optimal";
    if (capacityRatio > 1.0) {
      loadClass = "load-overloaded";
    } else if (capacityRatio >= 0.8) {
      loadClass = "load-warning";
    }

    // Check if there are uncompleted tasks in the past
    // E.g. warning icon on cell
    const isPast = day.date < (appState.settings.lastRolloverDay || START_DATE_STR);
    const hasUnfinishedPast = isPast && day.tasks.some(t => !t.completed);
    
    const warningIconHtml = hasUnfinishedPast ? 
      `<span class="cell-warning-icon" title="Uncompleted tasks! Click rollover.">⚠️</span>` : '';
    
    const dayNum = parseInt(day.date.split('-')[2]);
    const displayCap = day.maxCapacity.toFixed(0);
    
    dayCell.innerHTML = `
      <div class="day-header-info">
        <span class="day-number">${dayNum}</span>
        <span class="day-capacity-badge">${displayCap}h Max</span>
      </div>
      <div class="day-load-meter">
        <div class="day-load-fill ${loadClass}" style="width: ${Math.min(100, Math.round(capacityRatio * 100))}%"></div>
      </div>
      <div class="day-tasks-dots">
        <!-- Dynamically filled with task tokens -->
      </div>
      ${warningIconHtml}
    `;
    
    // Add colored task blocks
    const dotsContainer = dayCell.querySelector(".day-tasks-dots");
    // Sort tasks so completed ones are pushed to bottom
    const sortedTasks = [...day.tasks].sort((a,b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
    
    sortedTasks.forEach(task => {
      const block = document.createElement("div");
      block.className = `day-task-block cat-${task.category} ${task.completed ? 'task-completed' : ''}`;
      block.innerText = task.title;
      dotsContainer.appendChild(block);
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
  
  const daysDiff = getDaysBetween(START_DATE_STR, dateStr) + 1;
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

  // India Trip warning banner
  const noteEl = document.getElementById("drawer-day-note");
  if (day.isIndia) {
    noteEl.innerText = "INDIA TRIP: Workload capped to 2-3 hours max. Light tasks only.";
    noteEl.className = "drawer-day-note";
    noteEl.classList.remove("hidden");
  } else {
    noteEl.classList.add("hidden");
  }
  
  // Task checklist listing
  const listContainer = document.getElementById("drawer-tasks-list");
  listContainer.innerHTML = "";
  
  if (day.tasks.length === 0) {
    listContainer.innerHTML = `<div class="empty-state-text" style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:1rem;">No tasks scheduled. Relax! 🛰️</div>`;
  } else {
    day.tasks.forEach(task => {
      const itemRow = document.createElement("div");
      itemRow.className = `drawer-task-item ${task.completed ? 'task-checked' : ''}`;
      
      const linkHtml = task.link ? 
        `<a href="${task.link}" target="_blank" class="task-link-arrow" title="View Reference Link">&rarr;</a>` : '';

      const isCustom = task.category === "custom";
      const deleteHtml = isCustom
        ? `<button class="task-delete-btn" title="Delete task">✕</button>`
        : '';
      
      itemRow.innerHTML = `
        <label class="checkbox-container">
          <input type="checkbox" ${task.completed ? 'checked' : ''}>
          <span class="custom-checkbox"></span>
        </label>
        <div class="task-details">
          <span class="task-label">${task.title}</span>
          <div class="task-sub-meta">
            <span class="task-cat-badge badge-${task.category}">${task.category}</span>
            <span>Est: ${task.duration} hr${task.duration > 1 ? 's' : ''}</span>
          </div>
        </div>
        ${linkHtml}
        ${deleteHtml}
      `;

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
      
      // Checkbox listener
      const cb = itemRow.querySelector('input');
      cb.addEventListener('change', (e) => {
        task.completed = e.target.checked;
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
      link: null
    };

    day.tasks.push(newTask);
    saveState();
    playSynthSound("success");
    titleInput.value = "";
    durationInput.value = "1";

    // Re-render everything
    renderDashboardMetrics();
    renderCalendarDays();
    showDayDetails(dateStr); // re-render drawer with new task
  });

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
        
        const linkHtml = ut.link ? ` (<a href="${ut.link}" target="_blank">Link</a>)` : '';
        const dateParts = ut.originalDay.split('-');
        const displayDate = `${dateParts[1]}/${dateParts[2]}`;
        
        row.innerHTML = `
          <span style="color:${ut.completed ? 'var(--neon-green)' : 'var(--text-muted)'}">${ut.completed ? '✅' : '⚙️'}</span>
          <span style="flex-grow:1">${ut.title}${linkHtml}</span>
          <span style="font-size:0.65rem; color:var(--text-muted); font-family:var(--font-mono)">Sched: ${displayDate}</span>
        `;
        listContainer.appendChild(row);
      });
    }
  });
}

// Flashes UI alert warning if we scheduled past September 1st
function updateRiskBanner() {
  const atRisk = appState.days.some(d => d.isOverflow);
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
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  quoteEl.innerText = MOTIVATIONAL_QUOTES[index];
  
  if (quoteInterval) clearInterval(quoteInterval);
  quoteInterval = setInterval(() => {
    // Typewriter emulation
    quoteEl.style.opacity = 0;
    setTimeout(() => {
      const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      quoteEl.innerText = MOTIVATIONAL_QUOTES[idx];
      quoteEl.style.opacity = 1;
    }, 400);
  }, 12000);
}

// 12. EVENT LISTENERS & SETUP
document.addEventListener("DOMContentLoaded", () => {
  // Load local storage state
  loadState();
  migrateScheduleIfNeeded(); // upgrade older saved schedules (adds Palana onboarding prep)
  initUI();
  
  // 1. Overlay click handler
  document.getElementById("overlay-backdrop").addEventListener("click", () => {
    closeDrawer();
    closeSettings();
  });
  
  // 2. Drawer actions
  document.getElementById("close-drawer-btn").addEventListener("click", closeDrawer);
  document.getElementById("rollover-btn").addEventListener("click", () => {
    if (selectedDate) {
      forceRollover(selectedDate);
    }
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
    document.getElementById("settings-aws-passed").checked = appState.settings.awsExamPassed;
    document.getElementById("settings-secplus-passed").checked = appState.settings.securityPlusExamPassed;
    
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
    appState.settings.awsExamPassed = document.getElementById("settings-aws-passed").checked;
    appState.settings.securityPlusExamPassed = document.getElementById("settings-secplus-passed").checked;
    
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

  // 7. Firebase auth buttons
  document.getElementById("auth-signin-btn").addEventListener("click", () => {
    if (typeof signInWithGoogle === "function") signInWithGoogle();
  });
  document.getElementById("auth-signout-btn").addEventListener("click", () => {
    if (typeof signOutFirebase === "function") signOutFirebase();
  });
});
