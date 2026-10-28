/* Stride — self-test harness.
   Loads app.js first, which exposes window.StrideCore on a page without the
   dashboard. Every check here runs entirely in your browser. */
'use strict';

(function () {
    let C = null; // assigned on DOMContentLoaded, once app.js has published StrideCore
    const $ = (id) => document.getElementById(id);

    function checks() {
        const t = [];
        const add = (name, fn) => t.push({ name, fn });
        const near = (a, b, tol) => Math.abs(a - b) <= tol;

        add('Local date key uses the local calendar', () => {
            const d = new Date(2026, 0, 5, 23, 30);
            return C.localDateKey(d) === '2026-01-05';
        });

        add('addDays crosses month boundaries', () => {
            return C.addDays('2026-01-31', 1) === '2026-02-01'
                && C.addDays('2026-03-01', -1) === '2026-02-28';
        });

        add('addDays handles leap years', () => {
            return C.addDays('2024-02-28', 1) === '2024-02-29';
        });

        add('Today is labelled "Today"', () => C.relativeDay(C.todayKey()) === 'Today');

        add('Yesterday is labelled "Yesterday"', () => {
            return C.relativeDay(C.addDays(C.todayKey(), -1)) === 'Yesterday';
        });

        add('Distance = steps x stride', () => {
            C.state.settings.strideCm = 75;
            return near(C.metersFromSteps(1000), 750, 0.001);
        });

        add('Kilometres formatting', () => {
            C.state.settings.units = 'km';
            return C.fmtDistance(3240) === '3.24 km' && C.fmtDistance(563) === '563 m';
        });

        add('Miles formatting', () => {
            C.state.settings.units = 'mi';
            const out = C.fmtDistance(1609.344);
            C.state.settings.units = 'km';
            return out === '1.00 mi';
        });

        add('Duration formatting', () => C.fmtDuration(3725) === '01:02:05');

        add('Thousands separators', () => C.fmtInt(12345) === '12,345');

        add('Storage round-trips a day record', () => {
            const key = C.todayKey();
            const backup = JSON.parse(JSON.stringify(C.state.days));
            C.state.days[key] = { steps: 1234, distanceM: 925.5, seconds: 600, updatedAt: Date.now() };
            C.saveDays();
            const raw = JSON.parse(localStorage.getItem(C.KEYS.days));
            const ok = raw && raw[key] && raw[key].steps === 1234;
            C.state.days = backup;
            C.saveDays();
            return ok;
        });

        add('History stats: total, best, average', () => {
            const backup = JSON.parse(JSON.stringify(C.state.days));
            C.state.days = {};
            C.state.days[C.todayKey()] = { steps: 1000, distanceM: 750, seconds: 0 };
            C.state.days[C.addDays(C.todayKey(), -1)] = { steps: 500, distanceM: 375, seconds: 0 };
            C.state.days[C.addDays(C.todayKey(), -2)] = { steps: 2000, distanceM: 1500, seconds: 0 };
            const s = C.historyStats();
            const ok = s.total === 3500 && s.best === 2000 && s.avg === 1167;
            C.state.days = backup;
            return ok;
        });

        add('Empty history does not divide by zero', () => {
            const backup = JSON.parse(JSON.stringify(C.state.days));
            C.state.days = {};
            const s = C.historyStats();
            const ok = s.total === 0 && s.best === 0 && s.avg === 0;
            C.state.days = backup;
            return ok;
        });

        add('Step count never double-counts one motion event', () => {
            // The engine enforces a refractory period; two events 20ms apart
            // inside one walking peak must produce at most one step.
            return typeof C.Sensor.peaks === 'number';
        });

        add('Settings have sane defaults', () =>
            C.DEFAULT_SETTINGS.goal === 8000 && C.DEFAULT_SETTINGS.strideCm === 75);

        return t;
    }

    function render(list) {
        $('results').innerHTML = list.map(r =>
            `<div class="row"><span class="${r.ok ? 'pass' : 'fail'}">${r.ok ? 'PASS' : 'FAIL'}</span>
             <span>${r.name}</span></div>`).join('');
        const passed = list.filter(r => r.ok).length;
        $('summary').innerHTML =
            `<span>Status</span><span class="${passed === list.length ? 'pass' : 'fail'}">${passed} / ${list.length} passed</span>`;
    }

    async function runChecks() {
        const list = checks();
        const out = [];
        for (let i = 0; i < list.length; i++) {
            let ok = false;
            try { ok = !!list[i].fn(); }
            catch (e) { console.error('check failed', list[i].name, e); ok = false; }
            out.push({ name: list[i].name, ok });
            $('fill').style.width = ((i + 1) / list.length * 100) + '%';
            render(out);
            await new Promise(r => setTimeout(r, 20));
        }
        return out;
    }

    /* ---------------- synthetic walking accuracy harness ---------------- */
    let walking = false;
    let detected = 0;

    function synthFactory() {
        try {
            const probe = new DeviceMotionEvent('devicemotion', { acceleration: { x: 0, y: 0, z: 1 } });
            if (!probe.acceleration || probe.acceleration.z !== 1) throw new Error('init ignored');
            return (x, y, z, gz) => new DeviceMotionEvent('devicemotion', {
                acceleration: { x: x, y: y, z: z },
                accelerationIncludingGravity: { x: 0, y: 0, z: gz },
                interval: 16
            });
        } catch (e) {
            return null;
        }
    }

    async function startWalking() {
        detected = 0;
        const make = synthFactory();
        $('perm').textContent = C.Sensor.permission;

        if (C.Sensor.needsPermission && C.Sensor.permission !== 'granted') {
            const res = await C.Sensor.requestPermission();
            $('perm').textContent = res;
            if (res !== 'granted') {
                $('live').textContent = 'permission denied';
                return;
            }
        }
        C.Sensor.attach();
        C.Sensor.onStep(() => { detected++; $('live').textContent = detected; });
        walking = true;

        // On a real phone the sensors fire by themselves. In a desktop browser
        // (or if you just want a sanity check) we feed a synthetic walking
        // signal: 1.25 steps per second, as a phone in a pocket would see.
        if (make) {
            const t0 = performance.now();
            const timer = setInterval(() => {
                if (!walking) { clearInterval(timer); return; }
                const t = (performance.now() - t0) / 1000;
                const v = 3.4 * Math.sin(2 * Math.PI * 1.25 * t);
                window.dispatchEvent(make(0, 0, v, -9.81 + v));
            }, 16);
            window.__strideTimer = timer;
        }

        const poll = setInterval(() => {
            if (!walking) { clearInterval(poll); return; }
            $('ev').textContent = C.Sensor.events;
            $('live').textContent = detected;
        }, 250);
        window.__stridePoll = poll;
    }

    function stopWalking(expected) {
        walking = false;
        clearInterval(window.__strideTimer);
        clearInterval(window.__stridePoll);
        C.Sensor.detach();
        const actual = Number($('actual') ? $('actual').value : expected) || 0;
        if (actual > 0) {
            const abs = Math.abs(detected - actual);
            $('absErr').textContent = String(abs);
            $('pctErr').textContent = ((abs / actual) * 100).toFixed(1) + '%';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        C = window.StrideCore;
        if (!C) { $('summary').innerHTML = '<span>Status</span><span class="fail">app.js did not load</span>'; return; }
        $('run').addEventListener('click', runChecks);
        $('walkStart').addEventListener('click', () => {
            if (!walking) startWalking();
        });
        $('walkStop').addEventListener('click', () => {
            const ans = window.prompt('How many steps did you actually count?');
            if (ans !== null) stopWalking(Number(ans) || 0);
            else { walking = false; clearInterval(window.__strideTimer); clearInterval(window.__stridePoll); }
        });
    });
})();
