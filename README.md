# Stride — Free Personal Step Counter

A step counter that runs entirely in your phone's browser. No account, no server,
no database, no API keys, no ads, no trackers. **Total ongoing cost: ₹0.**

Your step history is saved in your own browser and never leaves your device.

---

## 1. What you got

```
stride-app/
├── index.html          the app itself (open this)
├── styles.css          all the styling, light + dark themes
├── app.js              all the logic: sensors, step detection, storage, history
├── tests.html          a page that runs self-tests and a real walking test
├── tests.js            the test code (loaded by tests.html)
├── manifest.json       makes the app installable to your home screen
├── service-worker.js   caches the app so it opens offline
├── icon.svg            app icon
└── README.md           this file
```

There is **no backend**. It is plain HTML, CSS and JavaScript.

---

## 2. Try it right now

### On your computer (quick look)

Open a terminal in the `stride-app` folder and run:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

> Opening `index.html` by double-clicking it also works, but the browser will
> block motion sensors because `file://` is not a "secure context". Use the
> local server for anything to do with actual step counting.

### On your iPhone (real testing)

Motion sensors on iOS only work over **HTTPS**, so you must publish the site
first (section 6). Once it is on `https://`, open it in Safari and follow
section 5.

---

## 3. Features

**Live counter**
- Today's total steps shown large
- Start / Pause / Resume / Stop / Reset today's count
- Asks for motion permission only after you tap a button (an iOS requirement)
- Clearly reports the tracking status
- Distance and calories estimated from your stride length and body weight

**Daily history**
- Saved per local calendar day; midnight rolls over correctly
- Today, yesterday, last 7 days, last 30 days (when available)
- Best day, daily average, total recorded
- Pick any date and look up its total
- Nothing is lost when you close and reopen the site

**Daily goal**
- Default 8,000, changeable to anything from 100 to 200,000
- Progress ring, steps completed, steps remaining, percentage
- A brief celebration animation when you hit the goal (once per day, no
  battery-draining effects)

**Walking sessions**
- Session steps, duration, distance, pace, start and end time
- Session steps are *part of* the daily total, never added on top of it, so
  nothing is counted twice
- A summary appears when you stop a session

**Settings**
- Daily goal, stride length, kilometres or miles, light/dark/auto theme
- Step-detection sensitivity
- CSV export of your whole history
- Erase-all-data with a confirmation prompt
- Privacy information

---

## 4. How step counting actually works

This is the part worth understanding, because most step-counting apps are vague
about it.

**A web page has no hardware pedometer.** Browsers do not give JavaScript access
to the phone's built-in step counter. What they *do* give us is the raw
accelerometer, through `DeviceMotionEvent`. Stride reads that and runs its own
step-detection algorithm.

The algorithm:

1. **Get acceleration.** It uses `acceleration` (already free of gravity) when
   the browser provides it, and falls back to `accelerationIncludingGravity`
   with a slow filter to estimate and remove gravity when it doesn't.
2. **Project onto the gravity axis.** The raw acceleration is a 3-D vector. Its
   *length* rises twice per step, which is the classic cause of counting every
   step twice. Stride instead projects the acceleration onto the direction of
   gravity, so one walking cycle produces exactly one peak.
3. **Smooth.** A 6-sample moving average removes high-frequency sensor noise.
4. **Adaptive threshold.** The detection threshold is recalculated continuously
   from the mean and standard deviation of the last ~1 second of signal, so it
   adapts to your phone, your walking style and how you carry it.
5. **Hysteresis.** A step is only counted after the signal rises above the high
   threshold *and then falls back below a lower one*. This stops one movement
   being counted several times as the signal wobbles around the threshold.
6. **Refractory period.** Steps closer together than ~350 ms are rejected
   (that is 170 steps per minute — faster than human walking).
7. **Anti-shake gate.** Human walking tops out near 3 Hz. If the raw
   threshold-crossing rate goes above 3.4 Hz, the motion is not walking, and
   counting is suppressed for a moment.

**The sensitivity setting** (1–10) adjusts the threshold multiplier, the
absolute amplitude floor and the refractory period together. Higher sensitivity
catches gentler steps but also more noise.

---

## 5. iPhone: what works and what genuinely cannot

### Permission

On iOS, Safari will not give a page motion data unless the user asks for it.
So Stride never requests permission on page load. Tap **Start walking**, and iOS
will show its "allow motion access" prompt. If you decline, the app tells you
exactly where to switch it back on:
**Settings → Safari → Motion & Orientation Access**.

### The real limitation: background counting

**A website cannot count your steps while it is closed, or while the phone is
locked, or while you are in another app.** This is not a Stride bug and it is not
something any amount of clever JavaScript fixes. Mobile browsers suspend
JavaScript for a page that is not on screen — on iOS this happens almost
immediately. There is no free, browser-based way around it.

Stride is honest about this instead of pretending otherwise:

- Counting works reliably while the page is **open and visible**.
- If you switch away or lock the screen, Stride shows a message telling you
  counting has paused.
- When you come back, counting resumes from there.

### Does installing it to the home screen help?

Somewhat, and only in a limited way. Adding Stride to your home screen (Share →
Add to Home Screen) makes it open full-screen like an app and lets it work
offline, and the installed app survives a bit longer before iOS suspends it.
**It does not give you all-day background counting.** Anyone who tells you a
PWA fully solves this on iOS is wrong.

### Practical advice

- Start a session when you begin a walk, keep the page open, put the phone in
  your pocket.
- For all-day automatic tracking, use the pedometer built into iOS Health,
  which has the system-level permission a website cannot get. Stride is the
  free, private, no-install option — it is not a replacement for that.

---

## 6. Publish it free with GitHub Pages

You need a (free) GitHub account. No credit card, no paid plan, no custom
domain. The finished address will look like
`https://YOUR-USERNAME.github.io/stride-app/`.

**Step 1 — create an account** (skip if you have one)
Go to <https://github.com/signup>, enter an email, password and username. Free.

**Step 2 — create an empty repository**
1. Go to <https://github.com/new>
2. **Repository name:** `stride-app`
3. **Public** must be selected (GitHub Pages on the free plan needs a public repo)
4. Do **not** tick "Add a README file"
5. Click **Create repository**

**Step 3 — upload the files**
Easiest way, no command line:
1. On the new empty repository page, click **uploading an existing file**
2. Drag in every file from the `stride-app` folder — `index.html`,
   `styles.css`, `app.js`, `tests.html`, `tests.js`, `manifest.json`,
   `service-worker.js`, `icon.svg`, `README.md`
3. Click **Commit changes**

**Step 4 — turn on GitHub Pages**
1. In the repository, click **Settings**
2. In the left sidebar, click **Pages**
3. Under *Branch*, choose **main** and **/ (root)**, then click **Save**
4. Wait 1–2 minutes and reload the page

**Step 5 — open your site**
GitHub will show a link like `https://YOUR-USERNAME.github.io/stride-app/`.
Open it in Safari on your iPhone. It is HTTPS, so motion sensors will work.

> Updates: if you change a file and re-upload it, GitHub Pages republishes
> automatically in about a minute.

---

## 7. Accuracy testing — do this on your phone

Nobody can honestly claim a step counter is accurate without testing it on the
real device. Here is exactly how to test Stride.

1. Open `tests.html` instead of the main page (same website, add `/tests.html`
   to the address).
2. Tap **Run automated checks** — 15 checks of the date, storage, formatting
   and maths logic should pass.
3. Count 100 steps out loud while you walk normally. Tap **Start counting real
   steps**, walk your 100 steps, tap **Stop** and type `100` when asked.
4. Repeat for: slow walking, brisk walking, standing still (expect ~0),
   ordinary phone handling, gentle shaking, and each carrying position
   (pocket, hand, bag).

**The two numbers it reports:**

- Absolute error = |detected − actual|
- Percentage error = (|detected − actual| ÷ actual) × 100

**What I measured in a desktop browser** (synthetic signals fed to the real
detection code, 60 Hz, 10-second runs — *not* a physical device test):

| Scenario | Detected | Actual | Error |
|---|---|---|---|
| Normal walk, 1.25 steps/s | 12 | 12.5 | 4.0% |
| Slow walk, 0.8 steps/s | 7 | 8 | 12.5% |
| Brisk walk, 2.2 steps/s | 21 | 22 | 4.5% |
| Jog, 2.8 steps/s | 27 | 28 | 3.6% |
| Standing still, 8 s | 0 | 0 | 0% |
| Gentle shaking, 4 Hz, 8 s | 4 | 0 | false positives |
| Gentle shaking, 5 Hz, 8 s | 4 | 0 | false positives |

**These numbers come from synthetic motion signals, not from a real iPhone.**
They prove the algorithm behaves sanely and responds correctly to cadence, but
they are not a substitute for walking around with your own phone. Do the
100-step test yourself and adjust the sensitivity if needed.

If your results are poor, the usual causes are: the phone being held loosely or
in a swinging bag, a stride that differs a lot from the default 75 cm (that
affects distance, not step count), or the sensitivity being too low or too high
for how you carry the phone.

---

## 8. Privacy

- Every step, session and setting is stored in your browser's `localStorage`.
- Nothing is uploaded. There is no server to upload it to.
- No account, no ads, no analytics, no trackers, no location access.
- The CSV export is created in your browser and saved straight to your device.

**What will lose your data:** clearing "website data" in your browser, using
private/incognito mode, or switching to a different phone or browser. There is
no cloud sync — that would need a backend and a database, which this project
deliberately does not have. Export a CSV if you want a backup.

---

## 9. Known limitations — read this honestly

1. **No background counting.** Explained in section 5. This is a browser
   platform limit, not a bug.
2. **Rhythmic shaking can still add a few steps.** If you deliberately shake the
   phone at roughly walking speed and force, the accelerometer data is genuinely
   indistinguishable from walking. The anti-shake gate reduces this (it cut
   false steps from 16 to 4 in testing) and the sensitivity setting reduces it
   further, but it cannot be eliminated entirely from a browser.
3. **Not tested on a physical iPhone.** I do not have access to one. The iOS
   code paths (`requestPermission`, permission-denied handling, HTTPS checks)
   follow Apple's documented behaviour and the app degrades gracefully, but
   confirm on your own device.
4. **Distance is an estimate**, based on the stride length you enter. It is not
   GPS-based.
5. **Calories are a rough estimate** (about 0.04 kcal per step, scaled by body
   weight). Treat it as an indication, not a measurement.
6. **Very slow pottering** below roughly 0.7 steps per second may be missed.
7. **Sprinting** above about 170 steps per minute is deliberately clipped by the
   refractory period.

---

## 10. Cost

Nothing here requires payment at any point:

- No paid APIs, no API keys
- No database, no server, no hosting bill (GitHub Pages free tier)
- No authentication service, no subscription, no trial that expires
- No custom domain — the free `github.io` address is used
- No analytics or advertising services
- No credit card has been entered anywhere

**Ongoing cost: ₹0.**

---

## 11. Running the automated tests

Open `tests.html` in the browser. It checks date handling (including month
boundaries and leap years), distance and duration formatting, storage
round-trips, history statistics and empty-history handling — 15 checks, all of
which pass. It also includes the manual 100-step walking test.

Equivalent command-line check for the JavaScript syntax:

```bash
node --check app.js
```


