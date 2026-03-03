/* ============================================================
   Kitchen Buddy — popup.js
   Pure vanilla JS. No external deps. Chrome Manifest V3.
   ============================================================ */

(function () {
  'use strict';

  // ─── Shared Utility ──────────────────────────────────────

  /** Generate a short unique ID */
  const uid = () => Math.random().toString(36).slice(2, 9);

  /** Pad number to 2 digits */
  const pad = (n) => String(n).padStart(2, '0');

  /** Format seconds → HH:MM:SS */
  const fmtTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // ─── Audio Alert (generated via AudioContext) ────────────

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      // 3-beep pattern
      const now = ctx.currentTime;
      playBeep(880, now, 0.15);
      playBeep(880, now + 0.2, 0.15);
      playBeep(1100, now + 0.4, 0.25);
    } catch (_) { /* Audio not available — silent fallback */ }
  };

  // ─── Storage Helper ──────────────────────────────────────

  const storage = {
    get: (key) => new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    }),
    set: (key, value) => new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    }),
  };

  // ═══════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════

  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.tab-content');

  const switchTab = (tabName) => {
    tabs.forEach((t) => {
      const isActive = t.dataset.tab === tabName;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive);
    });
    sections.forEach((s) => {
      s.classList.toggle('active', s.id === `tab-${tabName}`);
    });
    storage.set('activeTab', tabName);
  };

  tabs.forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  // Restore last-active tab
  storage.get('activeTab').then((tab) => { if (tab) switchTab(tab); });

  // ═══════════════════════════════════════════════════════════
  // 1) TIMER
  // ═══════════════════════════════════════════════════════════

  const timerListEl = document.getElementById('timerList');
  const addTimerBtn = document.getElementById('addTimerBtn');
  const timerNameEl = document.getElementById('timerName');
  const timerHEl = document.getElementById('timerH');
  const timerMEl = document.getElementById('timerM');
  const timerSEl = document.getElementById('timerS');

  /** @type {Map<string, {remaining:number, total:number, name:string, running:boolean, interval:number|null, done:boolean}>} */
  const timers = new Map();

  /** SVG icon strings */
  const ICON = {
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>',
    pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    reset: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>',
  };

  const renderTimers = () => {
    if (timers.size === 0) {
      timerListEl.innerHTML = '<p class="empty-state">No timers yet — add one above!</p>';
      return;
    }
    timerListEl.innerHTML = '';
    timers.forEach((t, id) => {
      const card = document.createElement('div');
      card.className = `timer-card${t.done ? ' done' : ''}`;
      card.dataset.id = id;

      card.innerHTML = `
        <div class="timer-info">
          <div class="timer-label">${escapeHtml(t.name)}</div>
          <div class="timer-display">${fmtTime(t.remaining)}</div>
        </div>
        <div class="timer-controls">
          <button class="btn-icon toggle" title="${t.running ? 'Pause' : 'Start'}">${t.running ? ICON.pause : ICON.play}</button>
          <button class="btn-icon rst" title="Reset">${ICON.reset}</button>
          <button class="btn-icon delete" title="Delete">${ICON.trash}</button>
        </div>
      `;

      card.querySelector('.toggle').addEventListener('click', () => toggleTimer(id));
      card.querySelector('.rst').addEventListener('click', () => resetTimer(id));
      card.querySelector('.delete').addEventListener('click', () => deleteTimer(id));

      timerListEl.appendChild(card);
    });
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const updateTimerDisplay = (id) => {
    const card = timerListEl.querySelector(`.timer-card[data-id="${id}"]`);
    if (!card) return;
    const t = timers.get(id);
    card.querySelector('.timer-display').textContent = fmtTime(t.remaining);
    if (t.done) card.classList.add('done');
  };

  const tickTimer = (id) => {
    const t = timers.get(id);
    if (!t || !t.running) return;
    t.remaining--;
    if (t.remaining <= 0) {
      t.remaining = 0;
      t.running = false;
      t.done = true;
      clearInterval(t.interval);
      t.interval = null;
      playAlert();
    }
    updateTimerDisplay(id);
    saveTimers();
  };

  const toggleTimer = (id) => {
    const t = timers.get(id);
    if (!t || t.done) return;
    if (t.running) {
      t.running = false;
      clearInterval(t.interval);
      t.interval = null;
    } else {
      if (t.remaining <= 0) return;
      t.running = true;
      t.interval = setInterval(() => tickTimer(id), 1000);
    }
    renderTimers();
    saveTimers();
  };

  const resetTimer = (id) => {
    const t = timers.get(id);
    if (!t) return;
    clearInterval(t.interval);
    t.interval = null;
    t.remaining = t.total;
    t.running = false;
    t.done = false;
    renderTimers();
    saveTimers();
  };

  const deleteTimer = (id) => {
    const t = timers.get(id);
    if (t) {
      clearInterval(t.interval);
    }
    timers.delete(id);
    renderTimers();
    saveTimers();
  };

  const addTimer = () => {
    const name = timerNameEl.value.trim() || 'Timer';
    const h = Math.max(0, parseInt(timerHEl.value, 10) || 0);
    const m = Math.max(0, parseInt(timerMEl.value, 10) || 0);
    const s = Math.max(0, parseInt(timerSEl.value, 10) || 0);
    const total = h * 3600 + m * 60 + s;
    if (total <= 0) return;

    const id = uid();
    timers.set(id, { name, total, remaining: total, running: false, interval: null, done: false });
    timerNameEl.value = '';
    renderTimers();
    saveTimers();
  };

  addTimerBtn.addEventListener('click', addTimer);
  timerNameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTimer(); });

  /** Persist timer state (without interval refs) */
  const saveTimers = () => {
    const data = [];
    timers.forEach((t, id) => {
      data.push({ id, name: t.name, total: t.total, remaining: t.remaining, running: t.running, done: t.done });
    });
    storage.set('timers', data);
  };

  /** Restore timers from storage */
  const loadTimers = async () => {
    const data = await storage.get('timers');
    if (!Array.isArray(data)) return;
    data.forEach((t) => {
      timers.set(t.id, {
        name: t.name,
        total: t.total,
        remaining: t.remaining,
        running: false, // always paused on reload (popup closed = intervals stop)
        interval: null,
        done: t.done || false,
      });
    });
    renderTimers();
  };

  // ═══════════════════════════════════════════════════════════
  // 2) UNIT CONVERTER
  // ═══════════════════════════════════════════════════════════

  const convFromEl = document.getElementById('convFrom');
  const convToEl = document.getElementById('convTo');
  const convFromUnitEl = document.getElementById('convFromUnit');
  const convToUnitEl = document.getElementById('convToUnit');
  const swapBtn = document.getElementById('swapBtn');

  /**
   * Conversion tables.
   * Volume → base: millilitres (ml)
   * Weight → base: grams (g)
   * Temperature handled separately.
   */
  const UNIT_GROUP = {
    cup: 'volume', ml: 'volume', l: 'volume', tbsp: 'volume', tsp: 'volume', floz: 'volume', qt: 'volume', gal: 'volume',
    g: 'weight', kg: 'weight', oz: 'weight', lb: 'weight',
    f: 'temp', c: 'temp',
  };

  /** To-base multipliers */
  const TO_BASE = {
    // Volume → ml
    ml: 1, cup: 236.588, l: 1000, tbsp: 14.787, tsp: 4.929, floz: 29.574, qt: 946.353, gal: 3785.41,
    // Weight → g
    g: 1, kg: 1000, oz: 28.3495, lb: 453.592,
  };

  const convert = () => {
    const from = convFromUnitEl.value;
    const to = convToUnitEl.value;
    const val = parseFloat(convFromEl.value);

    if (isNaN(val)) { convToEl.value = ''; return; }

    const gFrom = UNIT_GROUP[from];
    const gTo = UNIT_GROUP[to];

    // Incompatible groups
    if (gFrom !== gTo) {
      convToEl.value = '—';
      return;
    }

    let result;
    if (gFrom === 'temp') {
      if (from === to) {
        result = val;
      } else if (from === 'f') {
        result = (val - 32) * 5 / 9;
      } else {
        result = val * 9 / 5 + 32;
      }
    } else {
      const baseVal = val * TO_BASE[from];
      result = baseVal / TO_BASE[to];
    }

    convToEl.value = Number.isInteger(result) ? result : result.toFixed(4).replace(/\.?0+$/, '');
  };

  convFromEl.addEventListener('input', convert);
  convFromUnitEl.addEventListener('change', convert);
  convToUnitEl.addEventListener('change', convert);

  swapBtn.addEventListener('click', () => {
    const tmpUnit = convFromUnitEl.value;
    convFromUnitEl.value = convToUnitEl.value;
    convToUnitEl.value = tmpUnit;
    // Also swap values
    const tmpVal = convFromEl.value;
    convFromEl.value = convToEl.value;
    convert();
  });

  // Initial conversion
  convert();

  // ═══════════════════════════════════════════════════════════
  // 3) GROCERY CHECKLIST
  // ═══════════════════════════════════════════════════════════

  const itemInput = document.getElementById('itemInput');
  const addItemBtn = document.getElementById('addItemBtn');
  const checklistItemsEl = document.getElementById('checklistItems');
  const checklistActionsEl = document.getElementById('checklistActions');
  const clearCheckedBtn = document.getElementById('clearCheckedBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  /** @type {{ id: string, text: string, checked: boolean }[]} */
  let groceryItems = [];

  const renderChecklist = () => {
    if (groceryItems.length === 0) {
      checklistItemsEl.innerHTML = '<p class="empty-state">Your grocery list is empty!</p>';
      checklistActionsEl.style.display = 'none';
      return;
    }

    checklistActionsEl.style.display = 'flex';
    checklistItemsEl.innerHTML = '';

    // Unchecked first, then checked
    const sorted = [...groceryItems].sort((a, b) => a.checked - b.checked);

    sorted.forEach((item) => {
      const row = document.createElement('div');
      row.className = `checklist-item${item.checked ? ' checked' : ''}`;

      row.innerHTML = `
        <div class="check-box${item.checked ? ' checked' : ''}" data-id="${item.id}">
          ${ICON.check}
        </div>
        <span class="item-text">${escapeHtml(item.text)}</span>
        <button class="btn-icon item-delete" data-id="${item.id}" title="Delete">${ICON.trash}</button>
      `;

      row.querySelector('.check-box').addEventListener('click', () => toggleItem(item.id));
      row.querySelector('.item-delete').addEventListener('click', () => deleteItem(item.id));

      checklistItemsEl.appendChild(row);
    });
  };

  const addItem = () => {
    const text = itemInput.value.trim();
    if (!text) return;
    groceryItems.push({ id: uid(), text, checked: false });
    itemInput.value = '';
    renderChecklist();
    saveChecklist();
    itemInput.focus();
  };

  const toggleItem = (id) => {
    const item = groceryItems.find((i) => i.id === id);
    if (item) item.checked = !item.checked;
    renderChecklist();
    saveChecklist();
  };

  const deleteItem = (id) => {
    groceryItems = groceryItems.filter((i) => i.id !== id);
    renderChecklist();
    saveChecklist();
  };

  addItemBtn.addEventListener('click', addItem);
  itemInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });

  clearCheckedBtn.addEventListener('click', () => {
    groceryItems = groceryItems.filter((i) => !i.checked);
    renderChecklist();
    saveChecklist();
  });

  clearAllBtn.addEventListener('click', () => {
    groceryItems = [];
    renderChecklist();
    saveChecklist();
  });

  const saveChecklist = () => storage.set('groceryItems', groceryItems);

  const loadChecklist = async () => {
    const data = await storage.get('groceryItems');
    if (Array.isArray(data)) groceryItems = data;
    renderChecklist();
  };

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════

  loadTimers();
  loadChecklist();

})();
