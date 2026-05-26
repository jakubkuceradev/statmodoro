# Statmodoro — Architecture & Component Design

This document covers module structure, TypeScript types, React Context design, data flow, component hierarchy, and every non-obvious architectural decision for the React + Tailwind v4 implementation.

---

## Tech Stack Notes

- **React 19** — concurrent features available but not required for v1
- **Vite 8** with `@vitejs/plugin-react`
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`; configured via `@theme` in CSS
- **TypeScript 6**
- **`idb`** — thin IndexedDB wrapper (to be added)

---

## Tailwind v4 + Design Token Strategy

Tailwind v4 uses `@theme` directives in CSS instead of a config file. Design tokens are registered there and become available as both utility classes and CSS custom properties.

### Static tokens → `@theme`

Tokens that never change at runtime (backgrounds, text hierarchy, borders, spacing, radii, transitions) are defined in `@theme`:

```css
@theme {
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  --font-sans: 'DM Sans', sans-serif;

  --color-bg-app:         #0A0A0A;
  --color-surface:        rgba(255,255,255,0.025);
  --color-surface-raised: rgba(255,255,255,0.06);
  --color-border:         rgba(255,255,255,0.06);
  --color-border-strong:  rgba(255,255,255,0.10);

  --color-text-primary:      rgba(255,255,255,1.00);
  --color-text-secondary:    rgba(255,255,255,0.55);
  --color-text-muted:        rgba(255,255,255,0.28);
  --color-text-faint:        rgba(255,255,255,0.14);
  --color-text-paused:       rgba(255,255,255,0.38);
  --color-text-paused-hover: rgba(255,255,255,0.92);

  --color-ring-track: #1e1e1e;

  --spacing-gap-section: 28px;
  --spacing-navbar-h:    64px;
  --spacing-ring-size:   220px;

  --radius-app:  28px;
  --radius-pill: 20px;
  --radius-sm:   6px;
  --radius-dot:  3px;

  --ease-color: 0.35s ease;
  --ease-fast:  0.18s ease;
  --ease-med:   0.28s ease;
}
```

These resolve to `bg-bg-app`, `text-text-muted`, `font-mono`, etc. as Tailwind utility classes.

### Dynamic tokens → scoped CSS custom properties

Accent colours change at runtime based on timer state. They are **not** in `@theme` — they are set via a data attribute on the root app element:

```css
[data-mode="focus"] {
  --accent:     #9747FF;
  --accent-dim: #3D1180;
}
[data-mode="rest"] {
  --accent:     #34C759;
  --accent-dim: #1A632D;
}
```

Components reference these as Tailwind arbitrary values: `text-[var(--accent)]`, `bg-[var(--accent-dim)]`, or directly in inline style / CSS where Tailwind's arbitrary syntax becomes unwieldy (e.g. SVG stroke colour).

**Why `data-mode` over a class?** Data attributes signal semantic state rather than styling intent, and they compose cleanly with Tailwind's `data-*` variant selectors if needed.

### `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0s !important;
    animation-duration: 0s !important;
  }
}
```

This lives in the global stylesheet alongside `@theme`. No JavaScript involvement.

---

## Folder Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppFrame.tsx        # Root container, data-mode attribute, accent glow
│   │   ├── Navbar.tsx          # Bottom nav bar + NavTab
│   │   └── Screen.tsx          # Scrollable screen shell with fade gradient
│   ├── timer/
│   │   ├── TimerScreen.tsx
│   │   ├── SessionDots.tsx
│   │   ├── ProgressRing.tsx    # SVG ring + inner content
│   │   └── SkipButton.tsx
│   ├── stats/
│   │   ├── StatsScreen.tsx
│   │   ├── RangeSwitcher.tsx
│   │   ├── RangePanel.tsx      # Renders Day/Week/Month/Year content
│   │   ├── BarChart.tsx
│   │   ├── BarTooltip.tsx
│   │   ├── HeroValue.tsx
│   │   ├── ChipsRow.tsx
│   │   └── DetailRows.tsx
│   ├── analysis/
│   │   ├── FullAnalysisScreen.tsx
│   │   ├── CalendarHeatmap.tsx
│   │   ├── HourOfDayChart.tsx
│   │   ├── DayOfWeekChart.tsx
│   │   ├── SessionHistogram.tsx
│   │   ├── DensityHeatmap.tsx
│   │   ├── AllTimeTotals.tsx
│   │   ├── PersonalRecords.tsx
│   │   └── RateMetrics.tsx
│   ├── settings/
│   │   ├── SettingsScreen.tsx
│   │   ├── SettingsGroup.tsx
│   │   ├── SettingsRow.tsx
│   │   ├── Stepper.tsx
│   │   ├── Toggle.tsx
│   │   ├── VolumeSlider.tsx
│   │   └── DayStartPicker.tsx
│   └── ui/
│       ├── ConfirmDialog.tsx
│       └── Tooltip.tsx
├── contexts/
│   ├── TimerPhaseContext.tsx   # Semantic state (phase, loop, session) — updates on transitions only
│   ├── TimerClockContext.tsx   # remainingMs — updates every 100ms tick
│   ├── SettingsContext.tsx
│   └── StatsContext.tsx
├── hooks/
│   ├── useTimerPhase.ts        # Consumes TimerPhaseContext
│   ├── useTimerClock.ts        # Consumes TimerClockContext
│   ├── useSettings.ts          # Consumes SettingsContext
│   ├── useStats.ts             # Consumes StatsContext
│   ├── useVisibilityChange.ts  # Fires callback on tab visibility restore
│   └── useLongPress.ts         # Returns long-press event handlers (pointer events, ~500ms delay)
├── lib/
│   ├── timer/
│   │   ├── reducer.ts          # Pure state machine reducer
│   │   ├── types.ts            # TimerState, TimerAction, TimerPhase
│   │   └── persistence.ts      # localStorage read/write helpers
│   ├── db/
│   │   ├── index.ts            # idb setup, store definition, versioning
│   │   ├── sessions.ts         # writeSession, getAllSessions, clearAllSessions
│   │   └── migrations.ts       # migrate(record: any): SessionRecord — used by both upgrade() and importAll()
│   ├── stats/
│   │   ├── derive.ts           # All pure derivation functions
│   │   ├── streak.ts           # Streak calculation with day boundary
│   │   ├── analysis.ts         # Full Analysis derivation functions
│   │   └── bucketDay.ts        # bucketDay(timestamp, dayStartHour): string → "YYYY-MM-DD"; used by ALL daily aggregation to ensure consistent day boundaries
│   ├── data/
│   │   └── io.ts               # exportAll(): Promise<Blob>, importAll(file: File): Promise<void> — called by SettingsScreen
│   ├── audio/
│   │   └── index.ts            # Web Audio API wrapper, play(), setVolume()
│   └── notifications/
│       └── index.ts            # Notification API wrapper, requestPermission(), notify()
├── types/
│   ├── session.ts              # SessionRecord, TimerEvent
│   ├── settings.ts             # Settings
│   ├── stats.ts                # RangeStats, AnalysisStats, BarChartData
│   └── platform.ts             # Platform enum
├── App.tsx
└── main.tsx
```

### Guiding principles for the structure

- **`lib/` contains no React** — pure TypeScript functions and classes, independently testable
- **`components/` contains no business logic** — only rendering and user interaction, delegating to contexts and hooks
- **`contexts/` owns side effects** — side effects (localStorage writes, IndexedDB writes, audio playback, notifications) happen in context providers reacting to state, not in components
- **`hooks/` are thin consumers** — they exist to give components a clean API over contexts, not to hold state themselves

---

## TypeScript Types

All domain types are defined in `src/types/`. These are the source of truth — lib, contexts, and components all import from here.

```typescript
// types/session.ts

// TimerEvent is used ONLY inside the reducer (TimerState.currentSessionEvents) while a
// session is live. It is never persisted to IndexedDB. On session completion the event
// list is collapsed into a SessionRecord by lib/db/sessions.ts (see "Collapse on write").
export type TimerEventType = 'start' | 'pause' | 'resume' | 'end'

export interface TimerEvent {
  type: TimerEventType
  timestamp: number  // Unix ms
}

export type SessionType = 'focus' | 'short_break' | 'long_break'
export type SessionMode = 'pomodoro' | 'flowmodoro'

// 'skip' — user pressed Skip. Whether the session counts toward stats is derived at
// query time from netActiveMs / plannedDuration >= threshold, so changing the threshold
// applies consistently to all history rather than freezing a judgment at write time.
// 'abandoned' — session was too stale to auto-complete on resume (future feature).
// 'stopped' — user pressed Stop to end the session early and reset the timer.
// Skipped BREAKS produce no SessionRecord at all.
export type EndReason = 'natural' | 'skip' | 'abandoned' | 'stopped'

export interface SessionRecord {
  // Meta
  schemaVersion: 1                // increment when shape changes; used by import migration
  id: string

  // Time — the three fields ~25 metrics actually consume; indexed and precomputed
  startedAt: number               // epoch ms; IndexedDB primary time index
  endedAt: number                 // epoch ms of terminal event
  netActiveMs: number             // (endedAt - startedAt) minus sum of pause durations; precomputed on write

  // Classification
  sessionType: SessionType
  mode: SessionMode
  endReason: EndReason

  // Loop context (snapshot at session start)
  sessionIndex: number            // 1-based position within the loop

  // Plan (snapshot at session start)
  plannedDuration: number         // ms; Flowmodoro uses configured Focus Duration as reference

  // Flowmodoro only
  flowmodoroDerivedBreakMs?: number  // focus sessions only: focusElapsed ÷ breakRatio (ms)

  // Pause intervals — precomputed from TimerEvent[] on collapse; raw events are discarded.
  // Stored now to enable future pause analytics (avg pause duration, pause count, etc.)
  // without a schema migration. Currently unused by stats derivation.
  pauses: { pausedAt: number; resumedAt: number }[]

  // Timezone anchoring
  // Storing the device's UTC offset at startedAt prevents historical data from silently
  // shifting when the user travels. Stats derivation uses this offset to bucket sessions
  // into local days (via bucketDay). Hourly charts bin by local clock hour (what users
  // expect), accepting the theoretical 25-hour day when DST falls back.
  tzOffsetMinutes: number         // positive = ahead of UTC (e.g. UTC+2 → +120)
}

// Skipped breaks produce NO SessionRecord. breakComplianceRate is derived as:
//   breakRecords.length / completedFocusRecords.length
// Completion status is NOT stored — derived at query time as:
//   netActiveMs / plannedDuration >= settings.countSessionAfterPercent / 100
// This ensures threshold changes apply retroactively to all history.
```

```typescript
// types/settings.ts

export interface Settings {
  // Timer
  focusDuration: number           // minutes
  shortBreakDuration: number      // minutes
  longBreakDuration: number       // minutes
  sessionsPerLoop: number
  countSessionAfterPercent: number // 0–100

  // Behaviour
  autoStartBreaks: boolean
  autoStartFocus: boolean
  dailyStreakGoalMinutes: number
  mode: 'pomodoro' | 'flowmodoro'
  flowmodoroBreakRatio: number
  dayStartHour: number            // 0–23.5, in 0.5 increments

  // Notifications
  soundAlertsEnabled: boolean
  volume: number                  // 0–1
  desktopNotificationsEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsPerLoop: 4,
  countSessionAfterPercent: 50,
  autoStartBreaks: false,
  autoStartFocus: false,
  dailyStreakGoalMinutes: 60,
  mode: 'pomodoro',
  flowmodoroBreakRatio: 5,
  dayStartHour: 0,
  soundAlertsEnabled: true,
  volume: 0.7,
  desktopNotificationsEnabled: false,
}
```

```typescript
// types/timer.ts

export type TimerPhase =
  | 'idle'
  | 'focus_running'
  | 'focus_paused'
  | 'break_running'
  | 'break_paused'

export interface TimerState {
  phase: TimerPhase
  loopPosition: number            // 0-indexed focus session within the loop
  sessionType: 'focus' | 'short_break' | 'long_break'
  plannedDuration: number         // ms, from settings at session start
  remainingMs: number
  endTimestamp: number | null     // Date.now() + remainingMs, for backgrounding
  currentSessionEvents: TimerEvent[]
  currentSessionId: string | null
}

export type TimerAction =
  | { type: 'PLAY_PAUSE' }
  | { type: 'SKIP' }
  | { type: 'TICK'; now: number }
  | { type: 'SESSION_END' }
  | { type: 'LOOP_RESET' }
  | { type: 'ABANDONED_SESSION'; now: number }
  | { type: 'SETTINGS_CHANGED'; settings: Settings }
  | { type: 'RESTORE'; state: TimerState }
```

```typescript
// types/stats.ts

export type StatsRange = 'day' | 'week' | 'month' | 'year'

export interface BarChartEntry {
  label: string          // "9am", "Mon", "16", "Mar"
  focusMinutes: number
  isCurrent: boolean     // Day view: current hour. Week/Month: today. Year: current month.
}

export interface RangeStats {
  heroMinutes: number
  chip1: string          // formatted label e.g. "4 sessions"
  chip2: string          // e.g. "Best: Fri"
  chip3: string          // e.g. "Avg: 2.7h"
  bars: BarChartEntry[]
  details: { label: string; value: string; accent?: boolean }[]
}

export interface AnalysisStats {
  calendarHeatmap: { date: string; minutes: number }[]
  focusByHour: number[]           // index 0–23, average focus minutes per hour
  focusByDayOfWeek: number[]      // index 0–6 (Mon=0); derivation must remap from Date.getDay() (Sun=0) to this scheme
  sessionLengthBuckets: { rangeLabel: string; count: number }[]  // buckets: "<10", "10–20", "20–30", "30–45", "45–60", "60+"
  densityMatrix: number[][]       // [dayOfWeek 0–6 Mon=0][hour 0–23] — value is average focus minutes per cell
  allTimeMinutes: number
  allTimeSessions: number
  allTimeActiveDays: number
  longestSessionMinutes: number
  bestDayMinutes: number
  longestStreak: number
  completionRate: number          // 0–1
  breakComplianceRate: number     // 0–1, derived as breakRecords.length / completedFocusRecords.length
  avgMinutesToFirstSession: number
}
```

---

## Context Architecture

Three contexts — each with a clear, non-overlapping responsibility.

### SettingsContext

**Responsibility:** owns the current settings, persists to localStorage, exposes an update function.

```typescript
interface SettingsContextValue {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  resetAll: () => void
}
```

**Implementation notes:**
- `useReducer` with a `UPDATE_SETTING` action that merges one key-value pair
- A `useEffect` writes the full settings object to localStorage on every state change
- On mount, reads from localStorage and merges with `DEFAULT_SETTINGS` (handles missing keys from future additions)
- `resetAll` dispatches `RESET_ALL` which returns `DEFAULT_SETTINGS`

**Why not `useState`?** `useReducer` makes `resetAll` a clean single action rather than multiple `setState` calls.

---

### TimerPhaseContext + TimerClockContext

Timer state is split across two contexts to avoid re-rendering the entire component tree on every 100ms tick.

**`TimerPhaseContext`** — owns all semantic state. Updates only on phase transitions, settings changes, and loop resets (infrequent).

```typescript
interface TimerPhaseContextValue {
  phase: TimerPhase
  loopPosition: number
  sessionType: SessionType
  plannedDuration: number
  endTimestamp: number | null
  currentSessionEvents: TimerEvent[]
  currentSessionId: string | null
  dispatch: React.Dispatch<TimerAction>
}
```

**`TimerClockContext`** — owns only `remainingMs`. Updates every 100ms while running.

```typescript
interface TimerClockContextValue {
  remainingMs: number
}
```

`AppFrame`, `SessionDots`, `SkipButton`, and the Navbar subscribe only to `TimerPhaseContext` — they never re-render from ticks. `ProgressRing` and `TimeDisplay` subscribe to `TimerClockContext` and re-render at 10Hz, but they are leaf nodes with trivial render cost.

**Reducer:** `lib/timer/reducer.ts` is pure. It produces a full `TimerState` (including `remainingMs`) on every action. The provider layer splits this into the two contexts.

**Side effects:** the phase provider watches `phase` transitions via `useEffect` and triggers audio, notifications, and session writes — identical to before, now just isolated to the phase context provider.

**Tick loop:** a `setInterval` at 100ms runs inside `TimerClockProvider`. On each tick it computes `remainingMs = endTimestamp - Date.now()` directly (no reducer call needed), sets it into the clock context's state, and fires `SESSION_END` via the phase dispatch when `remainingMs ≤ 0`. This avoids dispatching `TICK` actions through the reducer entirely.

**Backgrounding:** `useVisibilityChange` fires when the tab becomes visible. The clock provider recalculates `remainingMs` from `endTimestamp` immediately on restore. If `endTimestamp` is in the past, it dispatches `SESSION_END` to the phase context.

**localStorage persistence:** on phase state changes, serialize `TimerState` (including `remainingMs` snapshot) to localStorage. On mount, attempt to restore via `RESTORE`.

**Interaction with SettingsContext:** `useEffect` on settings inside `TimerPhaseProvider` dispatches `SETTINGS_CHANGED`.

**Dependency order:** both timer providers nest inside `SettingsProvider`. `TimerClockProvider` nests inside `TimerPhaseProvider` since it needs the phase dispatch for `SESSION_END`.

---

### Extension: Bifurcated Timer Strategy

Extension popups are ephemeral HTML documents. When the popup closes, React unmounts and both timer contexts are destroyed — killing any tick interval and losing state. This directly violates the PRD requirement that the timer continues running when the popup closes.

**The fix is platform-specific timer ownership.**

**Web / PWA build (`VITE_PLATFORM=web`):** `TimerPhaseProvider` and `TimerClockProvider` run the reducer and tick loop locally inside React, as described above.

**Extension build (`VITE_PLATFORM=extension`):** a three-layer architecture replaces the React-owned state machine.

---

#### Why not the service worker?

MV3 background service workers are ephemeral. Chrome terminates them after ~30 seconds of inactivity and will not keep one alive for a running timer. A `setInterval` in a service worker will freeze when Chrome kills it. Additionally, service workers have no DOM access and therefore cannot use the Web Audio API — which the PRD requires for audio alerts at phase transitions.

#### Why not `chrome.alarms`?

`chrome.alarms` has a minimum granularity of 1 minute in production. It cannot fire at the exact second a 25-minute-and-14-second session ends. It is unsuitable for a seconds-precise timer.

#### The Offscreen Document (the engine)

The Offscreen Document API (available since Chrome 109) provides an invisible HTML page that the extension spins up in the background. Unlike service workers, offscreen documents have full DOM access — `setInterval`, `requestAnimationFrame`, and the Web Audio API all work reliably. Chrome will not arbitrarily suspend an offscreen document that holds a valid justification.

`AUDIO_PLAYBACK` is the justification used here. It is legitimate: the offscreen document genuinely plays audio at session boundaries. This keeps the document alive throughout a focus session.

The offscreen document owns:
- The pure reducer (`lib/timer/reducer.ts` — imported directly, same file as the web build)
- The `setInterval` tick loop
- `endTimestamp` written to `chrome.storage.local` on every tick
- Web Audio API playback at phase transitions

#### The service worker (the broker)

The service worker is stripped of all timer logic. Its responsibilities are:
- On first timer start: call `chrome.offscreen.createDocument()` to spin up the offscreen document
- Relay messages between the popup and offscreen document
- Fire `chrome.notifications` when the offscreen document reports a phase transition (notifications are a service worker API, not available in offscreen documents)
- Go idle between messages — termination is harmless since it holds no state

#### The React popup (the dumb client)

```
TimerPhaseProvider (extension mode)
  - on mount: sends GET_STATE to offscreen document via service worker relay
  - receives current phase, loopPosition, plannedDuration, endTimestamp
  - listens for phase-change broadcasts → updates React state
  - dispatch → sends DISPATCH message to offscreen document

TimerClockProvider (extension mode)
  - on mount: reads endTimestamp from chrome.storage.local
  - drives its own requestAnimationFrame loop
  - each frame: remainingMs = endTimestamp - Date.now()
  - purely for rendering — it does not control session logic
  - if remainingMs ≤ 0 on open: treats session as expired, requests current state
```

The popup never owns authoritative timer state. It receives truth from the offscreen document and renders from `endTimestamp` locally. If the popup is closed and reopened mid-session, it reads `endTimestamp` from `chrome.storage.local` and immediately renders the correct remaining time.

#### Shared code

The pure reducer in `lib/timer/reducer.ts` is imported by both the offscreen document and the web/PWA `TimerPhaseProvider` — unchanged. All component and hook code is identical across builds. Only the provider implementations differ, selected at build time via `IS_EXTENSION`.

---

### StatsContext

**Responsibility:** owns the raw `SessionRecord[]` array fetched from IndexedDB. Provides a `refresh()` function for `TimerPhaseContext` to call after a session is written.

```typescript
interface StatsContextValue {
  sessions: SessionRecord[]
  loading: boolean
  refresh: () => Promise<void>
}
```

**Implementation notes:**
- On mount: calls `getAllSessions()` from `lib/db/sessions` and sets state
- `refresh()` refetches from IndexedDB and updates state — called by `TimerPhaseContext` after writing a completed session
- `clearAll()` calls `clearAllSessions()` then `refresh()`
- Import (via `lib/data/io.ts importAll()`) calls `refresh()` after all IndexedDB writes complete
- Derivation is NOT done here — raw sessions are passed to components, which derive what they need via `useMemo`

**Why raw sessions, not pre-derived stats?** The derivation functions are fast for realistic data volumes (years of sessions = tens of thousands of records at most). Deriving in components with `useMemo` means each view only pays for the derivation it needs, and the cache is per-component rather than a monolithic object.

---

## Provider Tree

```tsx
// App.tsx
<SettingsProvider>
  <TimerPhaseProvider>        {/* consumes SettingsContext; owns reducer + side effects */}
    <TimerClockProvider>      {/* consumes TimerPhaseContext; owns tick loop */}
      <StatsProvider>         {/* provides sessions to stats screens */}
        <AppFrame>            {/* reads timer phase for data-mode attribute */}
          <ActiveScreen />
          {activeScreen === 'analysis' ? <BackButton /> : <Navbar />}
        </AppFrame>
      </StatsProvider>
    </TimerClockProvider>
  </TimerPhaseProvider>
</SettingsProvider>
```

`TimerPhaseProvider` wraps `StatsProvider` because timer completion triggers a stats refresh — the phase provider calls `statsContext.refresh()` after writing a session. This requires `StatsProvider` to be a descendant, not an ancestor.

---

## Timer State Machine (Reducer)

The reducer in `lib/timer/reducer.ts` is a pure function: `(state, action) => state`. No imports from React, no side effects.

### State transitions

```
idle
  PLAY_PAUSE → focus_running
             initial state: phase='idle', sessionType='focus', loopPosition=0,
             plannedDuration=settings.focusDuration*60_000, remainingMs=plannedDuration

focus_running
  PLAY_PAUSE     → focus_paused
  TICK         → focus_running (decrement remainingMs) | SESSION_END if remainingMs ≤ 0
  SKIP         → [compute next phase based on settings, mark session complete if above threshold]
                 SKIP is a no-op in idle (button disabled)
  SESSION_END  → break_running | break_paused (depending on autoStartBreaks)
  LOOP_RESET   → focus_running (loopPosition = 0, timer continues unchanged)
  STOP         → idle (loopPosition preserved, remainingMs=focusDuration, session events cleared)

focus_paused
  PLAY_PAUSE     → focus_running
  SKIP         → [same as above; button disabled in idle]
  LOOP_RESET   → focus_paused (loopPosition = 0)
  STOP         → idle (same as focus_running)

break_running
  PLAY_PAUSE     → break_paused
  TICK         → break_running | SESSION_END
  SKIP         → focus_running | focus_paused (depending on autoStartFocus); break discarded, no record written
  SESSION_END  → focus_running | focus_paused
  LOOP_RESET   → break_running (loopPosition = 0; current break type/duration unchanged — it is mid-session)
  STOP         → idle (sessionType='focus', loopPosition preserved, remainingMs=focusDuration)

break_paused
  PLAY_PAUSE     → break_running
  SKIP         → focus_running | focus_paused; break discarded, no record written
  LOOP_RESET   → break_paused (loopPosition = 0; current break type/duration unchanged)
  STOP         → idle (same as break_running)

idle
  STOP         → idle (loopPosition reset to 0, remainingMs=focusDuration)

[all states]
  SETTINGS_CHANGED → plannedDuration unchanged (frozen at session start; new durations take
                     effect on the next session); remainingMs unchanged;
                     loopPosition clamped to sessionsPerLoop - 1 if sessionsPerLoop shrinks
  RESTORE          → hydrate from localStorage
  ABANDONED_SESSION → future: abandoned session detection. If (now - endTimestamp) >
                     plannedDuration + 10_min, write endReason='abandoned' and go idle.
                     Not implemented yet — the clock provider handles expiry via SESSION_END;
                     normal resume requires no reducer action since remainingMs is always
                     derived from endTimestamp - Date.now() in TimerClockProvider.
```

### Loop position logic

`loopPosition` is 0-indexed (0 to `sessionsPerLoop - 1`). After a focus session completes:
- If `loopPosition < sessionsPerLoop - 1`: next break is `short_break`, increment `loopPosition`
- If `loopPosition === sessionsPerLoop - 1`: next break is `long_break`, reset `loopPosition` to 0 after the long break

### Flowmodoro in the reducer

When `settings.mode === 'flowmodoro'`, focus sessions have no fixed end — `SESSION_END` is never triggered by the countdown. Instead, `SKIP` is the only way to end a focus session. The `plannedDuration` is still set (for the ring's 75% reference point and credit threshold), but `remainingMs` counts up instead of down.

The reducer tracks whether it is counting up or down based on the mode setting.

---

## Component Hierarchy

```
App
└── SettingsProvider > TimerPhaseProvider > TimerClockProvider > StatsProvider
    └── AppFrame                    [data-mode, accent glow, box shadow]
        ├── TimerScreen             [visible when activeScreen === 'timer'; uses both hooks]
        │   ├── SessionDots         [useTimerPhase: loopPosition, sessionsPerLoop, phase]
        │   │                       [useLongPress: reveals "Reset Loop" hint on long-press or touch-start+delay]
        │   │                       [CSS :hover also shows hint on desktop; JS handler required for mobile]
        │   ├── ProgressRing        [useTimerPhase: plannedDuration, mode; useTimerClock: remainingMs]
        │   │   │                   [wraps a <button>; autoFocus when IS_EXTENSION (PRD #89)]
        │   │   │                   [data-mode="focus" | "rest" — AppFrame rule: sessionType==='focus' ? 'focus' : 'rest', regardless of running/paused]
        │   │   ├── RingSVG         [pure SVG, receives fillFraction prop]
        │   │   └── RingInner
        │   │       ├── TimeDisplay [useTimerClock: remainingMs; Flowmodoro focus shows elapsed (counts up), others show remaining]
        │   │       └── StateLabel  [useTimerPhase: phase; idle → "Tap to Focus", focus_paused → "Tap to Focus", focus_running → "Focus", break_paused → "Tap to Rest", break_running → "Rest"]
        │   └── SkipButton          [useTimerPhase: dispatch → SKIP; disabled/hidden when phase === 'idle']
        ├── StatsScreen             [visible when activeScreen === 'stats']
        │   ├── RangeSwitcher       [local state: activeRange]
        │   └── RangePanel          [receives range, derives stats via useMemo]
        │       ├── HeroValue
        │       ├── ChipsRow
        │       ├── BarChart        [receives BarChartEntry[]]
        │       │   └── BarTooltip  [local state: tooltipIndex; outside-click handler on chart container clears tooltipIndex while any tooltip is open]
        │       └── DetailRows
        ├── FullAnalysisScreen      [visible when activeScreen === 'analysis']
        │   │                       [single useMemo(() => deriveAnalysisStats(sessions, settings), [sessions, settings]) at the screen level; all chart children receive slices of the result as props — avoids N passes over sessions]
        │   └── [chart components]  [all receive pre-derived AnalysisStats]
        ├── SettingsScreen          [visible when activeScreen === 'settings']
        │   ├── SettingsGroup       [receives label + children]
        │   │   └── SettingsRow     [receives label + control child]
        │   │       ├── Stepper
        │   │       ├── Toggle
        │   │       ├── VolumeSlider
        │   │       └── DayStartPicker
        │   └── ConfirmDialog       [portal, activated by danger actions]
        └── Navbar                  [reads activeScreen, dispatches setActiveScreen]
            └── NavTab × 3
```

### Component design principles

**`ProgressRing` receives a `fillFraction` prop (0–1), not raw timer state.** The parent (`TimerScreen`) calculates the fraction and passes it down. This keeps `ProgressRing` a pure display component, easily testable and reusable for Flowmodoro without internal mode logic.

**`RangePanel` derives stats via `useMemo` from raw sessions.** It receives `sessions: SessionRecord[]`, `range: StatsRange`, and `settings: Settings`. The derivation functions from `lib/stats/derive.ts` are called inside `useMemo`. The panel re-derives only when its sessions or range change.

**`SettingsGroup` and `SettingsRow` are layout components only.** They receive children, not knowledge of what control to render. The settings screen composes them:

```tsx
<SettingsGroup label="Timer">
  <SettingsRow label="Focus Duration">
    <Stepper value={settings.focusDuration} min={1} max={999}
      onChange={v => updateSetting('focusDuration', v)} />
  </SettingsRow>
</SettingsGroup>
```

**`ConfirmDialog` is a portal.** It renders into `document.body` via `createPortal`, ensuring it overlays the app frame regardless of stacking context. It is controlled by a boolean prop and calls an `onConfirm` / `onCancel` callback.

**`Stepper` touch targets and input.** The − and + buttons must have a minimum hit target of 44×44px (PRD #53). The numeric `<input>` carries `inputMode="numeric"` so mobile devices open a numeric keyboard.

---

## Screen Navigation

No URL router. Navigation state lives in `App.tsx`:

```typescript
type ActiveScreen = 'timer' | 'stats' | 'settings' | 'analysis'
const [activeScreen, setActiveScreen] = useState<ActiveScreen>('timer')
```

All four screens are rendered in the component tree; visibility is controlled by CSS (`display: none` or conditional rendering). The Full Analysis screen uses a CSS slide-in transition — it is always mounted but translated off-screen, transitioning to `translateX(0)` when active.

**Why always-mounted for Full Analysis?** So it can derive and render its charts without layout jank when first opened. The derivation cost is acceptable because it only runs when `sessions` changes.

**Why conditional rendering for Timer/Stats/Settings?** They share the same nav area and don't need slide transitions — instant swap is fine.

---

## Data Flow

```
SettingsContext (localStorage)
       │
       │ settings object
       ▼
TimerPhaseContext (useReducer + localStorage)
       │
       │ on session completion:
       │   1. writeSession(record) → IndexedDB
       │   2. statsContext.refresh()
       │
       ▼
StatsContext (IndexedDB → sessions[])
       │
       │ sessions[] passed to components via useStats()
       ▼
RangePanel / FullAnalysisScreen
  useMemo(() => deriveRangeStats(sessions, range, settings))
  useMemo(() => deriveAnalysisStats(sessions, settings))
       │
       ▼
  Display components (receive derived data as props)
```

This is a strict one-way flow. No component writes to a context other than through the exposed action functions.

---

## Custom Hooks

### `useTimerPhase()`

Thin wrapper over `useContext(TimerPhaseContext)`. Returns the full phase context value including `dispatch`. Used by components that respond to state transitions: `SessionDots`, `SkipButton`, `AppFrame`, `Navbar`, `StateLabel`.

### `useTimerClock()`

Thin wrapper over `useContext(TimerClockContext)`. Returns `{ remainingMs }`. Used by components that update on every tick: `ProgressRing` (for `fillFraction`) and `TimeDisplay` (for formatted time).

Components that need both — `TimerScreen` being the main example — import both hooks directly. This makes each component's context dependencies explicit at the call site rather than hidden inside a composite hook.

### `useSettings()`

Thin re-export of `useContext(SettingsContext)`. Primarily exists to avoid importing `SettingsContext` directly throughout the codebase.

### `useStats()`

```typescript
function useStats() {
  return useContext(StatsContext)  // { sessions, loading, refresh }
}
```

### `useVisibilityChange(callback: () => void)`

```typescript
function useVisibilityChange(callback: () => void) {
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') callback() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [callback])
}
```

Used by `TimerClockProvider` to dispatch `ABANDONED_SESSION` when the tab becomes visible after a long absence.

---

## Ring Fill Calculation

`computeFillFraction` lives in `lib/timer/` (not in a component). It is a pure function:

```typescript
function computeFillFraction(state: TimerState, settings: Settings): number {
  if (state.phase === 'idle') return 1

  const isFlowmodoro = settings.mode === 'flowmodoro' && state.sessionType === 'focus'

  if (!isFlowmodoro) {
    // Pomodoro: drain from 1 to 0. Clamp to [0, 1] in case remainingMs > plannedDuration
    // (possible when Focus Duration is shortened mid-session via settings).
    return Math.min(1, Math.max(0, state.remainingMs / state.plannedDuration))
  }

  // Flowmodoro: count up with asymptotic curve.
  // remainingMs counts downward from plannedDuration and is ALLOWED to go negative past the target.
  // elapsed = plannedDuration - remainingMs is always non-negative (and grows past plannedDuration).
  const elapsed = state.plannedDuration - state.remainingMs
  const t = elapsed
  const target = state.plannedDuration

  if (t <= target) {
    return (t / target) * 0.75
  }
  const overtime = t - target
  const k = 3
  return 0.75 + 0.25 * (1 - Math.exp(-k * overtime / target))
}
```

**Flowmodoro `remainingMs` contract:** `remainingMs` counts downward from `plannedDuration` and goes negative while the user continues past the target. This is intentional — `elapsed = plannedDuration - remainingMs` always gives the true elapsed time. `TimeDisplay` must check for this case: when `settings.mode === 'flowmodoro'` and phase is `focus_running`/`focus_paused`, display `elapsed` (counting up) rather than `remainingMs` (which would be negative).

The SVG ring uses this fraction to compute `stroke-dasharray`:

```typescript
const CIRCUMFERENCE = 2 * Math.PI * 102  // ≈ 641
const progressArc = fillFraction * CIRCUMFERENCE
const gapArc = CIRCUMFERENCE - progressArc
// stroke-dasharray={`${progressArc} ${gapArc}`}
```

---

## IndexedDB Layer

`lib/db/index.ts` opens the database and defines the store schema via `idb`:

```typescript
const DB_NAME = 'statmodoro'
const DB_VERSION = 1

const db = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const store = db.createObjectStore('sessions', { keyPath: 'id' })
      store.createIndex('by-started-at', 'startedAt')    // range queries for all time-based views
      store.createIndex('by-session-type', 'sessionType') // cheap focus/break separation for compliance metrics
    }
    // future versions: add migration cases here, calling migrate() from lib/db/migrations.ts
  }
})
```

`lib/db/sessions.ts` exposes the async API:

```typescript
async function writeSession(record: SessionRecord): Promise<void>
async function getAllSessions(): Promise<SessionRecord[]>
async function clearAllSessions(): Promise<void>
```

All IndexedDB interaction is isolated here. Nothing else in the codebase imports from `idb` directly.

**Collapse on write.** The reducer keeps `currentSessionEvents: TimerEvent[]` in `TimerState` while a session is live — it is the right shape for the state machine. On session completion, `writeSession` in `lib/db/sessions.ts` collapses the event list into the canonical `SessionRecord` shape: it derives `startedAt` (first `start` event), `endedAt` (terminal event), `netActiveMs` (wall time minus pause durations), sets `endReason`, records `tzOffsetMinutes`, and sets `schemaVersion: 1`. `TimerEvent[]` never touches IndexedDB.

**Schema versioning:** when `SessionRecord` evolves, increment `DB_VERSION` and add a migration branch in `upgrade()`. `lib/db/migrations.ts` exports a single `migrate(record: any): SessionRecord` function called by both the upgrade path and the import path — one function, one test surface.

---

## Audio

`lib/audio/index.ts` wraps the Web Audio API:

```typescript
class AudioManager {
  private ctx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private buffer: AudioBuffer | null = null

  async load(url: string): Promise<void>
  setVolume(volume: number): void    // 0–1
  play(): void
}

export const audioManager = new AudioManager()
```

The `AudioContext` is created lazily on first user interaction (browser requirement). `TimerPhaseProvider` calls `audioManager.play()` on phase transitions when `settings.soundAlertsEnabled` is true.

---

## Notifications

`lib/notifications/index.ts`:

```typescript
async function requestPermission(): Promise<boolean>
function notify(title: string, body: string): void
function isGranted(): boolean
```

`TimerPhaseProvider` calls `notify()` on phase transitions when `settings.desktopNotificationsEnabled` is true and `isGranted()` returns true.

The SettingsContext calls `requestPermission()` lazily when `desktopNotificationsEnabled` is first set to `true`. If denied, it immediately calls `updateSetting('desktopNotificationsEnabled', false)`.

---

## Platform Detection

A Vite env variable `VITE_PLATFORM` is set per build target:

```
VITE_PLATFORM=web      # development + PWA build
VITE_PLATFORM=extension # extension build
```

Consumed via:

```typescript
// types/platform.ts
export const IS_EXTENSION = import.meta.env.VITE_PLATFORM === 'extension'
```

Used in one place: the pop-out button in `AppFrame` renders only when `IS_EXTENSION` is true. No other platform branching exists in the React code — the extension reuses the app without modification.

The extension build is a separate Vite config (`vite.extension.config.ts`) that sets `VITE_PLATFORM=extension` and outputs to a different directory.

---

## Animation Strategy

All animations are CSS transitions — no animation library (Framer Motion, etc.).

- **Accent colour transitions:** `transition: stroke 0.35s ease` on the SVG ring, `transition: color 0.35s ease` on text, `transition: background 0.35s ease` on the glow and dots. These are driven by swapping `data-mode` on `AppFrame`.
- **Ring hover states:** handled by CSS pseudo-classes (`:hover` on the ring wrapper). No JavaScript state needed.
- **Toggle animation:** CSS `transform: translateX` on the thumb with `transition: 0.28s ease`.
- **Full Analysis slide-in:** `transform: translateX(100%)` by default, `translateX(0)` when active. `transition: transform 0.3s ease`.
- **Range switcher underline:** `transform: scaleX(0)` → `scaleX(1)` via CSS class toggle.
- **Dot hint reveal:** background colour transition on each dot via CSS `:hover` on the container (desktop). On mobile, the "Reset Loop" hint is revealed via `useLongPress` — a pointer-down event sets a `hintVisible` boolean in component state after ~500ms, pointer-up/cancel clears it. The CSS `:hover` descendant selector handles desktop; the JS state handles touch.

---

## Key Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| State management | React Context + useReducer, split into phase + clock contexts | Avoids 10Hz re-renders propagating to the full tree; no external library needed |
| Routing | State variable in App.tsx | Popup and PWA don't need URL-driven navigation |
| Tailwind token strategy | `@theme` for static, CSS vars for dynamic | Tailwind v4 supports this natively; dynamic accent can't live in @theme |
| Accent system | `data-mode` attribute on AppFrame | Semantic, single point of change, CSS descendants recolour automatically |
| Stats derivation | On-the-fly in components via useMemo | No cache to invalidate; derivation is fast; each view pays only for what it needs |
| Side effects | In context providers via useEffect | Keeps reducer pure; side effects co-located with the state that drives them |
| IndexedDB access | Isolated to lib/db/ | Single async boundary; everything else is synchronous |
| Session persistence shape | Canonical record (startedAt/endedAt/netActiveMs/endReason) not event log | Events are internal reducer state; canonical shape is what every metric actually queries |
| Collapse on write | lib/db/sessions.ts collapses TimerEvent[] → SessionRecord on completion | Reduces query-time work to zero; endReason is unambiguous; TimerEvent[] never persisted |
| Timezone anchoring | tzOffsetMinutes per record | Prevents historical data from shifting silently when user travels |
| DST / hourly binning | Local clock hour | Matches user expectation; 25-hour autumn days are accepted as the less-surprising tradeoff |
| Abandoned session detection | Grace period = plannedDuration + 10 min in ABANDONED_SESSION | Prevents stale endTimestamps from injecting phantom completed sessions |
| Migration function | Single migrate() in lib/db/migrations.ts, used by upgrade() and importAll() | One function, one test surface for both in-place and import migrations |
| Export envelope | Versioned JSON object wrapping sessions[] | Allows graceful forward/backward compat; v1 importing v2 can refuse with a clear message |
| Ring fill | Pure function outside React | Independently testable; no component logic |
| Extension timer ownership | Offscreen Document (not service worker) | MV3 service workers are ephemeral and lack DOM/Web Audio access; offscreen documents survive with AUDIO_PLAYBACK justification |
| Platform branching | Single env var, one usage | Minimal platform surface; only provider implementations differ between web and extension builds |
| Animation | CSS transitions only | Zero JS overhead; `prefers-reduced-motion` handled at the CSS layer |
| data-mode rule | `sessionType === 'focus' ? 'focus' : 'rest'`, regardless of running/paused | Accent is semantically about session type, not timer activity; purple stays purple while paused |
| Favicon / icon update | `useEffect` in `AppFrame` keyed on `sessionType` updates `<link rel="icon">` dynamically | Single owner; extension uses `chrome.action.setIcon()` from offscreen document instead |
| Long-press for session dots | `useLongPress` hook (pointer events, ~500ms) | Mobile has no :hover; hint reveal requires explicit touch handler |
