// ============================================================================
// PANEL UI
//
// Renders and owns everything inside #chatbot-panel. This file never touches
// host-app DOM; all host interaction goes through adapter.js.
// ============================================================================

import { MODELS, loadSettings, saveSettings, getApiKey, setApiKey, hasApiKey, getModel } from "./api.js?v=20260916a";

const UI_KEY = "chatbot_ui_state_v1";
const NARROW_BREAKPOINT = 1100;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

function loadUi() {
  const defaults = { open: window.innerWidth >= NARROW_BREAKPOINT, width: 380 };
  try {
    const raw = localStorage.getItem(UI_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return defaults; }
}
function saveUi(patch) {
  const next = { ...loadUi(), ...patch };
  try { localStorage.setItem(UI_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export class ChatbotPanel {
  constructor(handlers) {
    this.h = handlers;              // { onSend, onApply, onCancel, onUndo, onAnswerChips, onSignOut }
    this.ui = loadUi();
    this.locked = true;
    this.pending = null;            // pending batch awaiting Apply
    this.busy = false;
    this._build();
    this._applyUiState();
    this._wireGlobalKeys();
  }

  // --- DOM construction -----------------------------------------------------
  _build() {
    const root = document.createElement("div");
    root.id = "chatbot-panel";
    root.className = "cb-panel";
    root.innerHTML = `
      <div class="cb-resize-handle" title="Drag to resize"></div>
      <header class="cb-header">
        <span class="cb-title">ASSISTANT // TASK_INPUT</span>
        <div class="cb-header-actions">
          <button class="cb-icon-btn" data-act="settings" title="Settings" aria-label="Settings">⚙</button>
          <button class="cb-icon-btn" data-act="collapse" title="Collapse panel" aria-label="Collapse">→</button>
        </div>
      </header>

      <div class="cb-auth-gate" data-el="authGate">
        <div class="cb-auth-inner">
          <div class="cb-lock-icon">🔒</div>
          <h3>Sign in to use the assistant</h3>
          <p class="cb-auth-note">The assistant can add, move and delete tasks, so it stays locked until you sign in.</p>
          <div data-el="signinSlot" class="cb-signin-slot"></div>
          <p class="cb-auth-error" data-el="authError" hidden></p>
        </div>
      </div>

      <div class="cb-body" data-el="body" hidden>
        <div class="cb-user-strip" data-el="userStrip">
          <span class="cb-user-name" data-el="userName"></span>
          <button class="cb-linkbtn" data-act="signout">Sign out</button>
        </div>

        <div class="cb-settings" data-el="settings" hidden></div>

        <div class="cb-log" data-el="log" role="log" aria-live="polite"></div>

        <div class="cb-composer">
          <textarea data-el="input" class="cb-input" rows="2"
            placeholder="e.g. add a pen testing task every Tue and Thu for the next month"
            aria-label="Message the assistant"></textarea>
          <button class="cb-send" data-act="send" title="Send (Enter)">SEND</button>
        </div>

        <footer class="cb-footer">
          <span class="cb-foot-item" data-el="footModel"></span>
          <span class="cb-foot-item" data-el="footTokens">0 tok</span>
          <span class="cb-foot-item" data-el="footCost">$0.0000</span>
          <button class="cb-linkbtn cb-undo" data-act="undo" disabled>Undo</button>
        </footer>
      </div>
    `;
    document.body.appendChild(root);
    this.root = root;

    const fab = document.createElement("button");
    fab.id = "chatbot-fab";
    fab.className = "cb-fab";
    fab.title = "Open assistant (Ctrl/Cmd + K)";
    fab.innerHTML = "💬";
    document.body.appendChild(fab);
    this.fab = fab;

    this.el = {};
    root.querySelectorAll("[data-el]").forEach(n => { this.el[n.dataset.el] = n; });

    // --- events ---
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      if (this.locked && act !== "collapse") return;
      if (act === "collapse") this.setOpen(false);
      else if (act === "settings") this.toggleSettings();
      else if (act === "send") this._submit();
      else if (act === "undo") this.h.onUndo?.();
      else if (act === "signout") this.h.onSignOut?.();
      else if (act === "apply") this._apply();
      else if (act === "cancel") this._cancel();
    });

    fab.addEventListener("click", () => this.setOpen(true));

    this.el.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this._submit(); }
    });

    this._wireResize();
    this.refreshFooter();
  }

  _wireResize() {
    const handle = this.root.querySelector(".cb-resize-handle");
    let startX = 0, startW = 0, dragging = false;
    handle.addEventListener("mousedown", (e) => {
      dragging = true; startX = e.clientX; startW = this.root.offsetWidth;
      document.body.style.userSelect = "none";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const w = Math.min(640, Math.max(300, startW + (startX - e.clientX)));
      this.root.style.width = `${w}px`;
    });
    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = "";
      this.ui = saveUi({ width: this.root.offsetWidth });
    });
  }

  _wireGlobalKeys() {
    window.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        this.setOpen(true);
        if (!this.locked) this.el.input.focus();
      }
    });
  }

  // --- open / collapse ------------------------------------------------------
  _applyUiState() {
    this.root.style.width = `${this.ui.width}px`;
    this.setOpen(this.ui.open, true);
  }

  setOpen(open, silent) {
    this.root.classList.toggle("cb-open", !!open);
    this.fab.classList.toggle("cb-fab-hidden", !!open);
    document.body.classList.toggle("cb-panel-open", !!open);
    if (!silent) this.ui = saveUi({ open: !!open });
    if (open && !this.locked) setTimeout(() => this.el.input?.focus(), 60);
  }

  // --- auth gating ----------------------------------------------------------
  get signinSlot() { return this.el.signinSlot; }

  setLocked(locked, session) {
    this.locked = !!locked;
    this.el.authGate.hidden = !locked;
    this.el.body.hidden = !!locked;
    // The gear is gated too - no settings access before sign-in.
    const gear = this.root.querySelector('[data-act="settings"]');
    if (gear) gear.hidden = !!locked;
    if (!locked && session) {
      this.el.userName.textContent = session.name || session.email || "";
      this.el.userName.title = session.email || "";
    }
    if (locked) this.el.settings.hidden = true;
  }

  showAuthError(msg) {
    const el = this.el.authError;
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  // --- settings -------------------------------------------------------------
  toggleSettings() {
    const s = this.el.settings;
    if (s.hidden) { this.renderSettings(); s.hidden = false; }
    else s.hidden = true;
  }

  renderSettings() {
    const cfg = loadSettings();
    const key = getApiKey();
    const masked = key ? `${key.slice(0, 7)}…${key.slice(-4)}` : "";
    this.el.settings.innerHTML = `
      <div class="cb-set-row">
        <label>Mode</label>
        <select data-set="mode">
          <option value="direct" ${cfg.mode === "direct" ? "selected" : ""}>A · Direct browser call</option>
          <option value="proxy" ${cfg.mode === "proxy" ? "selected" : ""}>B · Proxy endpoint</option>
        </select>
      </div>

      <div class="cb-set-block" data-when="direct" ${cfg.mode === "direct" ? "" : "hidden"}>
        <div class="cb-set-row">
          <label>Anthropic API key</label>
          <input type="password" data-set="apiKey" autocomplete="off" spellcheck="false"
                 placeholder="${key ? esc(masked) : "sk-ant-…"}">
        </div>
        <p class="cb-warn">⚠ Your key is stored in this browser only. Do not use this mode on a shared computer.</p>
        ${key ? `<button class="cb-linkbtn cb-danger" data-set-act="clearKey">Remove stored key</button>` : ""}
      </div>

      <div class="cb-set-block" data-when="proxy" ${cfg.mode === "proxy" ? "" : "hidden"}>
        <div class="cb-set-row">
          <label>Proxy URL</label>
          <input type="url" data-set="proxyUrl" value="${esc(cfg.proxyUrl)}"
                 placeholder="https://your-worker.workers.dev">
        </div>
        <p class="cb-note">No API key is sent from this browser in proxy mode. The proxy holds it.</p>
      </div>

      <div class="cb-set-row">
        <label>Model</label>
        <select data-set="model">
          ${MODELS.map(m => `<option value="${esc(m.id)}" ${cfg.model === m.id ? "selected" : ""}>${esc(m.label)} · $${m.inputPerMTok}/$${m.outputPerMTok} per MTok</option>`).join("")}
        </select>
      </div>

      <div class="cb-set-actions">
        <button class="cb-btn cb-btn-primary" data-set-act="save">Save</button>
        <button class="cb-btn" data-set-act="close">Close</button>
      </div>
    `;

    const s = this.el.settings;
    s.querySelector('[data-set="mode"]').addEventListener("change", (e) => {
      const mode = e.target.value;
      s.querySelector('[data-when="direct"]').hidden = mode !== "direct";
      s.querySelector('[data-when="proxy"]').hidden = mode !== "proxy";
    });

    s.addEventListener("click", (e) => {
      const b = e.target.closest("[data-set-act]");
      if (!b) return;
      const act = b.dataset.setAct;
      if (act === "close") { s.hidden = true; return; }
      if (act === "clearKey") {
        setApiKey("");
        this.renderSettings();
        this.addSystem("Stored API key removed.");
        return;
      }
      if (act === "save") {
        const mode = s.querySelector('[data-set="mode"]').value;
        const model = s.querySelector('[data-set="model"]').value;
        const proxyUrl = s.querySelector('[data-set="proxyUrl"]')?.value.trim() || "";
        const keyInput = s.querySelector('[data-set="apiKey"]');
        // Only overwrite the stored key if the field was actually typed into,
        // so re-saving settings doesn't wipe an existing key.
        if (keyInput && keyInput.value.trim()) setApiKey(keyInput.value.trim());
        saveSettings({ mode, model, proxyUrl });
        if (keyInput) keyInput.value = "";
        s.hidden = true;
        this.refreshFooter();
        this.addSystem(`Settings saved · ${getModel(model).label} · mode ${mode === "direct" ? "A (direct)" : "B (proxy)"}.`);
      }
    }, { once: false });
  }

  // --- message log ----------------------------------------------------------
  _append(node) {
    this.el.log.appendChild(node);
    this.el.log.scrollTop = this.el.log.scrollHeight;
    return node;
  }

  addUser(text) {
    const d = document.createElement("div");
    d.className = "cb-msg cb-msg-user";
    d.innerHTML = `<div class="cb-bubble">${esc(text).replace(/\n/g, "<br>")}</div>`;
    return this._append(d);
  }

  addBot(text) {
    const d = document.createElement("div");
    d.className = "cb-msg cb-msg-bot";
    d.innerHTML = `<div class="cb-bubble">${esc(text).replace(/\n/g, "<br>")}</div>`;
    return this._append(d);
  }

  addSystem(text) {
    const d = document.createElement("div");
    d.className = "cb-msg cb-msg-sys";
    d.textContent = text;
    return this._append(d);
  }

  addError(title, detail) {
    const d = document.createElement("div");
    d.className = "cb-msg cb-msg-err";
    d.innerHTML = `<strong>${esc(title)}</strong>` +
      (detail ? `<div class="cb-err-detail">${esc(detail)}</div>` : "");
    return this._append(d);
  }

  setBusy(on, label) {
    this.busy = !!on;
    this.el.input.disabled = !!on;
    this.root.querySelector('[data-act="send"]').disabled = !!on;
    if (on) {
      if (!this._busyNode) {
        this._busyNode = document.createElement("div");
        this._busyNode.className = "cb-msg cb-msg-busy";
        this._append(this._busyNode);
      }
      this._busyNode.textContent = label || "Thinking…";
    } else if (this._busyNode) {
      this._busyNode.remove();
      this._busyNode = null;
    }
  }

  // --- clarification chips --------------------------------------------------
  askQuestions(questions, partialUnderstanding) {
    if (partialUnderstanding) this.addBot(partialUnderstanding);

    const wrap = document.createElement("div");
    wrap.className = "cb-questions";
    const answers = {};

    questions.forEach(q => {
      const block = document.createElement("div");
      block.className = "cb-q";
      block.innerHTML = `<div class="cb-q-text">${esc(q.question)}</div>`;
      const chips = document.createElement("div");
      chips.className = "cb-chips";
      (q.suggestions || []).forEach(sug => {
        const chip = document.createElement("button");
        chip.className = "cb-chip";
        chip.textContent = sug;
        chip.addEventListener("click", () => {
          answers[q.id] = sug;
          chips.querySelectorAll(".cb-chip").forEach(c => c.classList.remove("cb-chip-on"));
          chip.classList.add("cb-chip-on");
          submitBtn.disabled = Object.keys(answers).length === 0;
        });
        chips.appendChild(chip);
      });
      block.appendChild(chips);

      const free = document.createElement("input");
      free.className = "cb-q-free";
      free.placeholder = "or type your own…";
      free.addEventListener("input", () => {
        if (free.value.trim()) {
          answers[q.id] = free.value.trim();
          chips.querySelectorAll(".cb-chip").forEach(c => c.classList.remove("cb-chip-on"));
        } else {
          delete answers[q.id];
        }
        submitBtn.disabled = Object.keys(answers).length === 0;
      });
      block.appendChild(free);
      wrap.appendChild(block);
    });

    const submitBtn = document.createElement("button");
    submitBtn.className = "cb-btn cb-btn-primary";
    submitBtn.textContent = "Send answers";
    submitBtn.disabled = true;
    submitBtn.addEventListener("click", () => {
      wrap.querySelectorAll("button, input").forEach(n => { n.disabled = true; });
      wrap.classList.add("cb-answered");
      const text = questions
        .filter(q => answers[q.id])
        .map(q => `${q.question} -> ${answers[q.id]}`)
        .join("\n");
      this.h.onAnswerChips?.(text, answers);
    });
    wrap.appendChild(submitBtn);

    return this._append(wrap);
  }

  // --- diff preview ---------------------------------------------------------
  // changes: [{ kind: "add"|"remove"|"edit", date, title, detail, reason }]
  showPreview({ summary, changes, risky, instanceCount }) {
    this.clearPreview();
    const wrap = document.createElement("div");
    wrap.className = "cb-preview";
    this.pending = { risky };

    const byDate = new Map();
    changes.forEach(c => {
      const k = c.date || "—";
      if (!byDate.has(k)) byDate.set(k, []);
      byDate.get(k).push(c);
    });
    const dates = [...byDate.keys()].sort();

    // Long series are collapsed so the preview stays readable.
    const MAX_SHOWN = 12;
    let shown = 0;
    let groupsHtml = "";
    for (const d of dates) {
      if (shown >= MAX_SHOWN) break;
      const items = byDate.get(d);
      groupsHtml += `<div class="cb-diff-group"><div class="cb-diff-date">${esc(d)}</div>` +
        items.slice(0, MAX_SHOWN - shown).map(c =>
          `<div class="cb-diff cb-diff-${esc(c.kind)}">
             <span class="cb-diff-sign">${c.kind === "add" ? "+" : c.kind === "remove" ? "−" : "~"}</span>
             <span class="cb-diff-body">
               <span class="cb-diff-title">${esc(c.title)}</span>
               ${c.detail ? `<span class="cb-diff-detail">${esc(c.detail)}</span>` : ""}
               ${c.reason ? `<span class="cb-diff-reason">${esc(c.reason)}</span>` : ""}
             </span>
           </div>`).join("") +
        `</div>`;
      shown += items.length;
    }
    const hidden = changes.length - Math.min(changes.length, MAX_SHOWN);

    wrap.innerHTML = `
      <div class="cb-preview-head">PENDING CHANGES</div>
      ${summary ? `<div class="cb-preview-summary">${esc(summary)}</div>` : ""}
      <div class="cb-preview-count">${changes.length} change${changes.length === 1 ? "" : "s"}${instanceCount ? ` · ${instanceCount} task instance${instanceCount === 1 ? "" : "s"}` : ""}</div>
      <div class="cb-diff-list">${groupsHtml}</div>
      ${hidden > 0 ? `<div class="cb-diff-more">…and ${hidden} more</div>` : ""}
      <div class="cb-preview-actions">
        <button class="cb-btn cb-btn-primary" data-act="apply">Apply</button>
        <button class="cb-btn" data-act="cancel">Cancel</button>
      </div>
    `;

    if (risky && risky.length) {
      const guard = document.createElement("div");
      guard.className = "cb-guard";
      guard.innerHTML = `
        <div class="cb-guard-title">⚠ This touches protected items</div>
        <ul class="cb-guard-list">
          ${risky.map(r => `<li>${esc(r.op.op)}: ${esc(r.reasons.join("; "))}</li>`).join("")}
        </ul>
        <label class="cb-guard-check">
          <input type="checkbox" data-el="guardCheck">
          <span>Yes, I mean it — change these anyway</span>
        </label>
      `;
      wrap.insertBefore(guard, wrap.querySelector(".cb-preview-actions"));
      const applyBtn = wrap.querySelector('[data-act="apply"]');
      applyBtn.disabled = true;
      guard.querySelector("[data-el=guardCheck]").addEventListener("change", (e) => {
        applyBtn.disabled = !e.target.checked;
      });
    }

    this.previewNode = this._append(wrap);
    return this.previewNode;
  }

  clearPreview() {
    if (this.previewNode) { this.previewNode.remove(); this.previewNode = null; }
    this.pending = null;
  }

  _apply() {
    if (this.previewNode) {
      this.previewNode.querySelectorAll("button, input").forEach(n => { n.disabled = true; });
      this.previewNode.classList.add("cb-preview-applied");
    }
    this.h.onApply?.();
  }

  _cancel() {
    this.clearPreview();
    this.addSystem("Changes discarded. Nothing was applied.");
    this.h.onCancel?.();
  }

  // --- toast ----------------------------------------------------------------
  toast(message, actionLabel, onAction) {
    document.querySelectorAll(".cb-toast").forEach(t => t.remove());
    const t = document.createElement("div");
    t.className = "cb-toast";
    t.innerHTML = `<span>${esc(message)}</span>`;
    if (actionLabel) {
      const b = document.createElement("button");
      b.className = "cb-toast-action";
      b.textContent = actionLabel;
      b.addEventListener("click", () => { t.remove(); onAction?.(); });
      t.appendChild(b);
    }
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("cb-toast-in"), 10);
    setTimeout(() => { t.classList.remove("cb-toast-in"); setTimeout(() => t.remove(), 300); }, 9000);
    return t;
  }

  // --- footer ---------------------------------------------------------------
  refreshFooter({ tokens, cost, canUndo } = {}) {
    const cfg = loadSettings();
    this.el.footModel.textContent = getModel(cfg.model).label.split(" (")[0];
    if (typeof tokens === "number") this.el.footTokens.textContent = `${tokens.toLocaleString()} tok`;
    if (typeof cost === "number") this.el.footCost.textContent = `$${cost.toFixed(4)}`;
    if (typeof canUndo === "boolean") {
      this.root.querySelector('[data-act="undo"]').disabled = !canUndo;
    }
    if (!hasApiKey() && cfg.mode === "direct") {
      this.el.footModel.title = "No API key set — open settings";
    }
  }

  // --- composer -------------------------------------------------------------
  _submit() {
    const text = this.el.input.value.trim();
    if (!text || this.busy) return;
    this.el.input.value = "";
    this.h.onSend?.(text);
  }

  focusInput() { this.el.input?.focus(); }
}
