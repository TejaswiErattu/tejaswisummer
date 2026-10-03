// Demo mode isolation test (no browser, no network).
//
// Same vm-sandbox pattern as test-sync.js: the real demo-data.js + app.js +
// export.js + firebase-sync.js + js/auth-gate.js run against a mock DOM, a
// spying localStorage, a counting fake Firebase and a counting fetch. The
// assistant's API client is imported as an ES module for the fetch check.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const APP_FILES = ['blind75.js', 'git-roadmap.js', 'demo-data.js', 'app.js', 'plan-extension-2026.js', 'js/sync-core.js', 'export.js'];
const REAL_KEY = 'cyber_study_plan_state_2026';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// A real local save that demo mode must leave exactly as it is.
const REAL_LOCAL = JSON.stringify({
  settings: { scheduleVersion: 8, migratedRealDateV3: true },
  days: [{ date: '2026-10-01', isIndia: false, maxCapacity: 8, rolledOver: false,
    tasks: [{ id: 'real_1', category: 'secplus', title: 'REAL PRIVATE TASK', duration: 1, completed: true }] }],
  categories: {}, extracurriculars: [], rescheduleLedger: {}
});

// ── mock DOM ─────────────────────────────────────────────────────────────────
function mockElement(id) {
  const listeners = {};
  const classes = new Set();
  const children = {};
  const attrs = {};
  const el = {
    id: id || '', className: '', innerHTML: '', innerText: '', textContent: '', dataset: {}, hidden: false,
    disabled: false, value: '', style: { setProperty() {} },
    classList: {
      contains: (c) => classes.has(c), add: (c) => classes.add(c), remove: (c) => classes.delete(c),
      toggle: (c, on) => { const want = on === undefined ? !classes.has(c) : !!on; want ? classes.add(c) : classes.delete(c); return want; }
    },
    setAttribute(k, v) { attrs[k] = String(v); }, getAttribute: (k) => (k in attrs ? attrs[k] : null), removeAttribute(k) { delete attrs[k]; },
    appendChild() {}, remove() {}, removeEventListener() {},
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    click() { (listeners.click || []).forEach(fn => fn({ target: el, preventDefault() {}, stopPropagation() {} })); },
    querySelector(sel) { return children[sel] || (children[sel] = mockElement()); },
    querySelectorAll() { return []; }
  };
  return el;
}

// ── counting fake Firebase ───────────────────────────────────────────────────
function makeFirebase(env) {
  const FieldValue = { serverTimestamp: () => ({}), delete: () => ({}) };
  const ref = (p) => ({
    path: p,
    async get() { env.firestoreCalls.push(`get ${p}`); if (env.latency) await sleep(env.latency); return { exists: false, data: () => undefined }; },
    collection: (name) => ({ doc: (docId) => ref(`${p}/${name}/${docId}`) })
  });
  const db = {
    collection: (name) => ({ doc: (docId) => ref(`${name}/${docId}`) }),
    batch() {
      return {
        set(r) { env.firestoreCalls.push(`set ${r.path}`); },
        async commit() { env.firestoreCalls.push('commit'); }
      };
    }
  };
  const authObj = {
    currentUser: null,
    onAuthStateChanged(cb) { env.authCbs.push(cb); },
    signInWithPopup: async () => { env.signInCalls++; },
    signOut: async () => { env.signOutCalls++; }
  };
  env.authObj = authObj;
  const auth = Object.assign(() => authObj, { GoogleAuthProvider: function () {} });
  return { initializeApp() {}, auth, firestore: Object.assign(() => db, { FieldValue }) };
}

// ── page sandbox ─────────────────────────────────────────────────────────────
function makePage(opts) {
  opts = opts || {};
  const env = {
    firestoreCalls: [], authCbs: [], signInCalls: 0, signOutCalls: 0, reloads: 0, fetches: 0,
    storageWrites: [], storageReads: [], events: [], replaced: [], elements: {}
  };
  const sb = {};
  sb.window = sb;
  sb.__NO_BOOT__ = true;
  sb.console = { log() {}, warn() {}, error: (...a) => { env.lastError = a; }, info() {} };
  Object.assign(sb, { setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, alert() {}, confirm: () => true, prompt: () => null, URLSearchParams });
  sb.navigator = { onLine: true };
  sb.addEventListener = () => {};
  sb.dispatchEvent = (e) => { env.events.push(e.type); };
  sb.Event = function (t) { this.type = t; };
  sb.fetch = async () => { env.fetches++; throw new Error('network is off in tests'); };
  sb.location = { search: opts.search || '', pathname: '/', hash: '', hostname: 'example.test', reload() { env.reloads++; } };
  sb.history = { replaceState(_s, _t, url) { env.replaced.push(url); sb.location.search = url.includes('?') ? url.slice(url.indexOf('?')) : ''; } };
  const store = { [REAL_KEY]: REAL_LOCAL };
  sb.localStorage = {
    getItem(k) { env.storageReads.push(k); return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { env.storageWrites.push(`set ${k}`); store[k] = String(v); },
    removeItem(k) { env.storageWrites.push(`remove ${k}`); delete store[k]; }
  };
  sb.sessionStorage = { getItem: () => null, setItem(k) { env.storageWrites.push(`session set ${k}`); }, removeItem(k) { env.storageWrites.push(`session remove ${k}`); } };
  const el = (id) => env.elements[id] || (env.elements[id] = mockElement(id));
  const body = mockElement('body');
  body.classList.add('app-locked');
  sb.document = {
    body, documentElement: { style: { setProperty() {} } }, visibilityState: 'visible', readyState: 'complete',
    getElementById: el, createElement: () => mockElement(),
    addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }
  };
  sb.firebase = makeFirebase(env);
  sb.firebaseConfig = {};
  vm.createContext(sb);
  env.run = (code) => vm.runInContext(code, sb);
  const load = (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sb, { filename: f });
  APP_FILES.forEach(load);
  // Rendering is out of scope here (it needs a real DOM); the preview covers it.
  env.run(`initUI = function () {}; showDayDetails = function () {}; playSynthSound = function () {};`);
  load('firebase-sync.js');
  env.run(`showAuthToast = function () {};`);
  env.run('loadState();');
  load('js/auth-gate.js');
  env.el = el;
  env.body = body;
  env.store = store;
  env.gateDemoBtn = el('app-auth-gate').querySelector("[data-el='gate-demo']");
  env.fireAuth = async (user) => { env.authObj.currentUser = user; for (const cb of env.authCbs) await cb(user); };
  return env;
}

// ── harness ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS: ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }
}

(async () => {
  console.log('\nScenario 1: signed-out visitor clicks "View demo"');
  const page = makePage();
  await page.fireAuth(null);
  check('Gate is locked before the click', page.body.classList.contains('app-locked') && page.run('isDemoMode()') === false);
  check('Real local state is what is in memory before demo', page.run('appState.days[0].tasks[0].title') === 'REAL PRIVATE TASK');
  const readsBefore = page.storageReads.length;
  const writesBefore = page.storageWrites.length;
  page.gateDemoBtn.click();
  check('Demo flag is set', page.run('isDemoMode()') === true);
  check('Gate lifted', !page.body.classList.contains('app-locked') && page.el('app-auth-gate').hidden === true);
  check('Banner shown', page.el('demo-banner').hidden === false && page.body.classList.contains('demo-mode'));
  check('Auth bar reads "Demo visitor", no avatar, no sync indicator',
    page.el('auth-user-info').innerText === 'Demo visitor' && page.el('auth-avatar').classList.contains('hidden') &&
    page.el('sync-indicator').classList.contains('hidden'));
  check('Export buttons disabled', ['dash-export-excel', 'dash-export-csv', 'dash-export-options'].every(id => page.el(id).disabled === true));
  check('Real state is gone from memory', !page.run('JSON.stringify(appState)').includes('REAL PRIVATE TASK'));
  check('Entering demo read nothing from storage', page.storageReads.length === readsBefore, page.storageReads.slice(readsBefore).join(', '));
  check('Entering demo wrote nothing to storage', page.storageWrites.length === writesBefore, page.storageWrites.slice(writesBefore).join(', '));

  console.log('\nScenario 2: the sample state');
  const demo = JSON.parse(page.run('JSON.stringify(appState)'));
  const today = page.run('getRealCurrentDate()');
  const allTasks = demo.days.flatMap(d => d.tasks);
  const todayIdx = demo.days.findIndex(d => d.date === today);
  check('8 weeks of consecutive days', demo.days.length === 56 && demo.days.every((d, i) => i === 0 || d.date > demo.days[i - 1].date));
  check('Centred on today', todayIdx === 28, `today at index ${todayIdx}`);
  check('Days and tasks have the fields the app expects', demo.days.every(d => typeof d.maxCapacity === 'number' && Array.isArray(d.tasks) && d.isIndia === false) &&
    allTasks.every(t => t.id && t.category && t.title && typeof t.duration === 'number' && typeof t.completed === 'boolean'));
  check('Task ids are unique', new Set(allTasks.map(t => t.id)).size === allTasks.length);
  const done = allTasks.filter(t => t.completed).length;
  const past = demo.days.slice(0, todayIdx).flatMap(d => d.tasks);
  check('Realistic mix of completed and open tasks', done > 40 && done < allTasks.length - 40 && past.some(t => !t.completed) && past.filter(t => t.completed).length > past.length * 0.7,
    `${done}/${allTasks.length} done`);
  check('Every task uses a sample category', allTasks.every(t => demo.categories[t.category]) && Object.keys(demo.categories).every(id => id.startsWith('demo_')));
  check('getAllCategories() exposes only sample categories', page.run('Object.keys(getAllCategories()).every(id => id === "custom" || id.startsWith("demo_"))'));
  const personal = /palana|ahf|hopeful|winfo|portswigger|leetcode|blind ?75|security\+|sec\+|comptia|aws|india|tejaswi|thanishka|hackathon|mentor|interview|microsoft|messer|neetcode/i;
  const visible = JSON.stringify([demo.days, demo.categories, demo.extracurriculars, demo.taskNotes]).replace(/"isIndia"/g, '') + JSON.stringify(page.run('DEMO_COPY'));
  check('No personal category, employer, exam or trip names in the sample data', !personal.test(visible), (visible.match(personal) || [])[0]);
  check('Sample links are example.com and pass safeUrl', allTasks.filter(t => t.link).length > 0 &&
    allTasks.filter(t => t.link).every(t => /^https:\/\/example\.com\//.test(t.link)) && page.run('appState.days.flatMap(d => d.tasks).filter(t => t.link).every(t => safeUrl(t.link) === t.link)'));
  check('planToday() and the month tabs follow the sample days', page.run('planToday()') === today &&
    page.run('demoMonths().map(m => m.code).join()') === [...new Set(demo.days.map(d => d.date.slice(0, 7)))].join());

  console.log('\nScenario 3: editing in demo never touches storage or Firestore');
  // Worst case: pretend the app considers its state ready and a user present,
  // so only the demo guards stand between these edits and storage / Firestore.
  page.run(`stateReady = true; currentUser = { uid: 'u1', displayName: 'Forced', email: 'forced@example.com' };`);
  const firstOpen = page.run('appState.days.flatMap(d => d.tasks).find(t => !t.completed).id');
  page.run(`(function(){ const t = appState.days.flatMap(d => d.tasks).find(t => t.id === ${JSON.stringify(firstOpen)}); t.completed = true; touchTask(t); saveState(); })()`);
  page.run(`saveTaskNote(${JSON.stringify(firstOpen)}, { text: 'demo note' })`);
  page.run(`appState.days[30].tasks.push(touchTask({ id: 'demo_added', category: 'custom', title: 'Added in demo', duration: 1, completed: false })); saveState();`);
  page.run(`forceRollover(appState.days[20].date)`);
  page.run(`deleteExtracurricular(0)`);
  page.run('runStatePipeline(); generateNewState(); reflowRemainingCurriculum(); resetPlannerState(); loadState();');
  await page.run('saveStateToFirestore()');
  await page.run('loadStateFromFirestore()');
  await page.run('pullIfRemoteChanged()');
  await sleep(1000); // past saveState's 800 ms Firestore debounce
  page.run('stateReady = false; currentUser = null;');
  check('Edits are kept in memory', page.run(`appState.days.flatMap(d => d.tasks).find(t => t.id === ${JSON.stringify(firstOpen)}).completed`) === true &&
    page.run(`getTaskNotes(${JSON.stringify(firstOpen)}).text`) === 'demo note' && page.run(`appState.days.flatMap(d => d.tasks).some(t => t.id === 'demo_added')`));
  check('Pipeline, reset and reflow did not bring the real plan in', page.run('appState.days.length') === 56 &&
    !personal.test(page.run('JSON.stringify(appState.days)').replace(/"isIndia"/g, '')));
  check('Extracurriculars are not reseeded from the real list', page.run('initializeExtracurriculars(); appState.extracurriculars.length') === 2);
  check('Zero Firestore calls', page.firestoreCalls.length === 0, page.firestoreCalls.join(', '));
  check('Zero localStorage / sessionStorage writes', page.storageWrites.length === writesBefore, page.storageWrites.slice(writesBefore).join(', '));
  check('Zero storage reads', page.storageReads.length === readsBefore, page.storageReads.slice(readsBefore).join(', '));
  check('Real local progress is byte-for-byte unchanged', page.store[REAL_KEY] === REAL_LOCAL && Object.keys(page.store).length === 1);
  check('No Firebase sign-in or sign-out calls', page.signInCalls === 0 && page.signOutCalls === 0);
  check('No fetch', page.fetches === 0);

  console.log('\nScenario 4: export is off in demo');
  const csv = await page.run('CyberExport.exportCsv()');
  const xlsx = await page.run('CyberExport.exportExcel()');
  check('exportCsv / exportExcel produce nothing', csv === null && xlsx === null);
  check('Export wrote no bookkeeping and fetched no libraries', page.storageWrites.length === writesBefore && page.fetches === 0);

  console.log('\nScenario 5: sign-in from inside the demo reloads first');
  page.run('signInWithGoogle()');
  check('Sign in → location.reload(), no popup', page.reloads === 1 && page.signInCalls === 0);
  await page.run('signOutFirebase()');
  check('Sign out is a no-op', page.signOutCalls === 0 && page.firestoreCalls.length === 0);

  console.log('\nScenario 6: a user appearing mid-demo (another tab) reloads before any sync');
  const reloadsBefore = page.reloads;
  await page.fireAuth({ uid: 'u1', displayName: 'Real User', email: 'real@example.com' });
  check('Reload requested', page.reloads > reloadsBefore);
  check('firebase-sync never adopted the user', page.run('currentUser') === null);
  check('No Firestore call, no storage write, no state-loaded event', page.firestoreCalls.length === 0 &&
    page.storageWrites.length === writesBefore && !page.events.includes('app:state-loaded'));
  check('Real local progress still unchanged', page.store[REAL_KEY] === REAL_LOCAL);

  console.log('\nScenario 7: Exit demo');
  const beforeExit = page.reloads;
  page.run('exitDemoMode()');
  check('Exit triggers location.reload()', page.reloads === beforeExit + 1);
  check('Exit itself wrote nothing', page.storageWrites.length === writesBefore && page.firestoreCalls.length === 0);

  console.log('\nScenario 8: demo is unreachable while signed in');
  const signedIn = makePage();
  await signedIn.fireAuth({ uid: 'u1', displayName: 'Real User', email: 'real@example.com' });
  const callsAfterSignIn = signedIn.firestoreCalls.length;
  signedIn.gateDemoBtn.click();
  check('Button path refuses', signedIn.run('isDemoMode()') === false);
  check('enterDemoMode() refuses', signedIn.run('enterDemoMode()') === false && signedIn.run('isDemoMode()') === false);
  check('Real state still in memory', signedIn.run('JSON.stringify(appState)').includes('REAL PRIVATE TASK'));
  check('Normal sync still runs for the signed-in user', callsAfterSignIn > 0);
  const urlSignedIn = makePage({ search: '?demo=1' });
  await urlSignedIn.fireAuth({ uid: 'u1', displayName: 'Real User', email: 'real@example.com' });
  check('?demo=1 is ignored while signed in', urlSignedIn.run('isDemoMode()') === false);

  console.log('\nScenario 8b: a save in flight when demo starts never continues with sample data');
  const racing = makePage();
  await racing.fireAuth({ uid: 'u1', displayName: 'Real User', email: 'real@example.com' });
  await sleep(900); // let the post-load debounced save finish
  racing.latency = 60;
  racing.run(`appState.days[0].tasks[0].completed = false; touchTask(appState.days[0].tasks[0]); saveState(); clearTimeout(_saveTimer);`);
  const inFlight = racing.run('saveStateToFirestore()');
  await sleep(10);
  await racing.fireAuth(null);            // session expires mid-save
  racing.gateDemoBtn.click();             // visitor clicks "View demo" straight away
  const callsAtEntry = racing.firestoreCalls.length;
  racing.lastError = null;
  await inFlight;
  check('Demo entered while the save was awaiting the server', racing.run('isDemoMode()') === true);
  check('The resumed save stops: no further Firestore call, no write', racing.firestoreCalls.length === callsAtEntry &&
    !racing.firestoreCalls.slice(callsAtEntry).some(c => c !== undefined), racing.firestoreCalls.slice(callsAtEntry).join(', '));
  check('It stops at the demo guard, not by crashing on a null user', racing.lastError === null, racing.lastError && String(racing.lastError[2] || racing.lastError[0]));
  check('Sample state untouched by the resumed save', racing.run('appState.days.length') === 56 && !racing.run('JSON.stringify(appState)').includes('REAL PRIVATE TASK'));

  console.log('\nScenario 9: ?demo=1 only presses the button');
  const viaUrl = makePage({ search: '?demo=1' });
  check('Nothing happens before auth resolves', viaUrl.run('isDemoMode()') === false);
  await viaUrl.fireAuth(null);
  check('Demo entered after signed-out auth', viaUrl.run('isDemoMode()') === true && viaUrl.run('appState.days.length') === 56);
  check('Flag removed from the address bar so a reload exits', viaUrl.replaced.length === 1 && !/demo/.test(viaUrl.replaced[0]));
  const junk = makePage({ search: '?demo=%7B%22days%22%3A%5B%5D%7D&state=x' });
  await junk.fireAuth(null);
  check('Any other value (e.g. a payload) does nothing', junk.run('isDemoMode()') === false);

  console.log('\nScenario 10: the assistant makes no request and reads no key in demo');
  const keyReads = [];
  let fetches = 0;
  let demoOn = true;
  globalThis.window = { isDemoMode: () => demoOn };
  globalThis.localStorage = {
    getItem(k) { keyReads.push(k); return k === 'chatbot_anthropic_api_key' ? 'sk-test-not-a-real-key' : null; },
    setItem() {}, removeItem() {}
  };
  globalThis.fetch = async () => { fetches++; throw new Error('network is off in tests'); };
  const api = await import(pathToFileURL(path.join(__dirname, 'js/chatbot/api.js')).href + '?v=20261002a');
  let err = null;
  try { await api.callModel({ system: 's', messages: [{ role: 'user', content: 'hi' }] }); } catch (e) { err = e; }
  check('callModel refuses with kind "demo"', err instanceof api.ChatbotApiError && err.kind === 'demo', err && err.message);
  check('Zero fetch calls', fetches === 0);
  check('Stored Anthropic key never read', api.getApiKey() === '' && api.hasApiKey() === false && !keyReads.includes('chatbot_anthropic_api_key'), keyReads.join(', '));
  check('No storage read at all (settings, proxy URL)', keyReads.length === 0, keyReads.join(', '));
  demoOn = false;
  check('Control: outside demo the same client does read the key', api.getApiKey() === 'sk-test-not-a-real-key');
  const src = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
  check('Assistant entry points are guarded', ['handleSend', 'handleChipAnswers', 'handleApply', 'handleUndo']
    .every(fn => new RegExp(`function ${fn}\\([^)]*\\) \\{\\s*if \\(inDemo\\(\\)\\) return;`).test(src('js/chatbot/index.js'))));

  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail) { console.log('\nFailures:'); failures.forEach(f => console.log(`  - ${f}`)); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
