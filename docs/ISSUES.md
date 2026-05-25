# Statmodoro — Implementation Issues

Vertical slices in dependency order. Each issue is independently demoable upon completion.

---

## Issue 1 — Design system & app shell

### What to build

Set up the foundational design system and app shell that every subsequent issue builds on. This includes all design tokens (colours, typography, spacing, radii, transitions), Google Fonts loading (JetBrains Mono + DM Sans), global CSS reset, and the fixed 350×500px app frame with 28px border radius and its box shadow.

Implement the desktop stage pattern: the app frame centred on a `#111` background filling the viewport. On mobile the frame fills the full viewport with no visible frame.

Implement the bottom navigation bar (Timer · Stats · Settings tabs) with accent-coloured active state and inactive dim state. Tab switching drives which screen is rendered — no URL router, just a state variable.

The accent colour system (`--accent` / `--accent-dim`) is set via a class on the root app element (`.app.focus` / `.app.rest`) so the entire UI recolours by swapping one class.

### Acceptance criteria

- [ ] All design tokens from `docs/DESIGN.md` are defined as CSS custom properties
- [ ] JetBrains Mono (weights 100, 300, 400) and DM Sans (weights 300, 400, 500) load correctly
- [ ] App frame renders at exactly 350×500px with correct border, radius, and shadow
- [ ] Desktop stage centres the frame on `#111` background
- [ ] Bottom navbar renders three tabs with correct icons, labels, and spacing
- [ ] Active tab highlights in `--accent`; inactive tabs are dimmed
- [ ] Switching tabs renders the correct screen
- [ ] `.app.focus` applies purple accent; `.app.rest` applies green accent
- [ ] `prefers-reduced-motion` media query sets all transitions to `0s`

### Blocked by

None — can start immediately.

---

## Issue 2 — Timer state machine

### What to build

Implement the core timer logic as a pure `useReducer` state machine, wrapped in a `TimerContext` that the rest of the app consumes.

**States:** `idle | focus_running | focus_paused | break_running | break_paused`

**Transitions:**
- `TAP_RING` — toggles between running and paused within the current phase
- `SKIP` — advances to the next phase; marks focus session completed if elapsed time ≥ Count Session After threshold
- `SESSION_END` — fired when countdown reaches zero; advances to next phase respecting Auto-Start settings
- `LOOP_RESET` — resets loop position to session 1 without interrupting the current timer
- `SETTINGS_CHANGED` — updates `plannedDuration` for the current session; `remainingMs` is unchanged

**Loop logic:** after the final session's long break, the loop restarts from session 1.

**Backgrounding accuracy:** on every tick while running, write `endTimestamp = Date.now() + remainingMs` to localStorage. On `visibilitychange` or app resume, recalculate remaining time from `endTimestamp`. If `endTimestamp` has already passed, treat as naturally completed and advance state.

**Persistence:** full timer state serialised to localStorage so it survives page refresh.

Write a full unit test suite covering every state transition, loop cycling, auto-start variants, skip with and without credit, and background expiry.

### Acceptance criteria

- [ ] All five states and all transitions are implemented
- [ ] Loop correctly cycles: focus → short break → focus → … → focus → long break → focus (session 1)
- [ ] The final break of each loop is always the long break
- [ ] Auto-Start Breaks and Auto-Start Focus settings are respected on each phase transition
- [ ] Skip marks focus session completed only if elapsed ≥ Count Session After threshold
- [ ] Skip on a break always discards silently (no completion recorded)
- [ ] Loop reset does not interrupt the running timer; only loop position changes
- [ ] Settings changes update `plannedDuration` immediately; `remainingMs` is unchanged
- [ ] `endTimestamp` is written to localStorage on every tick while running
- [ ] On resume, remaining time is derived from `endTimestamp`; expired sessions advance state
- [ ] Full timer state persists across page refresh
- [ ] Unit tests cover all transitions and edge cases

### Blocked by

Issue 1

---

## Issue 3 — Timer screen UI

### What to build

Build the complete Timer screen, wired to `TimerContext` and `SettingsContext`.

**Progress ring:** 220×220px SVG, rotated −90° so progress starts at the top. Track circle (`#1e1e1e`, 5px stroke). Progress circle uses `stroke-dasharray` to represent elapsed/remaining time; `stroke-linecap: round`. Stroke colour is `--accent` when running, `--accent-dim` when paused. On hover: invert (dim when running, brighten when paused). Transition: `0.35s ease`.

**Ring inner:** time display (`MM:SS`, JetBrains Mono 46px weight 300) and state label (DM Sans 10px, uppercase, letter-spacing 0.24em, always `--accent`). Time display colour transitions to `--text-paused` when paused, `--text-paused-hover` when paused and ring hovered. State labels per state: idle → "Tap to Focus", focus running → "Focus", focus paused → "Tap to Focus", break running → "Rest", break paused → "Tap to Rest".

**Accent glow:** pseudo-element radial gradient at the top of the app using `--accent-dim`, opacity 0.75.

**Session dots:** row of dots above the ring. Done: 6×6px filled `--accent-dim`. Active: 22×6px pill filled `--accent`. Future: 6×6px `rgba(255,255,255,0.14)`. On container hover: all dots transition to uniform dim, "Reset Loop" hint fades in above. Tapping the container fires `LOOP_RESET`.

**Skip button:** icon button below the ring. `--accent` fill at 0.82 opacity, full opacity on hover.

### Acceptance criteria

- [ ] Ring drains correctly from full to empty over the session duration
- [ ] Ring stroke colour transitions correctly across all running/paused/hover state combinations
- [ ] Time display shows `MM:SS` format, zero-padded, up to `999:59`
- [ ] State label is always `--accent` and shows the correct text for every state
- [ ] Accent glow pseudo-element is present and shifts colour with state
- [ ] Session dots render correctly for done/active/future states
- [ ] Dot container hover reveals "Reset Loop" hint and dims all dots
- [ ] Tapping dots fires loop reset without interrupting the timer
- [ ] Skip button advances phase immediately with no confirmation
- [ ] All transitions respect `--trans-color`, `--trans-fast`, `--trans-med` tokens
- [ ] `prefers-reduced-motion` disables all transitions

### Blocked by

Issues 1, 2

---

## Issue 4 — Settings screen

### What to build

Build the complete Settings screen with all groups, wired to `SettingsContext` (React Context + localStorage persistence).

**Timer group:** Focus Duration, Short Break, Long Break, Sessions Per Loop, Count Session After — all using the stepper component.

**Behaviour group:** Auto-Start Breaks (toggle), Auto-Start Focus (toggle), Daily Streak Goal (stepper), Mode (Pomodoro | Flowmodoro toggle/selector), Flowmodoro Break Ratio (stepper, visible only when Mode = Flowmodoro), Day Start Time (stepper or selector, 30-min increments).

**Notifications group:** Sound Alerts (toggle), Volume (slider, 0–100%, default 70%), Desktop Notifications (toggle).

**Data group:** Import Data (action link), Export Data (action link), Clear All History (danger link), Reset All Settings (danger link). Import/Export and destructive actions are stubs at this stage — wired up fully in Issue 8.

**Stepper component:** `−` button · editable value field · `+` button. Value field uses `inputmode="numeric"` on mobile. Buttons are minimum 44px touch targets.

**Toggle component:** 34×19px pill. Off: surface-raised background. On: `--accent` background. Thumb slides with `--trans-med`.

Settings changes are written to localStorage immediately and broadcast via context so the timer picks them up without reload.

### Acceptance criteria

- [ ] All settings groups and rows render with correct labels, spacing, and dividers
- [ ] Stepper supports direct text input as well as − and + buttons
- [ ] Stepper values are clamped to their configured ranges on blur
- [ ] Toggle transitions correctly between on/off states
- [ ] Volume renders as a slider
- [ ] Flowmodoro Break Ratio row is hidden when Mode = Pomodoro and shown when Mode = Flowmodoro
- [ ] All settings persist to localStorage and survive page refresh
- [ ] Settings context provides current values to TimerContext and other consumers
- [ ] Scroll fade gradient is present at the bottom of the screen

### Blocked by

Issue 1

---

## Issue 5 — Session event schema & storage layer

### What to build

Design and implement the event-sourced session storage system using IndexedDB via the `idb` library.

**Session record shape:**
```ts
interface SessionRecord {
  id: string
  sessionIndex: number        // 1–N within loop
  plannedDuration: number     // ms, from settings at session start
  sessionType: 'focus' | 'short_break' | 'long_break'
  mode: 'pomodoro' | 'flowmodoro'
  completed: boolean          // crossed Count Session After threshold
  flowmodoroDerivedBreakMs?: number  // only for flowmodoro focus sessions
  events: TimerEvent[]
}

interface TimerEvent {
  type: 'start' | 'pause' | 'resume' | 'end'
  timestamp: number  // Unix ms
}
```

Net active time for a session is derived by replaying its events. Break sessions are stored with the same schema.

Wire the storage layer to the timer state machine: each state transition that starts, pauses, resumes, or ends a session appends the corresponding event. On session end, compute `completed` and write the full record to IndexedDB.

Expose a clean async API (`writeSesssion`, `getAllSessions`, `clearAllSessions`) that the stats layer and import/export will consume.

This issue requires a design review of the schema before implementation begins — confirm the event types, indexing strategy, and query patterns needed by the stats derivation layer.

### Acceptance criteria

- [ ] IndexedDB store is created and versioned correctly via `idb`
- [ ] Session records are written to IndexedDB on session completion
- [ ] Event timestamps are accurate (not affected by pauses or backgrounding)
- [ ] `completed` flag is set correctly based on the Count Session After threshold
- [ ] `flowmodoroDerivedBreakMs` is stored on Flowmodoro focus sessions
- [ ] Break sessions are stored as full records with their own events
- [ ] `getAllSessions` returns records in a form the stats layer can consume efficiently
- [ ] `clearAllSessions` removes all records
- [ ] Write → read round-trip test passes

### Blocked by

Issue 2

---

## Issue 6 — Stats data layer

### What to build

Implement all stats derivation as pure functions over raw `SessionRecord[]` from IndexedDB. No aggregated cache — everything is computed on demand and memoised at the React layer with `useMemo`.

Functions to implement:

- **Day view:** total focus time, sessions count, best ever single-day session count, avg daily sessions (last 30 days), hourly bar chart data (focus minutes per hour slot), detail rows (avg session length, longest session, total breaks taken)
- **Week view:** total focus time, sessions this week, best day of week, avg daily focus, daily bar chart, detail rows (avg daily focus, best day, days active, total breaks)
- **Month view:** total focus time, sessions this month, best week, avg daily focus, daily bar chart, detail rows
- **Year view:** total focus time, sessions this year, best month, avg monthly focus, monthly bar chart, detail rows
- **Streaks:** current streak and best streak, using Day Start Time boundary and Daily Streak Goal threshold
- **Full Analysis inputs:** average focus by hour of day (all-time), average focus by day of week (all-time), session length distribution buckets, 7×24 focus density matrix, all-time totals, personal records, completion rate, break compliance rate, average time to first session per day

Day boundary logic must apply the Day Start Time offset in the user's local timezone.

Write a full unit test suite. Cover: no data, single session, sessions spanning the day boundary, sessions with multiple pauses, streak breaks, streak across month boundaries.

### Acceptance criteria

- [ ] All derivation functions are pure (no side effects, no IndexedDB calls)
- [ ] Day/Week/Month/Year hero values, chips, and bar chart data are correct
- [ ] Bar chart height percentages are scaled relative to the tallest bar in the view
- [ ] Streak calculation correctly applies Day Start Time offset
- [ ] Streak breaks when Daily Streak Goal is not met on a calendar day
- [ ] All Full Analysis inputs are derivable from raw session records
- [ ] Unit tests cover all views, all streak edge cases, and zero-data state

### Blocked by

Issue 5

---

## Issue 7 — Stats screen — quick glance

### What to build

Build the Stats screen wired to a `StatsContext` that reads from IndexedDB and exposes derived stats via the functions from Issue 6.

**Range switcher:** Day · Week · Month · Year tabs with an animated underline indicator in `--accent`. Switching tabs swaps the visible panel.

**Hero value:** large JetBrains Mono display of total focus time. Sub-label "Focus time" below.

**Chips row:** three chips — primary chip (session count) uses `--accent-dim` background; secondary chips use the surface-raised style.

**Bar chart:** horizontally scrollable, bars bottom-aligned, 68px tall container, 36px wide bars with 5px gap, 3px border-radius, minimum height 3px. Current-period bar uses `--accent` at 0.72 opacity. Day labels below each bar. Tapping a bar shows a tooltip with exact focus time; tapping elsewhere dismisses it.

**Detail rows:** label + value pairs separated by 1px borders, JetBrains Mono values. Streak values render in `--accent`.

**Zero state:** all bars at minimum height, all values show zero. No empty state messaging.

**Scroll fade:** gradient overlay at bottom of scrollable area.

### Acceptance criteria

- [ ] All four range views render with correct hero, chips, chart, and detail rows
- [ ] Range switcher animates the underline indicator correctly
- [ ] Bar chart scrolls horizontally without visible scrollbar
- [ ] Current-period bar is highlighted in `--accent`
- [ ] Tapping a bar shows a tooltip; tapping outside dismisses it
- [ ] Zero-state renders correctly with no errors
- [ ] Streak values display in accent colour
- [ ] Scroll fade is present

### Blocked by

Issues 3, 6

---

## Issue 8 — Import / Export & data management

### What to build

Wire up the Data section of Settings with full import/export functionality and destructive data actions.

**Export:** serialise all IndexedDB session records plus all localStorage settings into a single JSON object. Trigger a browser file download with filename `statmodoro-export-{YYYY-MM-DD}.json`.

**Import:** prompt the user to select a JSON file. Parse and validate the top-level shape. Show a confirmation dialog explaining that all current data will be replaced. On confirm: replace all IndexedDB records and all localStorage settings with the imported data, then reload the app state from the new data.

**Clear All History:** confirmation dialog → delete all IndexedDB session records. Settings are untouched.

**Reset All Settings:** confirmation dialog → restore all settings to their defaults. Session history is untouched.

### Acceptance criteria

- [ ] Export downloads a valid JSON file with correct filename including today's date
- [ ] Exported JSON contains all session records and all current settings
- [ ] Import parses the file and shows a confirmation dialog before replacing data
- [ ] After import, the app reflects the imported session history and settings
- [ ] Clear All History removes all session records; stats show zero state
- [ ] Reset All Settings restores all defaults; session history is unaffected
- [ ] All three destructive actions require confirmation before executing
- [ ] Invalid import files show an error without modifying any data

### Blocked by

Issue 5

---

## Issue 9 — Notifications

### What to build

Implement sound alerts and desktop notifications, both firing at phase transitions (focus → break, break → focus).

**Sound alerts:** load a single bundled royalty-free audio file via the Web Audio API. Play it on each phase transition, gated by the Sound Alerts toggle. Volume is controlled by the Volume slider setting (0–1 gain node). No sound during the initial idle state.

**Desktop notifications:** fire a `Notification` at each phase transition, gated by the Desktop Notifications toggle. Request browser notification permission lazily — only when the user first enables the Desktop Notifications toggle. If permission is denied, toggle reverts to OFF. Notification content: title = "Statmodoro", body describes the new phase (e.g. "Time to rest!" / "Back to focus!").

### Acceptance criteria

- [ ] Sound plays at focus → break and break → focus transitions
- [ ] Sound is silent when Sound Alerts is OFF
- [ ] Volume slider controls playback gain in real time
- [ ] Desktop notification fires at each phase transition when the toggle is ON
- [ ] Permission is requested only on first enable of Desktop Notifications
- [ ] If permission is denied, the toggle reverts to OFF and no further requests are made
- [ ] No notifications fire from the idle state on first load

### Blocked by

Issues 2, 4

---

## Issue 10 — Flowmodoro mode

### What to build

Add Flowmodoro as a fully working mode alongside Pomodoro, toggled via the Mode setting.

**Ring behaviour:** instead of draining, the ring counts up. Fill uses a two-phase function:
- `t ≤ target`: `fill = (t / target) × 0.75` (linear to 75% at configured Focus Duration)
- `t > target`: `fill = 0.75 + 0.25 × (1 - e^(-k × (t - target) / target))` where `k ≈ 3`

The ring approaches 100% asymptotically — it never hard-stops.

**Ending a session:** the user taps Skip to end the focus session. Break duration is calculated as `focusElapsedMs ÷ Flowmodoro Break Ratio`. This derived break duration is stored on the session record as `flowmodoroDerivedBreakMs`.

**Session counting:** "Count Session After" uses the configured Focus Duration as the reference `plannedDuration` for Flowmodoro sessions.

**Stats:** Flowmodoro sessions appear combined with Pomodoro sessions in all stats views. The `mode` field on each record is available for future filtering.

**Settings:** Flowmodoro Break Ratio row is visible only when Mode = Flowmodoro (implemented in Issue 4 but verified here end-to-end).

### Acceptance criteria

- [ ] Switching to Flowmodoro mode changes ring behaviour to count-up
- [ ] Ring fill is linear to 75% at configured Focus Duration
- [ ] Ring fill past the target approaches 100% asymptotically and never reaches it
- [ ] Skip ends the focus session and triggers a break of the correct derived duration
- [ ] Derived break duration is stored in `flowmodoroDerivedBreakMs` on the session record
- [ ] Flowmodoro sessions appear in all stats views combined with Pomodoro sessions
- [ ] Count Session After uses Focus Duration as reference for Flowmodoro sessions
- [ ] Switching back to Pomodoro mode restores drain behaviour

### Blocked by

Issues 2, 4, 5

---

## Issue 11 — Stats — Full Analysis view

### What to build

Build the Full Analysis view that slides in from the Stats screen when the user taps "Full Analysis". The bottom navbar is replaced by a back button. Content scrolls vertically within the same app frame.

This issue requires a layout design review before implementation to decide chart proportions, spacing, and exact visual treatment of each section within the 350px width constraint.

Charts and sections to implement:

- **GitHub-style calendar heatmap** — 52 weeks × 7 days grid, colour intensity scaled to daily focus minutes, scrollable if needed
- **Average focus by hour of day** — bar chart, 24 bars
- **Average focus by day of week** — bar chart, 7 bars
- **Session length distribution** — histogram with configurable bucket sizes
- **7-day × 24-hour focus density heatmap** — grid coloured by focus intensity
- **All-time totals** — total focus time, total sessions, total active days
- **Personal records** — longest single session, best single day, longest streak
- **Completion rate** — % of started sessions that crossed the credit threshold
- **Break compliance rate** — % of breaks taken vs skipped
- **Average time to first session** — avg time after day start before first focus

All data comes from the derivation functions in Issue 6.

### Acceptance criteria

- [ ] "Full Analysis" button on Stats screen opens the view with a slide-in transition
- [ ] Back button returns to the Stats screen
- [ ] Bottom navbar is hidden in the Full Analysis view
- [ ] All 10 sections render with correct data derived from session records
- [ ] Calendar heatmap correctly maps daily focus minutes to colour intensity
- [ ] All charts use the shared design tokens (fonts, colours, surface styles)
- [ ] Zero-data state renders without errors for all sections

### Blocked by

Issues 6, 7

---

## Issue 12 — PWA

### What to build

Convert the web app into an installable Progressive Web App.

**Web app manifest:** name "Statmodoro", short name "Statmodoro", description "A privacy-first Pomodoro timer with extensive local statistics. All your data stays on your device.", `display: standalone`, background colour `#0A0A0A`, theme colour driven by current timer state. Include icon assets for both focus (purple) and rest (green) variants in required sizes.

**Service Worker:** cache-first strategy for all app assets. App works fully offline after the first load. Use Workbox or a hand-rolled Service Worker appropriate to the Vite build setup.

**Dynamic icon/favicon:** swap `<link rel="icon">` href between focus and rest SVG variants on each state change.

**Backgrounding:** verify the `endTimestamp` strategy from Issue 2 works correctly in standalone PWA mode (where the app may be fully suspended by the OS).

### Acceptance criteria

- [ ] App is installable from the browser on both desktop and mobile
- [ ] App works fully offline after the first visit
- [ ] Manifest includes correct name, description, colours, and icon assets
- [ ] Focus and rest icon variants are distinct and correctly sized
- [ ] Favicon swaps between focus and rest variants on state change
- [ ] Timer remains accurate after the app is backgrounded in standalone mode
- [ ] Lighthouse PWA audit passes

### Blocked by

Issues 1–11

---

## Issue 13 — Chromium extension

### What to build

Package Statmodoro as a Chromium extension, reusing the existing React app inside a popup.

**Extension manifest (v3):** popup action pointing to the built React app. Background service worker to hold timer state and drive badge/icon updates. Permissions: `storage`, `notifications` (for desktop notifications), `alarms` (for reliable background timing).

**Timer state in background:** the background service worker owns the timer state and `endTimestamp`. The popup communicates with it via `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`. When the popup opens it fetches current state; all dispatched actions go through the background worker.

**Badge:** `chrome.action.setBadgeText({ text: remainingMinutes })` on each tick when running, blank when paused or idle. `chrome.action.setBadgeBackgroundColor` set to the current accent colour (purple or green).

**Icon:** two icon variants per accent colour (focus purple, rest green). Swapped via `chrome.action.setIcon()` on state change.

**Pop-out button:** a subtle icon button in the top-right corner of the popup, rendered only in the extension context (detected via a build-time environment flag). Opens the PWA URL in a new tab.

**Build:** a separate Vite build target produces the extension bundle. The core React app is shared; platform-specific code (pop-out button, background messaging) is gated by the environment flag.

### Acceptance criteria

- [ ] Extension installs in Chrome without errors
- [ ] Popup renders the timer at 350×500px
- [ ] Timer continues running when the popup is closed
- [ ] Badge shows remaining minutes in the correct accent colour while running; blank when paused or idle
- [ ] Extension icon switches between focus and rest variants on each state change
- [ ] Desktop notifications fire from the background service worker at phase transitions
- [ ] Pop-out button appears in the popup and opens the PWA in a new tab
- [ ] Pop-out button is not present in the PWA build
- [ ] Timer accuracy is maintained across popup open/close cycles

### Blocked by

Issue 12
