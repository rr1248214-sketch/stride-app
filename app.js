/* ==========================================================================
   Stride — Free Personal Step Counter
   app.js (part 1/6): storage, state, utilities, DOM references
   ========================================================================== */
'use strict';

/* ------------------------------ Storage layer ----------------------------- */
const KEYS = {
    settings: 'stride.settings.v1',
    days: 'stride.days.v1',
    sessions: 'stride.sessions.v1'
};

const DEFAULT_SETTINGS = {
    goal: 8000,
    strideCm: 75,
    units: 'km',          // 'km' | 'mi'
    theme: 'auto',        // 'light' | 'dark' | 'auto'
    sensitivity: 5,       // 1..10
    weightKg: 70
};

let storageHealthy = true;

function safeGet(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        console.error('Stride: read failed for', key, err);
        storageHealthy = false;
        return fallback;
    }
}

function safeSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.error('Stride: write failed for', key, err);
        storageHealthy = false;
        toast('Could not save data — storage may be full or blocked.');
        return false;
    }
}

/* -------------------------------- State ---------------------------------- */
const state = {
    settings: { ...DEFAULT_SETTINGS },
    days: {},     // { 'YYYY-MM-DD': { steps, distanceM, seconds, updatedAt } }
    sessions: [], // [{ start, end, steps, seconds }]
    tracking: 'idle', // 'idle' | 'active' | 'paused'
    session: null,    // { startAt, steps, seconds, baselineSteps }
    lastTickAt: null,
    __dayBefore: null
};

function loadState() {
    state.settings = { ...DEFAULT_SETTINGS, ...safeGet(KEYS.settings, {}) };
    const days = safeGet(KEYS.days, {});
    state.days = (days && typeof days === 'object' && !Array.isArray(days)) ? days : {};
    const sessions = safeGet(KEYS.sessions, []);
    state.sessions = Array.isArray(sessions) ? sessions : [];
}

function saveSettings() { safeSet(KEYS.settings, state.settings); }
function saveDays() { safeSet(KEYS.days, state.days); }
function saveSessions() { safeSet(KEYS.sessions, state.sessions.slice(-200)); }

/* ------------------------------- Dates ----------------------------------- */
function localDateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function todayKey() { return localDateKey(new Date()); }

function addDays(dateKey, delta) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    dt.setDate(dt.getDate() + delta);
    return localDateKey(dt);
}

function prettyDate(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function relativeDay(dateKey) {
    const t = todayKey();
    if (dateKey === t) return 'Today';
    if (dateKey === addDays(t, -1)) return 'Yesterday';
    return prettyDate(dateKey);
}

/* ------------------------- Numbers & formatting -------------------------- */
function fmtInt(n) { return Math.round(n || 0).toLocaleString(); }

function fmtDistance(meters) {
    if (state.settings.units === 'mi') {
        const mi = meters / 1609.344;
        return mi.toFixed(2) + ' mi';
    }
    const km = meters / 1000;
    if (km < 1) return Math.round(meters) + ' m';
    return km.toFixed(2) + ' km';
}

function metersFromSteps(steps) {
    return steps * (state.settings.strideCm / 100);
}

function fmtDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

function fmtMinutes(totalSeconds) {
    return Math.floor(totalSeconds / 60) + ' min';
}

/* ------------------------------- DOM refs -------------------------------- */
const $ = (id) => document.getElementById(id);

const el = {
    stepCount: $('stepCount'),
    distanceValue: $('distanceValue'),
    caloriesValue: $('caloriesValue'),
    activeValue: $('activeValue'),
    ringFill: $('ringFill'),
    goalPercent: $('goalPercent'),
    goalSub: $('goalSub'),
    stepsRemaining: $('stepsRemaining'),
    stepsDoneShort: $('stepsDoneShort'),
    celebrate: $('celebrate'),
    greetingText: $('greetingText'),
    greetingDate: $('greetingDate'),
    startBtn: $('startBtn'),
    pauseBtn: $('pauseBtn'),
    resumeBtn: $('resumeBtn'),
    stopBtn: $('stopBtn'),
    resetBtn: $('resetBtn'),
    activeControls: $('activeControls'),
    statusDot: $('statusDot'),
    statusText: $('statusText'),
    permissionBanner: $('permissionBanner'),
    permissionText: $('permissionText'),
    permBtn: $('permBtn'),
    weeklyChart: $('weeklyChart'),
    chartLabels: $('chartLabels'),
    historyList: $('historyList'),
    historyStats: $('historyStats'),
    viewAllBtn: $('viewAllBtn'),
    settingsBtn: $('settingsBtn'),
    settingsModal: $('settingsModal'),
    closeSettings: $('closeSettings'),
    goalInput: $('goalInput'),
    strideInput: $('strideInput'),
    unitKm: $('unitKm'),
    unitMi: $('unitMi'),
    themeLight: $('themeLight'),
    themeDark: $('themeDark'),
    themeAuto: $('themeAuto'),
    sensInput: $('sensInput'),
    sensLabel: $('sensLabel'),
    exportBtn: $('exportBtn'),
    resetDataBtn: $('resetDataBtn'),
    historyModal: $('historyModal'),
    closeHistory: $('closeHistory'),
    allStats: $('allStats'),
    dateLookup: $('dateLookup'),
    lookupResult: $('lookupResult'),
    historyTbody: $('historyTbody'),
    sessionModal: $('sessionModal'),
    closeSession: $('closeSession'),
    sessionStats: $('sessionStats'),
    sessionDone: $('sessionDone'),
    confirmModal: $('confirmModal'),
    confirmTitle: $('confirmTitle'),
    confirmMessage: $('confirmMessage'),
    confirmOk: $('confirmOk'),
    confirmCancel: $('confirmCancel'),
    toastWrap: $('toastWrap'),
    privacyBtn: $('privacyBtn'),
    diagToggle: $('diagToggle'),
    diagBody: $('diagBody'),
    diagSupport: $('diagSupport'),
    diagSecure: $('diagSecure'),
    diagPerm: $('diagPerm'),
    diagEvents: $('diagEvents'),
    diagRate: $('diagRate'),
    diagAccel: $('diagAccel'),
    diagPeaks: $('diagPeaks')
};

/* ==========================================================================
   app.js (part 2/6): theme, toasts, modals, confirm
   ========================================================================== */

/* -------------------------------- Theme ---------------------------------- */
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
    const mode = state.settings.theme;
    const dark = mode === 'dark' || (mode === 'auto' && mqDark.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b1116' : '#10b981');
    [el.themeLight, el.themeDark, el.themeAuto].forEach(b => b && b.classList.remove('active'));
    const active = mode === 'light' ? el.themeLight : mode === 'dark' ? el.themeDark : el.themeAuto;
    if (active) active.classList.add('active');
}

mqDark.addEventListener && mqDark.addEventListener('change', () => {
    if (state.settings.theme === 'auto') applyTheme();
});

/* -------------------------------- Toast ---------------------------------- */
let toastTimer = null;
function toast(msg) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = msg;
    el.toastWrap.appendChild(node);
    setTimeout(() => {
        node.style.transition = 'opacity .3s ease, transform .3s ease';
        node.style.opacity = '0';
        node.style.transform = 'translateY(12px)';
        setTimeout(() => node.remove(), 320);
    }, 2600);
}

/* -------------------------------- Modals --------------------------------- */
function openModal(node) {
    node.hidden = false;
    document.body.style.overflow = 'hidden';
}
function closeModal(node) {
    node.hidden = true;
    if ([el.settingsModal, el.historyModal, el.sessionModal, el.confirmModal]
        .every(m => m && m.hidden)) {
        document.body.style.overflow = '';
    }
}

let confirmResolver = null;
function askConfirm(title, message) {
    el.confirmTitle.textContent = title;
    el.confirmMessage.textContent = message;
    openModal(el.confirmModal);
    return new Promise((resolve) => { confirmResolver = resolve; });
}
function settleConfirm(value) {
    closeModal(el.confirmModal);
    if (confirmResolver) { confirmResolver(value); confirmResolver = null; }
}

/* --------------------------- Haptic feedback ----------------------------- */
function haptic(ms = 12) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
}

/* ==========================================================================
   app.js (part 3/6): motion sensor + step-detection engine
   --------------------------------------------------------------------------
   Honest note: browsers do NOT expose a guaranteed hardware pedometer.
   We read raw accelerometer data from DeviceMotionEvent and run our own
   peak-detection algorithm. Accuracy varies by phone and carrying position.
   ========================================================================== */

const Sensor = (function () {
    const hasDME = typeof window.DeviceMotionEvent !== 'undefined';
    const needsPermission = hasDME &&
        typeof window.DeviceMotionEvent.requestPermission === 'function';

    let listening = false;
    let permission = needsPermission ? 'prompt' : (hasDME ? 'granted' : 'unsupported');

    // ---- detection tuning (derived from the sensitivity setting) ----
    let cfg = tuneCfg(5);

    let handler = null;
    let onStepCb = null;
    let onDataCb = null;

    // ---- signal-processing state ----
    const MA_WINDOW = 6;          // moving-average smoothing length
    const HIST = 64;              // rolling window for adaptive threshold
    let maBuf = [];               // raw magnitude smoothing buffer
    let hist = [];                // smoothed magnitudes for mean/std
    let gravity = { x: 0, y: 0, z: 0, init: false };
    let above = false;            // hysteresis state
    let peakAmp = 0;              // max amplitude during current rise
    let lastStepAt = 0;
    let smoothVal = 0;

    // ---- diagnostics ----
    let eventCount = 0;
    let peakCount = 0;
    let rateStamps = [];
    let currentAccel = 0;

    function tuneCfg(sens) {
        const s = Math.min(10, Math.max(1, sens));
        const t = (s - 1) / 9; // 0 (strict) .. 1 (sensitive)
        return {
            // Threshold = mean + k*sd. A walking peak only rises ~1.4x the
            // signal's own sd, so k must stay comfortably below that or real
            // steps stop being detected. 0.85 (strict) .. 0.40 (sensitive).
            k: 0.85 - 0.45 * t,
            // Absolute floor (m/s^2) rejects sensor noise when the user is still.
            floor: 1.20 - 0.80 * t,
            // Refractory period: 400ms suits a steady walk, 280ms allows a jog
            // (~214 steps/min) while still stopping one movement counting twice.
            minInterval: 400 - 120 * t
        };
    }

    function setSensitivity(sens) { cfg = tuneCfg(sens); }

    function mean(arr) {
        if (!arr.length) return 0;
        let s = 0;
        for (let i = 0; i < arr.length; i++) s += arr[i];
        return s / arr.length;
    }
    function std(arr, m) {
        if (arr.length < 2) return 0;
        let s = 0;
        for (let i = 0; i < arr.length; i++) { const d = arr[i] - m; s += d * d; }
        return Math.sqrt(s / arr.length);
    }

    // ---- anti-shake gate ----
    // Human walking tops out near 3 Hz (180 steps/min). A phone being shaken
    // produces crossings far faster than that, so we measure the RAW crossing
    // rate (before the refractory period) and suppress counting while the
    // movement is faster than a person could walk.
    const CROSS_WINDOW = 2500;   // ms of history
    const MAX_CADENCE = 3.4;     // Hz - above this it is not walking
    let crossTimes = [];
    let shakeUntil = 0;

    function crossingIsShaking(ts) {
        crossTimes.push(ts);
        while (crossTimes.length && ts - crossTimes[0] > CROSS_WINDOW) crossTimes.shift();
        const rate = crossTimes.length / (CROSS_WINDOW / 1000);
        if (rate > MAX_CADENCE) shakeUntil = ts + 1500; // hold off ~1.5s
        return ts < shakeUntil;
    }

    function processReading(v, ts) {
        // 1. moving-average smoothing of the signed vertical signal
        maBuf.push(v);
        if (maBuf.length > MA_WINDOW) maBuf.shift();
        smoothVal = mean(maBuf);

        // 2. rolling history for an adaptive threshold
        hist.push(smoothVal);
        if (hist.length > HIST) hist.shift();

        const m = mean(hist);
        const sd = std(hist, m);
        const highThresh = Math.max(cfg.floor, m + cfg.k * sd);
        const lowThresh = m + (highThresh - m) * 0.35;

        // 3. hysteresis peak detection: one positive peak per step
        if (!above) {
            if (smoothVal > highThresh) {
                above = true;
                peakAmp = smoothVal;
            }
        } else {
            if (smoothVal > peakAmp) peakAmp = smoothVal;
            if (smoothVal < lowThresh) {
                above = false;
                const amp = peakAmp - m;
                const shaking = crossingIsShaking(ts);
                const dt = ts - lastStepAt;
                if (!shaking && amp >= cfg.floor * 0.9 && dt >= cfg.minInterval) {
                    lastStepAt = ts;
                    peakCount++;
                    if (onStepCb) onStepCb(ts);
                }
                peakAmp = 0;
            }
        }
    }

    function handleEvent(event) {
        eventCount++;
        rateStamps.push(performance.now());
        if (rateStamps.length > 40) rateStamps.shift();

        let lx, ly, lz;
        const a = event.acceleration;
        const g = event.accelerationIncludingGravity;

        // Track gravity with a slow EMA — it doubles as the "up" axis.
        if (g && g.x != null && g.y != null && g.z != null) {
            const alpha = 0.97;
            if (!gravity.init) { gravity = { x: g.x, y: g.y, z: g.z, init: true }; }
            else {
                gravity.x = alpha * gravity.x + (1 - alpha) * g.x;
                gravity.y = alpha * gravity.y + (1 - alpha) * g.y;
                gravity.z = alpha * gravity.z + (1 - alpha) * g.z;
            }
        }

        if (a && a.x != null && a.y != null && a.z != null) {
            // Best case: the browser already removed gravity for us.
            lx = a.x || 0; ly = a.y || 0; lz = a.z || 0;
        } else if (g && g.x != null && gravity.init) {
            // Fallback: high-pass filter the raw reading against the gravity estimate.
            lx = g.x - gravity.x; ly = g.y - gravity.y; lz = g.z - gravity.z;
        } else {
            return; // no usable axes on this event
        }

        // Project the linear acceleration onto the gravity axis. A single walking
        // cycle then yields ONE positive peak, instead of the two you get from the
        // magnitude of the raw vector (which is what double-counts steps).
        const gmag = Math.sqrt(gravity.x * gravity.x + gravity.y * gravity.y + gravity.z * gravity.z);
        let v;
        if (gmag > 4) {
            v = (lx * gravity.x + ly * gravity.y + lz * gravity.z) / gmag;
        } else {
            v = Math.sqrt(lx * lx + ly * ly + lz * lz); // fallback: unsigned magnitude
        }
        currentAccel = Math.abs(v);
        processReading(v, performance.now());
        if (onDataCb) onDataCb(diagnostics());
    }

    function diagnostics() {
        const now = performance.now();
        rateStamps = rateStamps.filter(t => now - t < 2000);
        const rate = rateStamps.length / 2;
        return {
            events: eventCount,
            rate: Math.round(rate * 10) / 10,
            accel: Math.round(currentAccel * 100) / 100,
            peaks: peakCount,
            permission
        };
    }

    function attach() {
        if (listening) return;
        handler = handleEvent;
        window.addEventListener('devicemotion', handler, { passive: true });
        listening = true;
    }

    function detach() {
        if (!listening) return;
        window.removeEventListener('devicemotion', handler);
        listening = false;
    }

    function requestPermission() {
        return new Promise((resolve) => {
            if (!hasDME) { permission = 'unsupported'; resolve('unsupported'); return; }
            if (!needsPermission) { permission = 'granted'; resolve('granted'); return; }
            window.DeviceMotionEvent.requestPermission()
                .then((res) => { permission = res; resolve(res); })
                .catch((err) => {
                    console.warn('Stride: permission request failed', err);
                    permission = 'denied';
                    resolve('denied');
                });
        });
    }

    function resetCounters() { eventCount = 0; peakCount = 0; rateStamps = []; crossTimes = []; shakeUntil = 0; }

    return {
        hasDME, needsPermission,
        get permission() { return permission; },
        set permission(v) { permission = v; },
        get listening() { return listening; },
        attach, detach, requestPermission, resetCounters,
        setSensitivity,
        get events() { return eventCount; },
        get peaks() { return peakCount; },
        onStep(fn) { onStepCb = fn; },
        onData(fn) { onDataCb = fn; },
        diagnostics
    };
})();

/* ==========================================================================
   app.js (part 4/6): day records, step recording, timers, rollover
   ========================================================================== */

/* ----------------------------- Day records ------------------------------- */
function blankDay() {
    return { steps: 0, distanceM: 0, seconds: 0, updatedAt: Date.now() };
}

function getDay(dateKey = todayKey()) {
    return state.days[dateKey] || null;
}

function ensureToday() {
    const key = todayKey();
    if (!state.days[key]) state.days[key] = blankDay();
    return state.days[key];
}

function daySteps(dateKey) {
    const d = state.days[dateKey];
    return d ? (d.steps || 0) : 0;
}

let savePending = false;
function scheduleSave() {
    if (savePending) return;
    savePending = true;
    setTimeout(() => { savePending = false; saveDays(); }, 900);
}

/* --------------------------- Step bookkeeping ---------------------------- */
let lastStepAt = 0;
let goalAnnounced = false;

function onStepDetected(ts) {
    if (state.tracking !== 'active') return;

    // Guard against sensor double-fire (engine already throttles; belt & braces).
    if (ts - lastStepAt < 120) return;
    lastStepAt = ts;

    maybeRollover();

    const day = ensureToday();
    day.steps += 1;
    day.distanceM = metersFromSteps(day.steps);
    day.updatedAt = Date.now();

    if (state.session) state.session.steps += 1;

    scheduleSave();
    renderDashboard();
    if (state.session) renderSessionLive();
}

/* -------------------------- Midnight rollover ---------------------------- */
function maybeRollover() {
    if (state.__dayBefore && state.__dayBefore !== todayKey()) {
        saveDays();
        goalAnnounced = false;
        el.celebrate.hidden = true;
        // A session spanning midnight keeps running; the new day simply starts fresh.
        renderDashboard();
        renderHistory();
    }
    state.__dayBefore = todayKey();
}

/* ------------------------------ Timers ----------------------------------- */
let tickTimer = null;

function startTick() {
    if (tickTimer) return;
    let last = performance.now();
    tickTimer = setInterval(() => {
        const now = performance.now();
        const delta = (now - last) / 1000;
        last = now;

        if (state.tracking === 'active') {
            const day = ensureToday();
            day.seconds += delta;
            if (state.session) state.session.seconds += delta;
            el.activeValue.textContent = fmtMinutes(day.seconds);
            if (state.session) renderSessionLive();
        }
        maybeRollover();
        if (state.diagnosticsOn) renderDiagnostics();
    }, 1000);
}

function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
}

/* ==========================================================================
   app.js (part 5/6): rendering — dashboard, ring, chart, history, diagnostics
   ========================================================================== */

const RING_CIRCUMFERENCE = 2 * Math.PI * 88; // r=88 -> ~552.92

/* --------------------------- Greeting header ----------------------------- */
function greetingForHour(h) {
    if (h < 5) return 'Still up?';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

function renderGreeting() {
    const now = new Date();
    el.greetingText.textContent = greetingForHour(now.getHours());
    el.greetingDate.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'long'
    });
}

/* ------------------------------ Calories --------------------------------- */
function estimateCalories(steps) {
    // Rough, responsible estimate: ~0.04 kcal per step scaled by body weight.
    const kcal = steps * 0.04 * (state.settings.weightKg / 70);
    return Math.round(kcal);
}

/* ---------------------------- Main dashboard ----------------------------- */
function renderDashboard() {
    const day = ensureToday();
    const steps = day.steps || 0;
    const goal = Math.max(1, state.settings.goal);

    el.stepCount.textContent = fmtInt(steps);
    el.distanceValue.textContent = fmtDistance(day.distanceM || 0);
    el.caloriesValue.textContent = fmtInt(estimateCalories(steps)) + ' kcal';
    el.activeValue.textContent = fmtMinutes(day.seconds || 0);

    // Goal ring
    const ratio = Math.min(1, steps / goal);
    const pct = Math.round((steps / goal) * 100);
    el.ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));
    el.goalPercent.textContent = pct + '%';
    el.goalSub.textContent = ratio >= 1 ? 'goal reached' : 'of goal';
    el.stepsRemaining.textContent = fmtInt(Math.max(0, goal - steps));
    el.stepsDoneShort.textContent = fmtInt(steps);

    // Celebration (once per day)
    if (steps >= goal && !goalAnnounced) {
        goalAnnounced = true;
        el.celebrate.hidden = false;
        haptic(30);
        setTimeout(() => { el.celebrate.hidden = true; }, 4200);
    }
    if (steps < goal) goalAnnounced = false;
}

/* ------------------------------- Chart ----------------------------------- */
function renderChart() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const key = addDays(todayKey(), -i);
        days.push({ key, steps: daySteps(key) });
    }
    const max = Math.max(state.settings.goal, ...days.map(d => d.steps), 1);
    const W = 340, H = 150, gap = 8;
    const n = days.length;
    const barW = (W - gap * (n + 1)) / n;

    let svg = '';
    const baselineY = H - 22;
    const usable = baselineY - 8;

    days.forEach((d, i) => {
        const x = gap + i * (barW + gap);
        const h = Math.max(3, (d.steps / max) * usable);
        const y = baselineY - h;
        const isToday = d.key === todayKey();
        const met = d.steps >= state.settings.goal && d.steps > 0;
        const cls = ['chart-bar', isToday ? 'today' : '', met ? 'goal-met' : ''].join(' ').trim();
        svg += `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="5"></rect>`;
    });

    // Goal reference line
    const goalY = baselineY - (state.settings.goal / max) * usable;
    svg += `<line x1="4" y1="${goalY.toFixed(1)}" x2="${W - 4}" y2="${goalY.toFixed(1)}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.25"></line>`;
    svg += `<line x1="4" y1="${baselineY}" x2="${W - 4}" y2="${baselineY}" stroke="currentColor" stroke-width="1" opacity="0.12"></line>`;

    el.weeklyChart.innerHTML = svg;

    el.chartLabels.innerHTML = days.map(d => {
        const isToday = d.key === todayKey();
        const label = new Date(d.key + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
        return `<span class="chart-label${isToday ? ' today' : ''}">${label}</span>`;
    }).join('');
}

/* ------------------------------ History ---------------------------------- */
function recentDays(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
        const key = addDays(todayKey(), -i);
        out.push({ key, steps: daySteps(key) });
    }
    return out;
}

function renderHistory() {
    const rows = recentDays(7);
    el.historyList.innerHTML = rows.map(r => {
        const met = r.steps >= state.settings.goal && r.steps > 0;
        const dist = r.steps ? fmtDistance(metersFromSteps(r.steps)) : '—';
        return `<div class="history-row">
            <div>
                <div class="hr-date">${relativeDay(r.key)}</div>
                <div class="hr-sub">${dist}</div>
            </div>
            <div class="hr-steps${met ? ' met' : ''}">${fmtInt(r.steps)}</div>
        </div>`;
    }).join('');

    const stats = historyStats();
    el.historyStats.innerHTML = `
        <div class="stat-cell"><div class="stat-num">${fmtInt(stats.best)}</div><div class="stat-cap">Best day</div></div>
        <div class="stat-cell"><div class="stat-num">${fmtInt(stats.avg)}</div><div class="stat-cap">Daily avg</div></div>
        <div class="stat-cell"><div class="stat-num">${fmtInt(stats.total)}</div><div class="stat-cap">Total</div></div>`;
}

function historyStats() {
    const entries = Object.keys(state.days).sort().map(k => ({ key: k, steps: daySteps(k) }));
    const withSteps = entries.filter(e => e.steps > 0);
    const total = entries.reduce((s, e) => s + e.steps, 0);
    const best = entries.reduce((m, e) => Math.max(m, e.steps), 0);
    const avg = withSteps.length ? Math.round(total / withSteps.length) : 0;
    return { total, best, avg, days: entries.length };
}

/* ----------------------- All-history modal content ------------------------ */
function renderAllHistory() {
    const entries = Object.keys(state.days).sort().reverse();
    const stats = historyStats();

    el.allStats.innerHTML = `
        <div class="stat-box"><div class="stat-num">${fmtInt(stats.total)}</div><div class="stat-cap">Total steps</div></div>
        <div class="stat-box"><div class="stat-num">${fmtInt(stats.best)}</div><div class="stat-cap">Best day</div></div>
        <div class="stat-box"><div class="stat-num">${fmtInt(stats.avg)}</div><div class="stat-cap">Daily average</div></div>
        <div class="stat-box"><div class="stat-num">${fmtInt(stats.days)}</div><div class="stat-cap">Days recorded</div></div>`;

    if (!entries.length) {
        el.historyTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-faint)">No records yet.</td></tr>`;
        return;
    }

    el.historyTbody.innerHTML = entries.map(key => {
        const d = state.days[key];
        const met = d.steps >= state.settings.goal && d.steps > 0;
        return `<tr>
            <td>${prettyDate(key)}</td>
            <td>${fmtInt(d.steps)}</td>
            <td>${fmtDistance(d.distanceM || metersFromSteps(d.steps))}</td>
            <td class="${met ? 'met' : ''}">${met ? 'Yes' : '—'}</td>
        </tr>`;
    }).join('');

    // Pre-fill the date lookup with the most recent record.
    if (entries.length && !el.dateLookup.value) el.dateLookup.value = entries[0];
}

/* --------------------------- Date lookup --------------------------------- */
function renderLookup(dateKey) {
    if (!dateKey) { el.lookupResult.textContent = ''; return; }
    const d = state.days[dateKey];
    if (!d) {
        el.lookupResult.textContent = `${prettyDate(dateKey)} — no steps recorded`;
    } else {
        el.lookupResult.textContent =
            `${prettyDate(dateKey)} — ${fmtInt(d.steps)} steps · ${fmtDistance(d.distanceM || 0)}`;
    }
}

/* --------------------------- Live session view ---------------------------- */
function renderSessionLive() {
    if (!state.session) return;
    el.activeValue.textContent = fmtMinutes(ensureToday().seconds || 0);
}

/* --------------------------- Diagnostics view ---------------------------- */
function renderDiagnostics() {
    const d = Sensor.diagnostics();
    el.diagSupport.textContent = Sensor.hasDME ? 'Supported' : 'Not supported';
    el.diagSupport.className = 'diag-val ' + (Sensor.hasDME ? 'ok' : 'bad');
    const secure = window.isSecureContext;
    el.diagSecure.textContent = secure ? 'Yes' : 'No (needs HTTPS)';
    el.diagSecure.className = 'diag-val ' + (secure ? 'ok' : 'bad');
    const perm = Sensor.permission;
    el.diagPerm.textContent = perm;
    el.diagPerm.className = 'diag-val ' + (perm === 'granted' ? 'ok' : perm === 'denied' ? 'bad' : '');
    el.diagEvents.textContent = fmtInt(d.events);
    el.diagRate.textContent = d.rate + ' Hz';
    el.diagAccel.textContent = d.accel.toFixed(2) + ' g';
    el.diagPeaks.textContent = fmtInt(d.peaks);
    el.diagPeaks.className = 'diag-val';
}

/* --------------------------- Full re-render ------------------------------ */
function renderAll() {
    renderGreeting();
    renderDashboard();
    renderChart();
    renderHistory();
}

/* ==========================================================================
   app.js (part 6/6): controls, sessions, settings, export, init
   ========================================================================== */

state.diagnosticsOn = false;

/* ------------------------------- Status ---------------------------------- */
function setStatus(kind, text) {
    el.statusDot.className = 'status-dot' + (kind === 'live' ? ' live' : kind === 'paused' ? ' paused' : '');
    el.statusText.textContent = text;
}

function showTrackingControls(active) {
    el.startBtn.hidden = active;
    el.activeControls.hidden = !active;
    el.pauseBtn.hidden = !active || state.tracking === 'paused';
    el.resumeBtn.hidden = !active || state.tracking !== 'paused';
}

/* ------------------------------ Tracking --------------------------------- */
async function startTracking() {
    if (state.tracking !== 'idle') return;

    if (!Sensor.hasDME) {
        toast('This device/browser does not expose motion sensors.');
        return;
    }

    // iOS requires the permission request to happen inside a user gesture.
    if (Sensor.needsPermission && Sensor.permission !== 'granted') {
        const res = await Sensor.requestPermission();
        if (res !== 'granted') {
            el.permissionBanner.hidden = false;
            el.permissionText.textContent =
                'Motion access was blocked. Open Settings → Safari → Motion & Orientation Access and enable it, then reload the page and tap Start again.';
            setStatus('idle', 'Motion permission denied');
            return;
        }
    }

    Sensor.setSensitivity(state.settings.sensitivity);
    Sensor.attach();
    startTick();

    state.tracking = 'active';
    state.session = {
        startAt: Date.now(),
        steps: 0,
        seconds: 0,
        baselineSteps: ensureToday().steps
    };

    el.permissionBanner.hidden = true;
    setStatus('live', 'Tracking — keep this screen open');
    showTrackingControls(true);
    haptic(20);
    toast('Tracking started');
}

function pauseTracking() {
    if (state.tracking !== 'active') return;
    state.tracking = 'paused';
    suspendSensors();
    setStatus('paused', 'Paused');
    showTrackingControls(true);
}

function resumeTracking() {
    if (state.tracking !== 'paused') return;
    state.tracking = 'active';
    Sensor.attach();
    startTick();
    setStatus('live', 'Tracking — keep this screen open');
    showTrackingControls(true);
}

function stopTracking() {
    if (state.tracking === 'idle') return;
    const summary = finishSession();
    state.tracking = 'idle';
    suspendSensors();
    stopTick();
    saveDays();
    setStatus('idle', 'Stopped');
    showTrackingControls(false);
    renderDashboard();
    renderHistory();
    renderChart();
    if (summary && summary.steps > 0) showSessionSummary(summary);
}

function suspendSensors() { Sensor.detach(); }

function finishSession() {
    if (!state.session) return null;
    const s = state.session;
    const summary = {
        start: s.startAt,
        end: Date.now(),
        steps: s.steps,
        seconds: Math.round(s.seconds),
        distanceM: metersFromSteps(s.steps)
    };
    state.sessions.push(summary);
    saveSessions();
    state.session = null;
    return summary;
}

/* --------------------------- Session summary ----------------------------- */
function showSessionSummary(s) {
    const startTime = new Date(s.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(s.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const pace = s.seconds > 60 ? Math.round((s.steps / s.seconds) * 60) : 0;
    el.sessionStats.innerHTML = `
        <div class="stat-box"><div class="stat-num">${fmtInt(s.steps)}</div><div class="stat-cap">Steps</div></div>
        <div class="stat-box"><div class="stat-num">${fmtDuration(s.seconds)}</div><div class="stat-cap">Duration</div></div>
        <div class="stat-box"><div class="stat-num">${fmtDistance(s.distanceM)}</div><div class="stat-cap">Distance</div></div>
        <div class="stat-box"><div class="stat-num">${pace}</div><div class="stat-cap">Steps / min</div></div>
        <div class="stat-box"><div class="stat-num">${startTime}</div><div class="stat-cap">Started</div></div>
        <div class="stat-box"><div class="stat-num">${endTime}</div><div class="stat-cap">Ended</div></div>`;
    openModal(el.sessionModal);
}

/* ------------------------------- Reset today ------------------------------ */
async function resetToday() {
    const ok = await askConfirm(
        'Reset today\'s count?',
        'This sets today\'s step count back to zero. Your other days stay saved.'
    );
    if (!ok) return;
    state.days[todayKey()] = blankDay();
    goalAnnounced = false;
    el.celebrate.hidden = true;
    saveDays();
    renderDashboard();
    renderHistory();
    renderChart();
    toast('Today\'s count reset');
}

/* ------------------------------- Settings -------------------------------- */
function syncSettingsUI() {
    el.goalInput.value = state.settings.goal;
    el.strideInput.value = state.settings.strideCm;
    el.sensInput.value = state.settings.sensitivity;
    el.sensLabel.textContent = sensName(state.settings.sensitivity);
    el.unitKm.classList.toggle('active', state.settings.units === 'km');
    el.unitMi.classList.toggle('active', state.settings.units === 'mi');
    applyTheme();
}

function sensName(v) {
    const n = Number(v);
    if (n <= 3) return 'Strict';
    if (n <= 6) return 'Medium';
    if (n <= 8) return 'High';
    return 'Very high';
}

function applySettingsFromInputs() {
    const goal = Math.min(200000, Math.max(100, parseInt(el.goalInput.value, 10) || 8000));
    const stride = Math.min(150, Math.max(30, parseInt(el.strideInput.value, 10) || 75));
    const sens = Math.min(10, Math.max(1, parseInt(el.sensInput.value, 10) || 5));

    state.settings.goal = goal;
    state.settings.strideCm = stride;
    state.settings.sensitivity = sens;

    el.goalInput.value = goal;
    el.strideInput.value = stride;
    el.sensLabel.textContent = sensName(sens);

    saveSettings();
    Sensor.setSensitivity(sens);
    renderDashboard();
    renderChart();
    renderHistory();
}

/* ------------------------------- CSV export ------------------------------ */
function exportCSV() {
    const keys = Object.keys(state.days).sort();
    if (!keys.length) { toast('No data to export yet.'); return; }

    const unit = state.settings.units;
    const distHeader = unit === 'mi' ? 'Distance_mi' : 'Distance_km';
    const rows = [['Date', 'Steps', distHeader, 'Active_seconds', 'Goal_met']];

    keys.forEach(k => {
        const d = state.days[k];
        const meters = d.distanceM || metersFromSteps(d.steps);
        const dist = unit === 'mi'
            ? (meters / 1609.344).toFixed(3)
            : (meters / 1000).toFixed(3);
        rows.push([
            k,
            d.steps,
            dist,
            Math.round(d.seconds || 0),
            d.steps >= state.settings.goal ? 'yes' : 'no'
        ]);
    });

    const csv = rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = todayKey();
    a.href = url;
    a.download = `stride-history-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Exported ' + keys.length + ' days');
}

/* ------------------------------- Wipe data ------------------------------- */
async function eraseAll() {
    const ok = await askConfirm(
        'Erase all data?',
        'This permanently deletes every saved day and session on this device. It cannot be undone. Export a CSV first if you want a backup.'
    );
    if (!ok) return;
    try {
        localStorage.removeItem(KEYS.days);
        localStorage.removeItem(KEYS.sessions);
    } catch (e) { /* ignore */ }
    state.days = {};
    state.sessions = [];
    state.session = null;
    goalAnnounced = false;
    saveDays();
    renderAll();
    toast('All data erased');
}

/* ==========================================================================
   app.js (part 7/7): event wiring + initialisation
   ========================================================================== */

function wireEvents() {
    // --- controls ---
    el.startBtn.addEventListener('click', startTracking);
    el.pauseBtn.addEventListener('click', pauseTracking);
    el.resumeBtn.addEventListener('click', resumeTracking);
    el.stopBtn.addEventListener('click', stopTracking);
    el.resetBtn.addEventListener('click', resetToday);

    // --- settings ---
    el.settingsBtn.addEventListener('click', () => { syncSettingsUI(); openModal(el.settingsModal); });
    el.closeSettings.addEventListener('click', () => closeModal(el.settingsModal));
    el.goalInput.addEventListener('change', applySettingsFromInputs);
    el.strideInput.addEventListener('change', applySettingsFromInputs);
    el.sensInput.addEventListener('input', () => { el.sensLabel.textContent = sensName(el.sensInput.value); });
    el.sensInput.addEventListener('change', applySettingsFromInputs);

    el.unitKm.addEventListener('click', () => {
        state.settings.units = 'km'; saveSettings(); syncSettingsUI(); renderDashboard(); renderHistory();
    });
    el.unitMi.addEventListener('click', () => {
        state.settings.units = 'mi'; saveSettings(); syncSettingsUI(); renderDashboard(); renderHistory();
    });

    el.themeLight.addEventListener('click', () => { state.settings.theme = 'light'; saveSettings(); applyTheme(); });
    el.themeDark.addEventListener('click', () => { state.settings.theme = 'dark'; saveSettings(); applyTheme(); });
    el.themeAuto.addEventListener('click', () => { state.settings.theme = 'auto'; saveSettings(); applyTheme(); });

    el.exportBtn.addEventListener('click', exportCSV);
    el.resetDataBtn.addEventListener('click', eraseAll);

    // --- history ---
    el.viewAllBtn.addEventListener('click', () => { renderAllHistory(); openModal(el.historyModal); });
    el.closeHistory.addEventListener('click', () => closeModal(el.historyModal));
    el.dateLookup.addEventListener('change', () => renderLookup(el.dateLookup.value));

    // --- session summary ---
    el.sessionDone.addEventListener('click', () => closeModal(el.sessionModal));
    el.closeSession.addEventListener('click', () => closeModal(el.sessionModal));

    // --- confirm ---
    el.confirmOk.addEventListener('click', () => settleConfirm(true));
    el.confirmCancel.addEventListener('click', () => settleConfirm(false));

    // --- privacy ---
    el.privacyBtn.addEventListener('click', () => {
        askConfirm('Privacy',
            'Stride keeps every step, session and setting in this browser\u2019s localStorage. Nothing is uploaded, there is no account and no analytics. Clearing site data, private browsing or a new device starts from zero.');
    });

    // --- diagnostics ---
    el.diagToggle.addEventListener('click', () => {
        state.diagnosticsOn = !state.diagnosticsOn;
        el.diagBody.hidden = !state.diagnosticsOn;
        el.diagToggle.textContent = state.diagnosticsOn ? 'Hide' : 'Show';
        if (state.diagnosticsOn) renderDiagnostics();
    });

    // --- overlay click to dismiss (ignored for confirm) ---
    [el.settingsModal, el.historyModal, el.sessionModal].forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay); });
    });

    // --- permission banner button ---
    el.permBtn.addEventListener('click', startTracking);

    // --- tab visibility: browsers suspend sensors in the background ---
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state.tracking === 'active') {
            toast('Screen hidden — step counting pauses until this page is visible again.');
        }
        if (!document.hidden) { renderAll(); maybeRollover(); }
    });

    // --- keep the greeting fresh ---
    setInterval(renderGreeting, 60000);
}

/* ------------------------------ Sensors -> UI ---------------------------- */
function wireSensor() {
    Sensor.onStep(onStepDetected);
    Sensor.onData(() => { if (state.diagnosticsOn) renderDiagnostics(); });
}

/* --------------------------------- Init ---------------------------------- */
function init() {
    loadState();
    state.__dayBefore = todayKey();

    // The self-test page loads this file too. If the dashboard markup isn't
    // present, expose the core modules instead of trying to wire up the UI.
    if (!document.getElementById('stepCount')) {
        window.StrideCore = {
            state, Sensor, todayKey, addDays, localDateKey, relativeDay, prettyDate,
            fmtDistance, fmtDuration, fmtInt, metersFromSteps, historyStats,
            saveDays, saveSettings, loadState, DEFAULT_SETTINGS, KEYS
        };
        console.log('Stride: core modules exposed as window.StrideCore (no dashboard on this page).');
        return;
    }

    wireEvents();
    wireSensor();

    syncSettingsUI();
    ensureToday();
    renderAll();
    renderDashboard();
    renderChart();
    renderHistory();
    showTrackingControls(false);
    setStatus('idle', 'Ready');

    if (!Sensor.hasDME) {
        el.permissionBanner.hidden = false;
        el.permissionText.textContent =
            'This browser does not support the motion sensor API. Stride still records anything you add manually, but automatic step detection will not run here. On iPhone it works in Safari (and only over HTTPS).';
        el.permBtn.hidden = true;
    } else if (!window.isSecureContext) {
        el.permissionBanner.hidden = false;
        el.permissionText.textContent =
            'Motion sensors need a secure (HTTPS) page. Open the site over https:// and it will work.';
        el.permBtn.hidden = true;
    }

    if (el.goalInput.value === '') el.goalInput.value = DEFAULT_SETTINGS.goal;

    if (!storageHealthy) {
        toast('Local storage is unavailable — data will not be saved.');
    }

    console.log('Stride ready. DeviceMotion:', Sensor.hasDME,
        '| needsPermission:', Sensor.needsPermission,
        '| secureContext:', window.isSecureContext);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
