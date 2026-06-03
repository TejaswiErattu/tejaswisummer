// Node.js test script to verify scheduling rules and rollover logic offline
const fs = require('fs');
const path = require('path');

// Mock window and localStorage for App.js loading
global.window = {};
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; }
};
global.document = {
  addEventListener() {},
  createElement(tag) {
    return {
      className: "",
      innerHTML: "",
      innerText: "",
      classList: {
        add() {},
        remove() {}
      },
      appendChild() {},
      addEventListener() {},
      querySelector(selector) {
        return {
          addEventListener() {},
          appendChild() {},
          checked: false
        };
      }
    };
  },
  getElementById(id) {
    return {
      innerText: "",
      className: "",
      style: { width: "0%" },
      classList: {
        add() {},
        remove() {}
      },
      appendChild() {},
      querySelector() {
        return { addEventListener() {} };
      },
      querySelectorAll() {
        return [];
      }
    };
  },
  querySelectorAll() {
    return [];
  }
};

// Load blind75.js and app.js contents and evaluate them
const blind75Code = fs.readFileSync(path.join(__dirname, 'blind75.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Evaluate the codes in global scope
eval(blind75Code.replace("const BLIND_75_QUESTIONS =", "global.BLIND_75_QUESTIONS ="));
// Wrap appCode evaluation to prevent window/DOM queries from breaking execution
// Remove event listeners at the bottom of app.js for Node runtime compatibility
const cleanAppCode = appCode
  .replace("let appState =", "global.appState =")
  .replace("function generateBaseSchedule", "global.generateBaseSchedule = function")
  .replace("function forceRollover", "global.forceRollover = function")
  .replace("function reflowRemainingCurriculum", "global.reflowRemainingCurriculum = function")
  .replace("function resetPlannerState", "global.resetPlannerState = function")
  .replace(/document\.addEventListener\("DOMContentLoaded"[\s\S]*\}\);/g, "");
eval(cleanAppCode);
const appState = global.appState;

console.log("=== SCHEDULER SYSTEM VERIFICATION SUITE ===");

// Test 1: Date boundaries
console.log(`\nTest 1: Verifying Plan boundaries...`);
generateBaseSchedule();
console.log(`- Start Date: ${appState.days[0].date} (Expected: 2025-06-13) - ${appState.days[0].date === '2025-06-13' ? 'PASS' : 'FAIL'}`);
console.log(`- End Date: ${appState.days[appState.days.length-1].date} (Expected: 2025-09-01) - ${appState.days[appState.days.length-1].date === '2025-09-01' ? 'PASS' : 'FAIL'}`);
console.log(`- Total Days: ${appState.days.length} (Expected: 81) - ${appState.days.length === 81 ? 'PASS' : 'FAIL'}`);

// Test 2: India Trip Cap
console.log(`\nTest 2: Verifying India Trip (June 24 - July 8) constraints...`);
let indiaTripPass = true;
let indiaDaysCount = 0;
appState.days.forEach(day => {
  if (day.date >= "2025-06-24" && day.date <= "2025-07-08") {
    indiaDaysCount++;
    const totalHrs = day.tasks.reduce((sum, t) => sum + t.duration, 0);
    // Should be max 2.5h (weekdays: AHF 1h + LC 0.5h + INFO310 1h = 2.5h)
    // or 1.5h (weekends: AHF 1h + LC 0.5h = 1.5h)
    if (totalHrs > 3.0) {
      indiaTripPass = false;
      console.log(`  FAIL: Day ${day.date} has ${totalHrs} hours (exceeds 3h cap)`);
    }
  }
});
console.log(`- India Days Found: ${indiaDaysCount} (Expected: 15) - ${indiaDaysCount === 15 ? 'PASS' : 'FAIL'}`);
console.log(`- Max 3-hour constraint verification: ${indiaTripPass ? 'PASS' : 'FAIL'}`);

// Test 3: Daily hour limit
console.log(`\nTest 3: Checking if any day exceeds the 8-hour max capacity limit in baseline...`);
let maxHourPass = true;
appState.days.forEach(day => {
  const totalHrs = day.tasks.reduce((sum, t) => sum + t.duration, 0);
  if (totalHrs > day.maxCapacity) {
    maxHourPass = false;
    console.log(`  FAIL: Day ${day.date} has ${totalHrs} hrs (exceeds capacity ${day.maxCapacity} hrs)`);
  }
});
console.log(`- Baseline limit verification: ${maxHourPass ? 'PASS' : 'FAIL'}`);

// Test 4: Palana Toggle
console.log(`\nTest 4: Verifying Palana Project ON/OFF toggle and reflow...`);
const monIndex = appState.days.findIndex(d => d.date === "2025-06-16"); // Weekday before India trip
const originalMonHours = appState.days[monIndex].tasks.reduce((sum, t) => sum + t.duration, 0);
const hasPalanaBefore = appState.days[monIndex].tasks.some(t => t.category === 'palana');

appState.settings.palanaEnabled = false;
reflowRemainingCurriculum();

const newMonHours = appState.days[monIndex].tasks.reduce((sum, t) => sum + t.duration, 0);
const hasPalanaAfter = appState.days[monIndex].tasks.some(t => t.category === 'palana');

console.log(`- Mon June 16 original hours: ${originalMonHours} hrs (Has Palana: ${hasPalanaBefore})`);
console.log(`- Mon June 16 updated hours: ${newMonHours} hrs (Has Palana: ${hasPalanaAfter})`);
console.log(`- Palana toggle verification: ${(!hasPalanaAfter && hasPalanaBefore) ? 'PASS' : 'FAIL'}`);

// Restore Palana for next test
appState.settings.palanaEnabled = true;
reflowRemainingCurriculum();

// Test 5: Rollover & Cascading
console.log(`\nTest 5: Simulating task rollovers and cascading limit (capping at 8 hours/day)...`);
// Let's reset plan first
resetPlannerState();

// Uncheck all tasks on Day 1 (June 13) and trigger forceRollover
const d1Date = "2025-06-13";
const d1 = appState.days[0];
d1.tasks.forEach(t => t.completed = false); // ensure all unchecked

console.log(`- Day 1 uncompleted tasks: ${d1.tasks.length}`);
const d2OriginalTaskCount = appState.days[1].tasks.length;

forceRollover(d1Date);

console.log(`- Force Rollover triggered for Day 1.`);
console.log(`- Day 1 current task count: ${appState.days[0].tasks.length} (Expected: 0 uncompleted)`);
console.log(`- Day 2 updated task count: ${appState.days[1].tasks.length} (Expected: higher than original ${d2OriginalTaskCount})`);

// Verify that day 2 total hours do not exceed max capacity
const d2TotalHours = appState.days[1].tasks.reduce((sum, t) => sum + t.duration, 0);
console.log(`- Day 2 total hours after rollover: ${d2TotalHours} hrs (Capacity: ${appState.days[1].maxCapacity} hrs)`);
console.log(`- Capacity respect check: ${d2TotalHours <= appState.days[1].maxCapacity ? 'PASS' : 'FAIL'}`);

// Test 6: At Risk Overflow Warning
console.log(`\nTest 6: Simulating massive rollovers to trigger 'Plan At Risk' warning...`);
// Uncheck all tasks for the first 45 days and roll them over iteratively to see if they overflow beyond Sept 1
for (let i = 0; i < 45; i++) {
  const day = appState.days[i];
  day.tasks.forEach(t => t.completed = false);
  forceRollover(day.date);
}

const overflowDays = appState.days.filter(d => d.isOverflow);
console.log(`- Overflow days created: ${overflowDays.length}`);
console.log(`- Overflow state alert verification: ${overflowDays.length > 0 ? 'PASS (Banner will render)' : 'FAIL'}`);

console.log(`\n=== VERIFICATION COMPLETE ===`);
