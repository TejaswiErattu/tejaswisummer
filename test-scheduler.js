// Node.js regression test for the scheduler logic (no browser required).
//
// Loads blind75.js, git-roadmap.js, app.js and plan-extension-2026.js into a
// single shared vm context (same order as index.html) so that their top-level
// const/let/function declarations are all visible to each other, exactly as
// they are on the page. app.js's own DOMContentLoaded/readyState boot block is
// suppressed via window.__NO_BOOT__ so nothing here touches the DOM mocks
// beyond what generateBaseSchedule()/extendPlanThroughDec2026() need.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILES = ['blind75.js', 'git-roadmap.js', 'app.js', 'plan-extension-2026.js'];

function mockClassList() {
  return { contains: () => false, add() {}, remove() {}, toggle() {} };
}
function mockElement() {
  return {
    className: '',
    innerHTML: '',
    innerText: '',
    style: { setProperty() {} },
    classList: mockClassList(),
    appendChild() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

const sandbox = {};
sandbox.window = sandbox;
sandbox.window.__NO_BOOT__ = true;
sandbox.console = console;
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;
sandbox.setInterval = setInterval;
sandbox.clearInterval = clearInterval;
sandbox.alert = () => {};
sandbox.confirm = () => true;
sandbox.prompt = () => null;
sandbox.localStorage = {
  store: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; }
};
sandbox.document = {
  body: { classList: mockClassList(), appendChild() {} },
  documentElement: { style: { setProperty() {} } },
  getElementById() { return null; },
  createElement() { return mockElement(); },
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; }
};

vm.createContext(sandbox);

function run(code, filename) {
  return vm.runInContext(code, sandbox, filename ? { filename } : undefined);
}

for (const file of FILES) {
  const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
  run(code, file);
}

// --- tiny assertion harness -------------------------------------------------
let passCount = 0;
let failCount = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passCount++;
    console.log(`  PASS: ${name}`);
  } else {
    failCount++;
    failures.push(name + (detail ? ` (${detail})` : ''));
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('=== SCHEDULER SYSTEM VERIFICATION SUITE ===');

// Test 1: Base schedule boundaries (June 13 - Sept 2, 2026)
console.log('\nTest 1: Verifying base schedule boundaries...');
run('generateBaseSchedule()');
const baseDays = run('appState.days');
check('Start date is 2026-06-13', baseDays[0].date === '2026-06-13', baseDays[0].date);
check('End date is 2026-09-02', baseDays[baseDays.length - 1].date === '2026-09-02', baseDays[baseDays.length - 1].date);
const baseDayCount = run('Math.floor((parseDate(BASE_SCHEDULE_END) - parseDate(START_DATE_STR)) / 86400000) + 1');
check(`Base plan has ${baseDayCount} days`, baseDays.length === baseDayCount, `got ${baseDays.length}`);

// Test 2: India Trip Cap (June 24 - July 8)
console.log('\nTest 2: Verifying India Trip (June 24 - July 8) constraints...');
let indiaDaysCount = 0;
let indiaTripPass = true;
for (const day of baseDays) {
  if (day.date >= '2026-06-24' && day.date <= '2026-07-08') {
    indiaDaysCount++;
    const totalHrs = day.tasks.reduce((sum, t) => sum + t.duration, 0);
    if (totalHrs > 3.0) {
      indiaTripPass = false;
      console.log(`  FAIL detail: Day ${day.date} has ${totalHrs} hours (exceeds 3h cap)`);
    }
  }
}
check('India days found: 15', indiaDaysCount === 15, `got ${indiaDaysCount}`);
check('India trip days respect the 3h cap', indiaTripPass);

// Test 3: No day exceeds its own max capacity
console.log('\nTest 3: Checking no day exceeds its max capacity in the base schedule...');
let maxHourPass = true;
for (const day of baseDays) {
  const totalHrs = day.tasks.reduce((sum, t) => sum + t.duration, 0);
  if (totalHrs > day.maxCapacity) {
    maxHourPass = false;
    console.log(`  FAIL detail: Day ${day.date} has ${totalHrs} hrs (exceeds capacity ${day.maxCapacity} hrs)`);
  }
}
check('Baseline capacity respected on every day', maxHourPass);

// Test 4: extendPlanThroughDec2026()
console.log('\nTest 4: Verifying extendPlanThroughDec2026()...');
const extended = run('extendPlanThroughDec2026()');
check('extendPlanThroughDec2026() reports success', extended === true, String(extended));
const extDays = run('appState.days');
check('Last day is 2026-12-31', extDays[extDays.length - 1].date === '2026-12-31', extDays[extDays.length - 1].date);
const dates = extDays.map(d => d.date);
const sortedDates = [...dates].sort();
check('Days are sorted chronologically', JSON.stringify(dates) === JSON.stringify(sortedDates));
check('No duplicate dates', new Set(dates).size === dates.length, `${dates.length} days, ${new Set(dates).size} unique`);

// Test 5: Cross-cutting invariants over the full extended plan
console.log('\nTest 5: Verifying cross-cutting task invariants...');
const allTasks = extDays.flatMap(d => d.tasks);
const taskIds = allTasks.map(t => t.id);
check('No two tasks share an id', new Set(taskIds).size === taskIds.length, `${taskIds.length} tasks, ${new Set(taskIds).size} unique ids`);
const badDurations = allTasks.filter(t => typeof t.duration !== 'number' || !(t.duration > 0));
check('Every task has a numeric duration > 0', badDurations.length === 0, `${badDurations.length} offending tasks`);

// Test 6: Microsoft OA prep week (Aug 11-17, 2026)
console.log('\nTest 6: Verifying Microsoft OA prep tasks exist for Aug 11-17, 2026...');
const oaDates = ['2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17'];
for (const dateStr of oaDates) {
  const day = extDays.find(d => d.date === dateStr);
  const hasOaTask = !!day && day.tasks.some(t => t.microsoftOA);
  check(`Microsoft OA task present on ${dateStr}`, hasOaTask);
}

// reflowRemainingCurriculum() ends with initUI(), which needs a real DOM.
// Stub it out: this suite checks data, not rendering.
run('initUI = function () {};');

const BASE_END = '2026-09-02';
const ROUTINE_CATS = new Set(['mentor', 'winfo', 'palana_security', 'leetcode']);
const strayBaseRoutines = (days) => days
  .filter(d => d.date > BASE_END)
  .flatMap(d => d.tasks.filter(t => t.source === 'base' && ROUTINE_CATS.has(t.category)).map(t => `${d.date}:${t.id}`));

// Test 7: reflow must not touch extension or user tasks, nor add summer
// routines after the base window.
console.log('\nTest 7: reflowRemainingCurriculum() preserves extension + user tasks...');
run('generateBaseSchedule(); appState.settings.planExtensionFallV1 = 0; extendPlanThroughDec2026(); inferTaskSources();');
let days7 = run('appState.days');
const find = (date) => days7.find(d => d.date === date);
find('2026-08-20').tasks.push({ id: '2026-08-20_custom_1', category: 'custom', title: 'Summer custom', duration: 1, completed: false, source: 'user' });
find('2026-10-05').tasks.push({ id: '2026-10-05_custom_2', category: 'ahf', title: 'Fall custom (routine category)', duration: 1, completed: false, source: 'user' });
find('2026-11-02').tasks.push({ id: 'cb_1', category: 'jobapps', title: 'Chatbot task', duration: 1, completed: false, createdByChatbot: true, source: 'user' });
// Tick a few tasks across both windows.
['2026-07-01', '2026-08-25', '2026-09-20', '2026-10-14'].forEach(ds => { const t = find(ds).tasks[0]; if (t) t.completed = true; });
const extIdsBefore = days7.flatMap(d => d.tasks.filter(t => t.source === 'extension').map(t => t.id));
const tickedBefore = days7.flatMap(d => d.tasks.filter(t => t.completed).map(t => t.id));
check('Extension tasks exist before reflow', extIdsBefore.length > 0, `${extIdsBefore.length}`);

run('appState.settings.palanaEnabled = false; reflowRemainingCurriculum(); appState.settings.palanaEnabled = true; reflowRemainingCurriculum();');
days7 = run('appState.days');
const idsAfter = new Set(days7.flatMap(d => d.tasks.map(t => t.id)));
const missingExt = extIdsBefore.filter(id => !idsAfter.has(id));
check('All extension task ids still present after reflow', missingExt.length === 0, `${missingExt.length} missing, e.g. ${missingExt.slice(0, 3).join(', ')}`);
check('Custom/user tasks still present after reflow', ['2026-08-20_custom_1', '2026-10-05_custom_2', 'cb_1'].every(id => idsAfter.has(id)));
check('Completed tasks survive reflow', tickedBefore.every(id => idsAfter.has(id)));
const stray7 = strayBaseRoutines(days7);
check('No mentor/WINFO/palana_security/Blind 75 base tasks after 2026-09-02', stray7.length === 0, `${stray7.length}, e.g. ${stray7.slice(0, 3).join(', ')}`);
const dates7 = days7.map(d => d.date);
check('Still no duplicate dates after reflow', new Set(dates7).size === dates7.length);

// Test 8: repair path for states already damaged by the old reflow.
console.log('\nTest 8: repairReflowDamage() restores a damaged state...');
days7 = run('appState.days');
const oct6 = find('2026-10-06');
const removedExt = oct6.tasks.filter(t => t.source === 'extension' && !t.completed).map(t => t.id);
oct6.tasks = oct6.tasks.filter(t => t.source !== 'extension');
oct6.tasks.push({ id: '2026-10-06_mentor_1', category: 'mentor', title: 'Mentor meeting', duration: 1, completed: false });
oct6.tasks.push({ id: '2026-10-06_leetcode_2', category: 'leetcode', title: 'LeetCode Blind 75: #1 - Two Sum', duration: 0.5, completed: false });
oct6.tasks.push({ id: '2026-10-06_winfo_done', category: 'winfo', title: 'WINFO', duration: 1, completed: true });
run('appState.settings.reflowRepairV1Done = false; repairReflowDamage();');
days7 = run('appState.days');
const oct6After = days7.find(d => d.date === '2026-10-06');
const oct6Ids = new Set(oct6After.tasks.map(t => t.id));
check('Missing extension tasks re-inserted', removedExt.length > 0 && removedExt.every(id => oct6Ids.has(id)), `${removedExt.length} removed`);
check('Stray unfinished base routines removed', !oct6Ids.has('2026-10-06_mentor_1') && !oct6Ids.has('2026-10-06_leetcode_2'));
check('Completed stray task kept', oct6Ids.has('2026-10-06_winfo_done'));
const allIds8 = days7.flatMap(d => d.tasks.map(t => t.id));
check('No duplicate task ids after repair', new Set(allIds8).size === allIds8.length);

// Test 9: Blind 75 list shape and the seq <-> LeetCode number mapping
console.log('\nTest 9: Blind 75 list and mapping...');
const B75 = run('BLIND_75_QUESTIONS');
const seqs = B75.map(q => q.seq);
check('Blind 75 has 75 entries', B75.length === 75, `${B75.length}`);
check('Seqs are exactly 1..75 in list order', seqs.every((s, i) => s === i + 1));
check('75 distinct LeetCode numbers', new Set(B75.map(q => q.lc)).size === 75);
check('75 distinct slugs, link matches slug', new Set(B75.map(q => q.slug)).size === 75 && B75.every(q => q.link === `https://leetcode.com/problems/${q.slug}/`));
check('Every entry has Easy/Medium/Hard difficulty', B75.every(q => ['Easy', 'Medium', 'Hard'].includes(q.difficulty)));
check('Contains Duplicate is LeetCode #217', run('BLIND_75_BY_LC[217].name') === 'Contains Duplicate');
check('No duplicate 3Sum; removed extras absent', B75.filter(q => q.lc === 15).length === 1 && [142, 337, 215, 377].every(n => !B75.some(q => q.lc === n)));
check('Canonical additions present', [5, 647, 208, 211, 212].every(n => B75.some(q => q.lc === n)));
const seqOfLc3 = run('BLIND_75_BY_LC[3].seq');
check('OA task for LC #3 maps to Longest Substring, not seq 3',
  run('blind75SeqOf({ category: "leetcode", microsoftOA: true, leetcodeNumber: 3 })') === seqOfLc3 && seqOfLc3 !== 3);
check('OA task not in Blind 75 does not count', run('blind75SeqOf({ category: "leetcode", microsoftOA: true, leetcodeNumber: 994 })') === null);

// Test 10: the full plan uses the new fields and schedules distinct problems
console.log('\nTest 10: Scheduled LeetCode tasks...');
run('generateBaseSchedule(); appState.settings.planExtensionFallV1 = 0; appState.settings.lastRolloverDay = null; extendPlanThroughDec2026(); inferTaskSources();');
const lcTasks = run('appState.days').flatMap(d => d.tasks.filter(t => t.category === 'leetcode').map(t => ({ ...t, date: d.date })));
check('No task still uses leetcodeId', lcTasks.every(t => !('leetcodeId' in t)));
check('Blind 75 tasks have real LC number matching their seq',
  lcTasks.filter(t => t.blind75Seq).every(t => B75[t.blind75Seq - 1].lc === t.leetcodeNumber));
check('Titles read "LeetCode #<real> - <name>"',
  lcTasks.filter(t => t.blind75Seq && !t.rolledFrom).every(t => t.title === `LeetCode #${t.leetcodeNumber} - ${B75[t.blind75Seq - 1].name}`));
const planned = lcTasks.filter(t => t.blind75Seq && !t.backfilled);
const firstPass = planned.slice(0, 75).map(t => t.blind75Seq);
check('First 75 scheduled Blind 75 tasks cover 75 distinct seqs', new Set(firstPass).size === 75, `${new Set(firstPass).size} distinct`);
const lastBase = planned.filter(t => t.date <= BASE_END).pop();
const firstExt = planned.find(t => t.source === 'extension');
check('Plan extension continues after the summer sequence', !!lastBase && !!firstExt && firstExt.blind75Seq === lastBase.blind75Seq + 1,
  `summer ends at seq ${lastBase && lastBase.blind75Seq}, extension starts at ${firstExt && firstExt.blind75Seq}`);

const summerSeqs = () => run('appState.days').filter(d => d.date <= BASE_END)
  .flatMap(d => d.tasks.filter(t => t.category === 'leetcode' && t.blind75Seq && !t.backfilled).map(t => t.blind75Seq));
const summerBefore = summerSeqs();
run('reflowRemainingCurriculum();');
const summerAfter = summerSeqs();
check('Reflow keeps the summer Blind 75 sequence (same count, all distinct)',
  summerAfter.length === summerBefore.length && new Set(summerAfter).size === summerAfter.length,
  `before ${summerBefore.length}, after ${summerAfter.length} (${new Set(summerAfter).size} distinct)`);

// Test 11: migration of old leetcodeId values
console.log('\nTest 11: leetcodeId migration...');
run(`appState.days.push({ date: '2027-01-05', isIndia: false, maxCapacity: 8, rolledOver: false, tasks: [
  { id: 'm1', category: 'leetcode', title: 'LeetCode Blind 75: #3 - Contains Duplicate', duration: 0.5, completed: true, leetcodeId: 3 },
  { id: 'm2', category: 'leetcode', title: 'Microsoft OA Prep: LC #3 - Longest Substring Without Repeating Characters', duration: 0.75, completed: true, leetcodeId: 3, microsoftOA: true },
  { id: 'm3', category: 'leetcode', title: 'LeetCode Blind 75: #25 - Linked List Cycle II', duration: 0.5, completed: false, leetcodeId: 25 },
  { id: 'm4', category: 'leetcode', title: 'LeetCode Blind 75: #12 - 3Sum (Rolled Over)', duration: 0.5, completed: false, rolledFrom: '2026-08-01' }
]});
appState.settings.leetcodeNumbersV1Done = false;
migrateLeetcodeNumbers(); migrateLeetcodeNumbers();`);
const mig = Object.fromEntries(run("appState.days.find(d => d.date === '2027-01-05').tasks").map(t => [t.id, t]));
check('Old Blind 75 id 3 -> LC 217, seq of Contains Duplicate, completion kept',
  mig.m1.leetcodeNumber === 217 && mig.m1.blind75Seq === run('BLIND_75_BY_LC[217].seq') && mig.m1.completed === true && mig.m1.title === 'LeetCode #217 - Contains Duplicate');
check('OA id 3 kept as LC 3, no blind75Seq', mig.m2.leetcodeNumber === 3 && mig.m2.blind75Seq === undefined && mig.m2.completed === true);
check('Removed problem (old 25) -> LC 142, no blind75Seq', mig.m3.leetcodeNumber === 142 && mig.m3.blind75Seq === undefined);
check('Rolled-over copy migrated from its title', mig.m4.leetcodeNumber === 15 && mig.m4.blind75Seq === run('BLIND_75_BY_LC[15].seq') && mig.m4.title === 'LeetCode #15 - 3Sum (Rolled Over)');
check('leetcodeId removed after migration', Object.values(mig).every(t => !('leetcodeId' in t)));
check('Blind 75 solved count uses distinct seqs (OA LC 3 counts as Longest Substring)',
  run(`countBlind75Solved([{ tasks: [
    { category: 'leetcode', completed: true, blind75Seq: 1 },
    { category: 'leetcode', completed: true, blind75Seq: 1 },
    { category: 'leetcode', completed: true, microsoftOA: true, leetcodeNumber: 3 },
    { category: 'leetcode', completed: true, microsoftOA: true, leetcodeNumber: 994 }
  ]}])`) === 2);

// Test 12: rollover, stable ids, exams
console.log('\nTest 12: Rollover / stable ids / exams...');
run(`
  var __saved = { days: appState.days, settings: appState.settings, taskNotes: appState.taskNotes, ledger: appState.rescheduleLedger };
  initUI = function () {}; showDayDetails = function () {}; playSynthSound = function () {};
  applyCategoryColors = function () {}; saveState = function () {};
  var __today = '2026-10-05';
  getRealCurrentDate = function () { return __today; };
  function __fixture(rollDate) {
    rollDate = rollDate || '2026-10-03';
    const day = (date, tasks) => ({ date, isIndia: false, maxCapacity: 8, rolledOver: false, tasks });
    appState.settings = Object.assign({}, __saved.settings, { lastRolloverDay: null });
    appState.rescheduleLedger = {};
    appState.taskNotes = {};
    const all = ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'];
    const rolled = [
        { id: 'exam1', category: 'awscp', title: 'Cert exam', duration: 2.5, completed: false, fixed: true, exam: true, milestone: true },
        { id: 'meet1', category: 'mentor', title: 'Mentor meeting', duration: 1, completed: false, fixed: true },
        { id: 'sec21', category: 'secplus', title: 'Sec+ Day 21', duration: 2, completed: false, planDay: 21, source: 'base' },
        { id: 'proj1', category: 'projects', title: 'Build parser', duration: 1, completed: false, projectId: 'p1', source: 'extension',
          subtasks: [{ title: 'a', completed: true }, { title: 'b', completed: false }] },
        { id: 'done1', category: 'custom', title: 'Done already', duration: 1, completed: true }
      ];
    appState.days = all.map(d => day(d, d === rollDate ? rolled : []));
  }
  __fixture();
`);
const dayOf = (date) => run(`appState.days.find(d => d.date === '${date}')`);
const findTask = (id) => { for (const d of run('appState.days')) { const t = d.tasks.find(x => x.id === id); if (t) return { t, date: d.date }; } return null; };

let summary = run(`forceRollover('2026-10-03')`);
check('Fixed tasks stay put: exam', findTask('exam1').date === '2026-10-03' && !findTask('exam1').t.rolledFrom);
check('Fixed tasks stay put: meeting', findTask('meet1').date === '2026-10-03');
check('Rollover summary lists fixed tasks as left in place',
  summary.leftInPlace.map(t => t.id).sort().join() === 'exam1,meet1' && /2 fixed left in place/.test(run('describeRollover')(summary)));
check('Past day rolls non-distributed tasks onto today', findTask('proj1').date === '2026-10-05');
const proj = findTask('proj1').t;
check('Rolled task keeps id, projectId, subtasks, source',
  proj.id === 'proj1' && proj.projectId === 'p1' && proj.subtasks.length === 2 && proj.subtasks[0].completed === true && proj.source === 'extension');
check('Rolled task marked by rolledFrom, title unchanged', proj.rolledFrom === '2026-10-03' && proj.title === 'Build parser');
const sec = findTask('sec21');
check('planDay survives a rollover', sec && sec.t.planDay === 21 && sec.date > '2026-10-05', sec && `${sec.date} planDay ${sec.t.planDay}`);
check('Completed task untouched by rollover', findTask('done1').date === '2026-10-03');

// planDay survives: the Sec+ daily plan does not re-issue a rolled plan day.
const secCountBefore = run(`appState.days.flatMap(d => d.tasks).filter(t => t.category === 'secplus' && t.planDay === 21).length`);
run(`applySecplusDailyPlan(appState.days)`);
const secCountAfter = run(`appState.days.flatMap(d => d.tasks).filter(t => t.category === 'secplus' && t.planDay === 21).length`);
check('applySecplusDailyPlan does not duplicate a rolled plan day', secCountBefore === 1 && secCountAfter === 1, `${secCountBefore} -> ${secCountAfter}`);

// Rolling a future day targets the next day, not today.
run(`__fixture('2026-10-07');`);
summary = run(`forceRollover('2026-10-07')`);
check('Future day: target is the day after it', summary.target === '2026-10-08');
check('Future day: non-distributed task lands on the next day', findTask('proj1').date === '2026-10-08');
check('Future day: distributed task lands after the target', findTask('sec21').date > '2026-10-08');
check('Future day: nothing piled onto today', dayOf('2026-10-05').tasks.length === 0);
check('Future day: fixed tasks stay on the rolled day', findTask('exam1').date === '2026-10-07');

// Drag-drop keeps id and notes.
run(`__fixture(); saveTaskNote('proj1', { text: 'my note' });`);
const moved = run(`moveTaskToDate(appState.days[0].tasks.find(t => t.id === 'proj1'), '2026-10-03', '2026-10-09')`);
check('Drag-drop moves the task', moved === true && findTask('proj1').date === '2026-10-09');
check('Drag-drop keeps the id', findTask('proj1').t.id === 'proj1');
check('Drag-drop keeps the notes', run(`getTaskNotes('proj1').text`) === 'my note' && run(`taskHasNotes('proj1')`) === true);

// Migration: suffix → rolledFrom, exam flags, retired Sept 1 exam, Sept 1-2 gap.
run(`
  __today = '2026-09-27';
  appState.settings.rolloverExamsV1Done = false;
  appState.days = [
    { date: '2026-09-01', isIndia: false, maxCapacity: 8, tasks: [
      { id: '2026-09-01_sec_exam', category: 'secplus', title: 'CompTIA Security+ SY0-701 Certification Exam', duration: 2.5, completed: false, fixed: true, source: 'base' },
      { id: 'g1', category: 'leetcode', title: 'LC', duration: 0.5, completed: false, source: 'base' } ] },
    { date: '2026-09-02', isIndia: false, maxCapacity: 8, tasks: [
      { id: 'g2', category: 'ahf', title: 'AHF (Rolled Over)', duration: 1, completed: false, originalDate: '2026-08-30', source: 'base' } ] },
    { date: '2026-09-18', isIndia: false, maxCapacity: 8, tasks: [
      { id: '2026-09-18_x_secplus_exam', category: 'secplus', title: 'CompTIA Security+ SY0-701 Certification Exam', duration: 2.5, completed: false, fixed: true, source: 'extension' },
      { id: 'q1', category: 'custom', title: 'Certification Exam study group', duration: 1, completed: true } ] }
  ];
  migrateRolloverAndExamsV1();
`);
check('Uncompleted Sept 1 base exam removed', !findTask('2026-09-01_sec_exam'));
check('Sept 18 exam flagged exam:true', findTask('2026-09-18_x_secplus_exam').t.exam === true);
check('Non-cert task with "Certification Exam" in title is not an exam', !findTask('q1').t.exam);
check('Legacy suffix stripped, rolledFrom set', findTask('g2').t.title === 'AHF' && findTask('g2').t.rolledFrom === '2026-08-30');
check('Past Sept 1-2 tasks marked complete', findTask('g1').t.completed === true && findTask('g2').t.completed === true);
check('Existing ids untouched by migration', ['g1', 'g2', 'q1'].every(id => !!findTask(id)));

run(`appState.settings.rolloverExamsV1Done = false;
  appState.days[0].tasks.push({ id: '2026-09-01_sec_exam', category: 'secplus', title: 'CompTIA Security+ SY0-701 Certification Exam', duration: 2.5, completed: true, source: 'base' });
  migrateRolloverAndExamsV1();`);
check('Completed Sept 1 exam is kept', !!findTask('2026-09-01_sec_exam'));

run(`appState.days = __saved.days; appState.settings = __saved.settings; appState.taskNotes = __saved.taskNotes; appState.rescheduleLedger = __saved.ledger;`);

// Test 13: capacity, history gating, settings, reset, git roadmap
console.log('\nTest 13: Capacity / history / settings / reset / git roadmap...');
run(`
  var __s13 = { state: appState, grcd: getRealCurrentDate, initUI: initUI, save: saveState };
  getRealCurrentDate = function () { return '2026-09-27'; };
  initUI = function () {}; saveState = function () {};
  function __ownerState() {
    appState = { settings: Object.assign(defaultSettings(), { lastRolloverDay: null }), days: [], categories: {}, extracurriculars: [], rescheduleLedger: {} };
    delete appState.settings.origin;           // the owner's state predates origin
    generateBaseSchedule(); runStatePipeline();
  }
  function __freshState() {
    appState = { settings: {}, days: [], categories: {}, extracurriculars: [], rescheduleLedger: {} };
    generateNewState(); runStatePipeline();
  }
`);
run('__ownerState()');
const TODAY13 = '2026-09-27';
const heavy = run('HEAVY_DAYS');
const futureOver = run(`reportOverCapacity({ from: '2026-09-28' })`);
const badDays = futureOver.filter(r => r.over > 1 && !heavy[r.date]);
check('No future day exceeds capacity by more than 1 h, except HEAVY_DAYS', badDays.length === 0,
  badDays.map(r => `${r.date} ${r.hours}/${r.capacity}`).join(', '));
check('reportOverCapacity covers the whole plan (past days included)', run('reportOverCapacity()').some(r => r.date <= TODAY13));

const allExt = run(`appState.days.flatMap(d => d.tasks.map(t => Object.assign({ __date: d.date }, t)))`).filter(t => /_x_/.test(t.id));
const onOwnDate = (t) => t.id.slice(0, 10) === t.__date;
check('Exams, hackathon days and milestones never moved', allExt.filter(t => t.exam || t.milestone || /_x_hack_/.test(t.id)).every(onOwnDate));
check('Only flexible tasks were rebalanced', allExt.filter(t => t.rebalancedFrom).every(t => !t.fixed && !t.completed));
check('Nothing moved onto today or earlier', allExt.filter(t => t.rebalancedFrom).every(t => t.__date > TODAY13 && t.rebalancedFrom > TODAY13));
const deadlineOk = allExt.filter(t => t.rebalancedFrom).every(t => {
  if (/_x_awscp(_review_\d)?$/.test(t.id)) return t.__date < '2026-09-30';
  if (/_x_github$/.test(t.id)) return t.__date <= '2026-10-04';
  if (/_x_hackprep_dubhacks_/.test(t.id)) return t.__date < '2026-10-11';
  return true;
});
check('Rebalanced tasks stay before their deadlines', deadlineOk);
check('Rebalance moved something', allExt.some(t => t.rebalancedFrom));
check('Commitments are fixed, work blocks are not',
  allExt.find(t => /_x_awscp_exam$/.test(t.id)).fixed === true && allExt.find(t => /_x_jobapps$/.test(t.id)).fixed === false);

const movedBefore = run(`appState.days.flatMap(d => d.tasks).filter(t => t.rebalancedFrom).length`);
run('undoCapacityRebalance()');
check('undoCapacityRebalance puts every moved task back', movedBefore > 0 &&
  run(`appState.days.every(d => d.tasks.every(t => !/_x_/.test(t.id) || t.id.slice(0, 10) === d.date))`));
run(`appState.days.flatMap(d => d.tasks).forEach(t => { t.fixed = true; t.wasFixed = true; }); revertExtensionFlex();`);

console.log('\n  -- history gating');
check('Owner state: August is marked complete', run(`appState.days.filter(d => d.date >= '2026-08-01' && d.date <= '2026-08-31').every(d => d.tasks.every(t => t.completed))`));
run('__freshState()');
check('Fresh state is tagged origin=fresh', run('appState.settings.origin') === 'fresh');
check('Fresh state: no August task pre-completed', run(`appState.days.filter(d => d.date.startsWith('2026-08')).every(d => d.tasks.every(t => !t.completed || t.category === 'portswigger'))`));
check('Fresh state: no June/July task pre-completed', run(`appState.days.filter(d => d.date >= '2026-06-13' && d.date <= '2026-07-31').every(d => d.tasks.every(t => !t.completed || t.category === 'portswigger'))`));
check('Fresh state: Sept 1-15 not pre-completed', run(`appState.days.filter(d => d.date >= '2026-09-01' && d.date <= '2026-09-15').every(d => d.tasks.every(t => !t.completed || t.category === 'portswigger'))`));

console.log('\n  -- settings');
run(`appState.settings.palanaSecurityEnabled = false; generateBaseSchedule();`);
check('palanaSecurityEnabled=false removes the Palana Security cycle', run(`appState.days.flatMap(d => d.tasks).filter(t => t.category === 'palana_security').length`) === 0);
run(`appState.settings.palanaSecurityEnabled = true; generateBaseSchedule();`);
check('palanaSecurityEnabled=true keeps the cycle', run(`appState.days.flatMap(d => d.tasks).filter(t => t.category === 'palana_security').length`) > 0);
run(`appState.settings.ahfWeeklyTarget = 14; generateBaseSchedule();`);
check('ahfWeeklyTarget 14 → default base AHF 2 h/day', run(`appState.days.find(d => d.date === '2026-08-20').tasks.find(t => t.id === '2026-08-20_ahf').duration`) === 2);
run('__freshState(); appState.settings.ahfWeeklyTarget = 10.5; resizeFutureAhfTasks();');
check('Changing the AHF target resizes future unchecked daily AHF only',
  run(`appState.days.filter(d => d.date > '2026-09-27').flatMap(d => d.tasks).filter(t => /_x_ahf$/.test(t.id)).every(t => t.duration === 1.5)`) &&
  run(`appState.days.filter(d => d.date <= '2026-09-27').flatMap(d => d.tasks).filter(t => /_x_ahf$/.test(t.id)).every(t => t.duration === 1)`));

console.log('\n  -- reset');
run(`__ownerState();
  appState.categories = { mine: { name: 'Mine' } }; appState.taskNotes = { a: { text: 'x' } };
  appState.extracurriculars = [{ id: 1 }]; appState.rescheduleLedger = { a: {} }; appState.archivedTasks = [{ id: 'z' }];
  appState.settings.someOneTimeV9Done = true; appState.settings.openProjectCards = { a: true };
  appState.chatbotUndoLog = [{}]; appState.meta = { updatedAt: 5, deviceId: 'd' }; appState.deletedTaskIds = { q: 1 };
  TRACK_4_PROJECTS.push({ id: 'bot_x', createdByChatbot: true, tasks: [] });
  resetPlannerState();`);
const st = run('appState');
check('Reset clears categories, notes, extracurriculars, ledger, archive, chatbot data',
  Object.keys(st.categories).length === 0 && Object.keys(st.taskNotes).length === 0 && st.extracurriculars.length === 0 &&
  Object.keys(st.rescheduleLedger).length === 0 && st.archivedTasks.length === 0 && !st.chatbotUndoLog);
check('Reset clears one-time flags and UI settings', !('someOneTimeV9Done' in st.settings) && !('openProjectCards' in st.settings));
check('Reset state is fresh and rebuilt through the pipeline', st.settings.origin === 'fresh' && st.settings.planExtensionFallV1 === 1 && st.days.some(d => d.date === '2026-12-31'));
check('Reset keeps sync bookkeeping', st.meta && st.meta.deviceId === 'd' && st.deletedTaskIds.q === 1);
check('Reset removes chatbot-created projects', !run(`TRACK_4_PROJECTS.some(p => p.id === 'bot_x')`));
check('Reset leaves nothing pre-completed except retired PortSwigger', st.days.every(d => d.tasks.every(t => !t.completed || t.category === 'portswigger')));

console.log('\n  -- git roadmap');
check('Git roadmap table is consistent', run('validateGitRoadmap().length') === 0, run('validateGitRoadmap().join("; ")'));
let gitThrew = null, gitBadWeek = false;
try {
  run(`(function(){ const out = []; for (let d = new Date(2026, 5, 1); d <= new Date(2026, 8, 30); d.setDate(d.getDate() + 1)) {
    const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    buildGitProjectTasksForDay(ds, d.getDay(), isIndiaTrip(ds)).forEach(t => { const w = getGitWeekForDate(ds); if (!w || t.projectWeek !== w.week) out.push(ds); });
  } return out; })()`).length && (gitBadWeek = true);
} catch (e) { gitThrew = e; }
check('Git generator never throws and tags every task with its own week', !gitThrew && !gitBadWeek, gitThrew && gitThrew.message);
check('No git tasks in the Jul 6-26 gap', run(`['2026-07-06','2026-07-15','2026-07-26'].every(ds => buildGitProjectTasksForDay(ds, getDayOfWeek(ds), false).length === 0)`));
check('Invalid table is reported', run(`validateGitRoadmap([{ week: 1, start: '2026-06-16', end: '2026-06-18', tasks: [] }]).length`) >= 3);

run(`appState = __s13.state; getRealCurrentDate = __s13.grcd; initUI = __s13.initUI; saveState = __s13.save;`);

// Test 14: cleanup-pass logic fixes
console.log('\nTest 14: markTaskPartial / moveTaskToTomorrow / deleteCategory / getDaysBetween...');
run(`
  var __s14 = { state: appState, alert: alert, saveState: saveState, rc: renderCategoryList, pc: populateCategorySelects, rdm: renderDashboardMetrics, rcd: renderCalendarDays, sdd: showDayDetails };
  var __alerts = [];
  alert = function (m) { __alerts.push(m); };
  saveState = function () {}; renderCategoryList = function () {}; populateCategorySelects = function () {};
  renderDashboardMetrics = function () {}; renderCalendarDays = function () {}; showDayDetails = function () {};
  appState = { settings: {}, days: [
    { date: '2026-10-05', maxCapacity: 8, tasks: [
      { id: 'p1', category: 'custom', title: 'Partial me', duration: 2, completed: false },
      { id: 'fx', category: 'custom', title: 'Fixed', duration: 1, completed: false, fixed: true },
      { id: 'mv', category: 'custom', title: 'Movable', duration: 1, completed: false },
      { id: 'cx', category: 'mycat', title: 'In custom cat', duration: 1, completed: false } ] },
    { date: '2026-10-06', maxCapacity: 2, tasks: [ { id: 'full', category: 'custom', title: 'Fills the day', duration: 2, completed: false } ] },
    { date: '2026-10-07', maxCapacity: 8, tasks: [] }
  ], categories: { mycat: { id: 'mycat', name: 'Mine', color: '#123456', icon: 'X' } },
     categoryOverrides: { mycat: { color: '#abcdef' }, other: { color: '#000000' } },
     extracurriculars: [ { id: 'e1', name: 'A', categoryId: 'mycat' }, { id: 'e2', name: 'B', categoryId: 'ahf' } ] };
`);
const day0 = () => run(`appState.days[0]`);
const t = (id) => day0().tasks.find(x => x.id === id);
let r14 = run(`markTaskPartial(appState.days[0].tasks[0], appState.days[0], NaN)`);
check('markTaskPartial(NaN) does nothing and alerts', r14 === false && run('__alerts.length') === 1 && t('p1').completedMinutes === undefined && t('p1').status === undefined);
r14 = run(`markTaskPartial(appState.days[0].tasks[0], appState.days[0], parseFloat('abc'))`);
check('markTaskPartial(parseFloat of junk) is rejected too', r14 === false && t('p1').status === undefined);
r14 = run(`markTaskPartial(appState.days[0].tasks[0], appState.days[0], 0.5)`);
check('markTaskPartial with real hours records them', r14 === true && t('p1').completedMinutes === 30 && t('p1').status === 'partial');
run('__alerts.length = 0');
check('moveTaskToTomorrow on a fixed task returns false', run(`moveTaskToTomorrow(appState.days[0].tasks[1], appState.days[0])`) === false && run('__alerts.length') === 1);
check('moveTaskToTomorrow into a full day returns false and moves nothing',
  run(`moveTaskToTomorrow(appState.days[0].tasks[2], appState.days[0])`) === false && !!t('mv') && run('__alerts.length') === 2);
run(`appState.days[1].maxCapacity = 8`);
check('moveTaskToTomorrow with room returns true', run(`moveTaskToTomorrow(appState.days[0].tasks[2], appState.days[0])`) === true && !t('mv'));

run(`deleteCategory('mycat')`);
check('deleteCategory moves tasks to custom', t('cx').category === 'custom');
check('deleteCategory remaps extracurriculars that used it', run(`appState.extracurriculars[0].categoryId`) === 'custom' && run(`appState.extracurriculars[1].categoryId`) === 'ahf');
check('deleteCategory drops its categoryOverrides entry only', run(`'mycat' in appState.categoryOverrides`) === false && run(`'other' in appState.categoryOverrides`) === true);

check('getDaysBetween: adjacent days = 1, a week = 7', run(`getDaysBetween('2026-10-05','2026-10-06')`) === 1 && run(`getDaysBetween('2026-10-05','2026-10-12')`) === 7);
// Nov 1 2026 is a "fall back" day in DST time zones (25-hour day): ceil counted it as 2.
const fallBackHours = run(`(parseDate('2026-11-02') - parseDate('2026-11-01')) / 3600000`);
check('getDaysBetween does not add a day across the DST change (local zone ' + fallBackHours + 'h)',
  run(`getDaysBetween('2026-11-01','2026-11-02')`) === 1 && run(`getDaysBetween('2026-10-31','2026-11-03')`) === 3);

run(`appState = __s14.state; alert = __s14.alert; saveState = __s14.saveState; renderCategoryList = __s14.rc; populateCategorySelects = __s14.pc; renderDashboardMetrics = __s14.rdm; renderCalendarDays = __s14.rcd; showDayDetails = __s14.sdd;`);

console.log('\n=== VERIFICATION COMPLETE ===');
console.log(`\n${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f}`));
}

process.exit(failCount > 0 ? 1 : 0);
