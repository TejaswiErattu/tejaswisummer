// Two-device sync test (no browser, no network).
//
// Each "device" is its own vm context with its own localStorage, running the
// real app.js + js/sync-core.js + firebase-sync.js against one shared in-memory
// fake Firestore. A device can be taken offline, and the fake can add latency
// to reads/commits to exercise overlapping saves.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_FILES = ['blind75.js', 'git-roadmap.js', 'app.js', 'plan-extension-2026.js', 'js/sync-core.js'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

// ── fake Firestore ───────────────────────────────────────────────────────────
function makeCloud() {
  return { docs: new Map(), commits: [], latency: 0 };
}

function makeFirebase(cloud, device) {
  const FieldValue = { serverTimestamp: () => ({ __ts: true }), delete: () => ({ __del: true }) };
  const unavailable = () => Object.assign(new Error('offline'), { code: 'unavailable' });
  const applyWrite = (p, data, merge) => {
    const cur = merge && cloud.docs.has(p) ? Object.assign({}, cloud.docs.get(p)) : {};
    Object.keys(data).forEach(k => {
      const v = data[k];
      if (v && v.__del) delete cur[k];
      else if (v && v.__ts) cur[k] = Date.now();
      else cur[k] = clone(v);
    });
    cloud.docs.set(p, cur);
  };
  const ref = (p) => ({
    path: p,
    async get() {
      if (device.offline) throw unavailable();
      await sleep(cloud.latency);
      const d = cloud.docs.get(p);
      return { exists: !!d, data: () => (d ? clone(d) : undefined) };
    },
    collection: (name) => ({ doc: (id) => ref(`${p}/${name}/${id}`) })
  });
  const db = {
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    batch() {
      const ops = [];
      return {
        set(r, data, opts) { ops.push([r.path, data, !!(opts && opts.merge)]); },
        async commit() {
          if (device.offline) throw unavailable();
          await sleep(cloud.latency);
          ops.forEach(([p, d, m]) => applyWrite(p, d, m));
          cloud.commits.push(ops.map(o => o[0]));
        }
      };
    }
  };
  const authObj = {
    currentUser: null,
    onAuthStateChanged(cb) { device.authCb = cb; },
    signInWithPopup: async () => {},
    signOut: async () => {}
  };
  const auth = Object.assign(() => authObj, { GoogleAuthProvider: function () {} });
  return { initializeApp() {}, auth, firestore: Object.assign(() => db, { FieldValue }) };
}

// ── device sandbox ───────────────────────────────────────────────────────────
function mockElement() {
  return {
    className: '', innerHTML: '', innerText: '', textContent: '', dataset: {},
    style: { setProperty() {} },
    classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
    appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
}

function makeDevice(name, cloud, store) {
  const device = { name, offline: false, authCb: null, indicator: mockElement() };
  const sb = {};
  sb.window = sb;
  sb.__NO_BOOT__ = true;
  sb.console = { log() {}, warn() {}, error: (...a) => device.lastError = a, info() {} };
  Object.assign(sb, { setTimeout, clearTimeout, setInterval, clearInterval, alert() {}, confirm: () => true, prompt: () => null });
  sb.navigator = { get onLine() { return !device.offline; } };
  sb.addEventListener = () => {};
  sb.dispatchEvent = () => {};
  sb.Event = function (t) { this.type = t; };
  sb.localStorage = {
    store: store || {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
  sb.document = {
    body: { classList: mockElement().classList, appendChild() {} },
    documentElement: { style: { setProperty() {} } },
    visibilityState: 'visible',
    getElementById: (id) => (id === 'sync-indicator' ? device.indicator : mockElement()),
    createElement: () => mockElement(),
    addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }
  };
  sb.firebase = makeFirebase(cloud, device);
  sb.firebaseConfig = {};
  vm.createContext(sb);
  device.run = (code) => vm.runInContext(code, sb);
  APP_FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sb, { filename: f }));
  // UI is out of scope here.
  device.run(`initUI = function () {}; showDayDetails = function () {}; playSynthSound = function () {};
    showAuthToast = function () {}; applyCategoryColors = function () {};`);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'firebase-sync.js'), 'utf8'), sb, { filename: 'firebase-sync.js' });
  device.run(`showAuthToast = function () {};`);
  device.run('loadState();');
  device.store = sb.localStorage.store;
  device.signIn = async () => {
    await device.authCb({ uid: 'u1', displayName: 'Test User', email: 'test@example.com' });
    await device.flush();
  };
  device.flush = async () => { device.run('clearTimeout(_saveTimer)'); await device.run('saveStateToFirestore()'); };
  device.task = (id) => device.run(`(function(){ for (const d of appState.days) { const t = d.tasks.find(x => x.id === ${JSON.stringify(id)}); if (t) return Object.assign({ __date: d.date }, t); } return null; })()`);
  device.edit = (id, js) => device.run(`(function(){ for (const d of appState.days) { const t = d.tasks.find(x => x.id === ${JSON.stringify(id)}); if (t) { ${js}; touchTask(t); saveState(); return true; } } return false; })()`);
  device.status = () => device.indicator.dataset.state;
  return device;
}

// Reads the cloud copy the way a fresh device would.
function cloudState(cloud) {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/sync-core.js'), 'utf8'), ctx);
  const root = cloud.docs.get('users/u1');
  const months = {};
  (root.months || []).forEach(m => { const d = cloud.docs.get(`users/u1/months/${m}`); if (d) months[m] = d.days; });
  const notes = cloud.docs.get('users/u1/notes/main');
  return ctx.SyncCore.join({ meta: root.meta, root: root.root, months, notes: notes ? notes.notes : '{}' });
}
const cloudTask = (cloud, id) => { for (const d of cloudState(cloud).days) { const t = d.tasks.find(x => x.id === id); if (t) return Object.assign({ __date: d.date }, t); } return null; };

// ── harness ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS: ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }
}

(async () => {
  const cloud = makeCloud();

  // Pick a handful of uncompleted October tasks to play with.
  const seed = makeDevice('seed', cloud);
  seed.run('runStatePipeline();');
  const ids = seed.run(`appState.days.filter(d => d.date >= '2026-10-01' && d.date <= '2026-10-31')
    .flatMap(d => d.tasks.filter(t => !t.completed).map(t => t.id)).slice(0, 8)`);
  const [X, Y, Z1, Z2, W, V] = ids;

  // Legacy single-document cloud copy with X ticked and a note on it.
  seed.run(`(function(){ const t = appState.days.flatMap(d => d.tasks).find(t => t.id === ${JSON.stringify(X)});
    t.completed = true; appState.taskNotes = { ${JSON.stringify(X)}: { text: 'legacy note', lastUpdated: '2026-09-01T00:00:00Z' } }; })()`);
  cloud.docs.set('users/u1', { state: seed.run('JSON.stringify(appState)'), displayName: 'Test User' });

  console.log('\nScenario 1: first load migrates the legacy single document');
  const A = makeDevice('A', cloud);
  await A.signIn();
  const root = cloud.docs.get('users/u1');
  check('Legacy state field deleted', root.state === undefined);
  check('Root doc is schema 2 with meta + root + month list', root.schema === 2 && root.meta && typeof root.root === 'string' && root.months.length > 0);
  check('Month docs written', root.months.every(m => cloud.docs.has(`users/u1/months/${m}`)));
  check('Notes doc written', cloud.docs.has('users/u1/notes/main'));
  check('Legacy tick survived the migration merge', A.task(X).completed === true && cloudTask(cloud, X).completed === true);
  check('Legacy note survived', A.run(`getTaskNotes(${JSON.stringify(X)}).text`) === 'legacy note');
  check('Root doc has no days/notes inside it', !('days' in JSON.parse(root.root)) && !('taskNotes' in JSON.parse(root.root)));
  check('Indicator reads Synced', A.status() === 'synced');

  console.log('\nScenario 2: edit on A, then load B');
  const B = makeDevice('B', cloud);
  await B.signIn();
  check('Fresh device B takes the cloud copy', B.task(X).completed === true);
  await sleep(5);
  A.edit(Y, 't.completed = true');
  A.run(`saveTaskNote(${JSON.stringify(Y)}, { text: 'from A' })`);
  await A.flush();
  // B reloads: a new sandbox over B's localStorage.
  const B2 = makeDevice('B2', cloud, B.store);
  await B2.signIn();
  check('B (reloaded) sees A\'s tick', B2.task(Y).completed === true);
  check('B (reloaded) sees A\'s note', B2.run(`getTaskNotes(${JSON.stringify(Y)}).text`) === 'from A');
  // And the focus-pull path on the still-open original B tab.
  await B.run('pullIfRemoteChanged()');
  check('B (open tab, on focus) pulls A\'s tick', B.task(Y).completed === true);

  console.log('\nScenario 3: offline edits on both devices');
  A.offline = true; B.offline = true;
  await sleep(5);
  A.edit(Z1, 't.completed = true');
  await A.flush();
  check('A shows Offline while disconnected', A.status() === 'offline');
  await sleep(5);
  B.edit(Z2, 't.completed = true');
  B.run(`saveTaskNote(${JSON.stringify(Z2)}, { text: 'from B offline' })`);
  // Same task on both: A completes W first, B later marks it skipped.
  await sleep(5);
  A.edit(W, 't.completed = true; t.status = "done"');
  await sleep(5);
  B.edit(W, 't.completed = false; t.status = "skipped"');
  await B.flush();
  check('B shows Offline while disconnected', B.status() === 'offline');
  const commitsBefore = cloud.commits.length;
  check('Nothing reached the cloud while offline', cloud.commits.length === commitsBefore && !cloudTask(cloud, Z1).completed);

  A.offline = false; await A.run('pullIfRemoteChanged()');
  B.offline = false; await B.run('pullIfRemoteChanged()');
  await A.run('pullIfRemoteChanged()');
  for (const [dev, label] of [[A, 'A'], [B, 'B']]) {
    check(`${label} has both offline ticks`, dev.task(Z1).completed === true && dev.task(Z2).completed === true);
    check(`${label} keeps the later edit of the shared task (B's skip)`, dev.task(W).status === 'skipped' && dev.task(W).completed === false);
    check(`${label} has B's offline note`, dev.run(`getTaskNotes(${JSON.stringify(Z2)}).text`) === 'from B offline');
    check(`${label} still has earlier edits`, dev.task(X).completed === true && dev.task(Y).completed === true);
  }
  check('Cloud has the merged result', cloudTask(cloud, Z1).completed && cloudTask(cloud, Z2).completed && cloudTask(cloud, W).status === 'skipped');
  check('Both back to Synced', A.status() === 'synced' && B.status() === 'synced');

  console.log('\nScenario 4: a delete is not resurrected by the other device');
  A.run(`(function(){ const d = appState.days.find(d => d.date === '2026-10-20');
    d.tasks.push(touchTask({ id: 'custom_c', category: 'custom', title: 'Custom C', duration: 1, completed: false, source: 'user' })); saveState(); })()`);
  await A.flush(); await B.run('pullIfRemoteChanged()');
  check('B received the custom task', !!B.task('custom_c'));
  A.offline = true; B.offline = true;
  await sleep(5);
  A.run(`(function(){ const d = appState.days.find(d => d.date === '2026-10-20'); d.tasks = d.tasks.filter(t => t.id !== 'custom_c'); saveState(); })()`);
  await sleep(5);
  B.edit(V, 't.completed = true');
  A.offline = false; await A.run('pullIfRemoteChanged()');
  B.offline = false; await B.run('pullIfRemoteChanged()');
  await A.run('pullIfRemoteChanged()');
  check('Deleted task stays deleted on A, B and cloud', !A.task('custom_c') && !B.task('custom_c') && !cloudTask(cloud, 'custom_c'));
  check('B\'s concurrent edit kept', A.task(V).completed === true && cloudTask(cloud, V).completed === true);

  console.log('\nScenario 5: moving a task to another day does not duplicate it');
  A.offline = true;
  await sleep(5);
  A.run(`(function(){ const t = appState.days.flatMap(d => d.tasks).find(t => t.id === ${JSON.stringify(Z1)});
    const from = appState.days.find(d => d.tasks.includes(t)); moveTaskToDate(t, from.date, '2026-11-02'); saveState(); })()`);
  A.offline = false; await A.run('pullIfRemoteChanged()'); await B.run('pullIfRemoteChanged()');
  const copies = B.run(`appState.days.flatMap(d => d.tasks).filter(t => t.id === ${JSON.stringify(Z1)}).length`);
  check('Moved task appears once, on its new day', copies === 1 && B.task(Z1).__date === '2026-11-02');

  console.log('\nScenario 6: rapid clicking with slow commits');
  cloud.latency = 25;
  const burstStart = cloud.commits.length;
  let finalCompleted = false;
  const pending = [];
  for (let i = 0; i < 25; i++) {
    finalCompleted = !finalCompleted;
    A.edit(V, `t.completed = ${finalCompleted}`);
    pending.push(A.run('saveStateToFirestore()'));
    await sleep(2);
  }
  await Promise.all(pending);
  await A.flush();
  const burstCommits = cloud.commits.length - burstStart;
  check('Last click reached the cloud', cloudTask(cloud, V).completed === finalCompleted, `cloud ${cloudTask(cloud, V).completed}, local ${finalCompleted}`);
  check('Cloud meta matches local meta', cloudState(cloud).meta.updatedAt === A.run('appState.meta.updatedAt'));
  console.log(`  (${burstCommits} commits for 25 clicks)`);
  check('Overlapping saves were coalesced', burstCommits <= 8, `${burstCommits} commits for 25 clicks`);
  cloud.latency = 0;

  console.log('\nScenario 7: only changed months are written');
  await B.run('pullIfRemoteChanged()');
  await sleep(5);
  const before = cloud.commits.length;
  B.edit(Y, 't.completed = false');
  await B.flush();
  const paths = cloud.commits.slice(before).flat();
  check('One commit: root + that one month', cloud.commits.length - before === 1 &&
    paths.filter(p => p.includes('/months/')).join() === 'users/u1/months/2026-10' && paths.includes('users/u1'), paths.join(', '));

  console.log('\nScenario 8: a load with no edits does not count as an edit');
  const tsBefore = cloudState(cloud).meta.updatedAt;
  const C = makeDevice('C', cloud);
  await C.signIn();
  check('Cloud meta unchanged after a plain load', cloudState(cloud).meta.updatedAt === tsBefore);

  console.log('\nScenario 9: archivedTasks capped at 200');
  A.run(`appState.archivedTasks = Array.from({ length: 250 }, (_, i) => ({ id: 'arch' + i })); saveState();`);
  check('Capped to the most recent 200', A.run('appState.archivedTasks.length') === 200 && A.run('appState.archivedTasks[0].id') === 'arch50');

  console.log('\nScenario 10: cloud unreachable right after sign-out does not wipe ticks');
  await A.flush();
  const doneBefore = cloudState(cloud).days.flatMap(d => d.tasks).filter(t => t.completed).length;
  // Sign-out purges local progress (js/auth-gate.js), then the page reloads.
  ['cyber_study_plan_state_2026', 'cyber_sync_state_v1'].forEach(k => delete A.store[k]);
  const commitsBefore10 = cloud.commits.length;
  const R = makeDevice('R', cloud, A.store);
  R.offline = true;
  await R.authCb({ uid: 'u1', displayName: 'Test User', email: 'test@example.com' });
  check('Stays locked on the placeholder plan', R.run('stateReady') === false);
  await R.run('saveStateToFirestore()');
  check('Nothing written while the cloud is unreachable', cloud.commits.length === commitsBefore10);
  R.offline = false;
  await sleep(2300); // first retry fires after 2 s
  await R.flush();
  const doneAfter = cloudState(cloud).days.flatMap(d => d.tasks).filter(t => t.completed).length;
  check('Retry loads the cloud copy', R.run('stateReady') === true && R.task(Y) && R.task(X).completed === true);
  check('Cloud keeps every tick', doneAfter >= doneBefore, `${doneBefore} before, ${doneAfter} after`);
  check('Cloud root is not replaced by the placeholder', cloudState(cloud).settings.origin === A.run('appState.settings.origin'));

  const sizes = A.run('(function(){ const p = SyncCore.split(appState); return { root: p.root.length, notes: p.notes.length, maxMonth: Math.max(...Object.values(p.months).map(m => m.length)), total: JSON.stringify(appState).length }; })()');
  console.log(`\nSizes (chars): ${JSON.stringify(sizes)}`);
  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail) { console.log('\nFailures:'); failures.forEach(f => console.log(`  - ${f}`)); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
