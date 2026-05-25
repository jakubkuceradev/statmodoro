# Statmodoro — Product Requirements Document

## Problem Statement

Productivity-focused users want a Pomodoro timer that not only helps them stay on task but also gives them meaningful insight into their focus habits over time. Existing solutions are either too simple (no statistics) or too invasive (accounts, cloud sync, subscriptions). Users want a fast, minimal, privacy-first timer they can trust completely — one where all data stays on their device — while still surfacing the kind of deep statistics that help them understand and improve their focus patterns.

---

## Solution

Statmodoro is a privacy-first Pomodoro timer with extensive local statistics. All data stays on the user's device. It is built first as a mobile-optimised web application (with a desktop "stage" pattern), then progressively enhanced into a PWA and a Chromium extension — reusing as much code as possible across platforms.

The core experience is a minimal, beautiful timer with a circular progress ring, session dots, and a bottom navigation bar giving access to Stats and Settings. The statistics screen is the product's primary differentiator: a quick-glance view for daily use, and a Full Analysis view for deeper insight into productivity patterns.

A Flowmodoro mode (focus as long as you want, break proportional to focus time) will be supported alongside the standard Pomodoro mode.

---

## User Stories

### Timer — Core Interaction

1. A circular progress ring fills as the session progresses, giving a glanceable sense of elapsed time.
2. Tapping the ring pauses and resumes the timer — it is the only pause/resume control.
3. The ring label reads **"Tap to Focus"** whenever a focus session is paused, for any reason including the initial idle state.
4. The ring label reads **"Tap to Rest"** whenever a break is paused, for any reason.
5. The ring label reads **"Focus"** while a focus session is running.
6. The ring label reads **"Rest"** while a break is running.
7. The app opens directly on the Timer screen with default settings loaded — no onboarding.
8. Focus sessions use purple (`#9747FF`) as the accent colour; breaks use green (`#34C759`).
9. A radial gradient behind the ring matches the current accent colour, shifting with each state change.

### Timer — Session Flow

10. Focus sessions are always followed by a break (short or long depending on loop position), with no manual sequencing required.
11. If Auto-Start Breaks is ON, the break starts running immediately when focus ends.
12. If Auto-Start Breaks is OFF, the break starts paused ("Tap to Rest") when focus ends.
13. If Auto-Start Focus is ON, the next focus session starts running immediately when a break ends.
14. If Auto-Start Focus is OFF, the next focus session starts paused ("Tap to Focus") when a break ends.
15. Loops always repeat after the long break — there is no end state.
16. The final break of each loop is always the long break, replacing what would otherwise be a short break.

### Timer — Session Dots

17. Session dots at the top of the timer screen represent the user's position in the current loop.
18. Completed sessions appear as small filled dots, the active session as a wider pill, and future sessions as faint dots.
19. Hovering or long-pressing the dots reveals a "Reset Loop" hint above them.
20. Tapping the dots resets the loop position to session 1 without interrupting the running timer. If focus is running it counts as session 1; if a break is running the next focus will count as session 1.

### Timer — Skip

21. A skip button below the ring advances to the next phase immediately with no confirmation.
22. A skipped focus session counts as completed if elapsed time exceeded the "Count Session After" threshold.
23. Skipping a break discards it silently with no stats impact.

### Timer — Backgrounding & Accuracy

24. The timer remains accurate when the user switches to another app or tab.
25. On resume, remaining time is recalculated from a stored `endTimestamp` (`Date.now() + remainingMs`), written to localStorage on every tick.
26. If the stored `endTimestamp` has already passed when the app resumes, the session is treated as naturally completed and state advances accordingly.

### Stats — Quick Glance

27. A Stats tab in the bottom nav gives access to statistics without leaving the app.
28. The user can switch between Day, Week, Month, and Year range views.
29. Each range view leads with a hero total focus time value.
30. Three chips below the hero show: sessions count for the period, best sub-period, and average — with the following definitions per view:

    **Day:** sessions today · best single-day session count (all-time) · avg daily sessions (last 30 days)

    **Week:** sessions this week · best single day of the week · avg daily focus time this week

    **Month:** sessions this month · best week of the month · avg daily focus time this month

    **Year:** sessions this year · best month · avg monthly focus time this year

31. A horizontally scrollable bar chart shows focus time distribution: hourly for Day, daily for Week and Month, monthly for Year.
32. The bar representing the current period is highlighted in the accent colour.
33. Tapping a bar shows a tooltip with the exact focus time for that slot; tapping elsewhere dismisses it.
34. Bar heights scale relative to the tallest bar in the current view.
35. All bars render from day one (at zero height), filling naturally as sessions accumulate.
36. Detail rows beneath the chart per view:

    **Day:** sessions completed · avg session length · longest session · total breaks taken · current streak · best streak

    **Week:** sessions completed · avg daily focus · best day · days active · total breaks · current streak · best streak

    **Month:** sessions completed · avg daily focus · best day · days active · total breaks · current streak · best streak

    **Year:** sessions completed · avg monthly focus · best month · active days · total breaks · current streak · best streak

37. A "Full Analysis" button at the bottom of the Stats screen opens the deep-dive view.

### Stats — Full Analysis

38. The Full Analysis view slides in as a full-screen panel; the bottom navbar is replaced by a back button.
39. A GitHub-style calendar heatmap shows daily focus minutes over the past year.
40. A chart shows average focus time by hour of day across all recorded history.
41. A chart shows average focus time by day of week across all recorded history.
42. A session length distribution histogram shows how often sessions fall into different duration buckets.
43. A 7-day × 24-hour heatmap shows focus density by day-of-week and hour-of-day.
44. All-time totals are displayed: total focus time, total sessions, total active days.
45. Personal records are surfaced: longest single session, best single day, longest streak.
46. Pomodoro completion rate: percentage of started sessions that crossed the credit threshold.
47. Break compliance rate: percentage of breaks taken vs skipped.
48. Average time to first session: time elapsed after the configured day start before the first focus session.

### Streaks

49. A day counts toward the streak if total net focus time for that day meets or exceeds the Daily Streak Goal (in minutes).
50. The streak breaks if a day passes without hitting the goal.
51. The day boundary is defined by the Day Start Time setting, applied in the user's local timezone.

### Settings

52. A Settings tab in the bottom nav gives access to all configuration.
53. All numeric settings support direct text input as well as − and + buttons. On mobile, the field opens a numeric keyboard (`inputmode="numeric"`). Buttons are at least 44px touch targets.

**Timer group:**

54. Focus Duration — range 1–999 min, default 25 min.
55. Short Break — range 1–99 min, default 5 min.
56. Long Break — range 1–99 min, default 15 min.
57. Sessions Per Loop — range 2–20, default 4.
58. Count Session After — range 0–100%, step 5%, default 50%. A session only counts as completed if elapsed time exceeded this percentage of planned duration.

**Behaviour group:**

59. Auto-Start Breaks toggle — default OFF.
60. Auto-Start Focus toggle — default OFF.
61. Daily Streak Goal — range 1–999 min, default 60 min.
62. Mode selector — Pomodoro | Flowmodoro, default Pomodoro. Settings-only; no mode indicator on the timer screen.
63. Flowmodoro Break Ratio — range 1–999, default 5. Visible only when Mode = Flowmodoro.
64. Day Start Time — 30-minute increments across the full 24-hour range, default 00:00.

**Notifications group:**

65. Sound Alerts toggle — default ON. Plays at phase transitions.
66. Volume slider — default 70%.
67. Desktop Notifications toggle — default OFF. Fires at phase transitions. Browser permission is requested lazily the first time this is enabled.

**Data group:**

68. Export Data — downloads all session records and settings as `statmodoro-export-{YYYY-MM-DD}.json`.
69. Import Data — restores from a previously exported JSON file, replacing all current data. Requires a confirmation dialog.
70. Clear All History — deletes all session records. Requires a confirmation dialog.
71. Reset All Settings — restores all settings to defaults without touching session history. Requires a confirmation dialog.

### Flowmodoro Mode

72. During a Flowmodoro focus session the ring counts up (filling) rather than draining.
73. Ring fill is linear from 0% to 75% up to the configured Focus Duration, then asymptotic toward 100% past that point: `fill = 0.75 + 0.25 × (1 - e^(-k × overtime / target))`.
74. The user ends a Flowmodoro focus session by pressing the skip button.
75. Break duration is calculated as `focusElapsed ÷ Flowmodoro Break Ratio` and stored on the session record.
76. Flowmodoro sessions are combined with Pomodoro sessions in all stats views. The `mode` field is stored on each record for potential future filtering.

### Notifications & Alerts

77. A sound alert plays at each phase transition (focus → break, break → focus), gated by Sound Alerts and Volume settings.
78. A desktop notification fires at each phase transition, gated by the Desktop Notifications setting.
79. The app respects the OS `prefers-reduced-motion` media query in CSS.

### PWA

80. Statmodoro is installable as a PWA from the browser.
81. The app works fully offline after the first load.

### Chromium Extension

82. Statmodoro runs as a browser extension popup (350×500 px), reusing the same React app.
83. The timer continues running when the popup is closed; state lives in the background service worker.
84. The extension icon badge shows remaining minutes in the current accent colour; blank when paused or idle.
85. The extension icon variant switches between focus (purple) and rest (green) on each state change.
86. A subtle pop-out icon button in the top-right corner of the popup (extension context only) opens the PWA in a new tab. Not rendered in the PWA itself.

### Desktop Stage

87. On desktop browsers, the mobile app frame (350×500 px) is centred on a `#111` background.
88. No additional UI elements surround the frame for MVP.

### Accessibility & UX Polish

89. The ring button receives focus automatically when the extension popup opens, enabling Enter to pause/resume without a click.
90. All destructive actions (Clear All History, Reset All Settings, Import) are gated behind a confirmation dialog.
91. Duration settings take effect on the next session; `plannedDuration` is frozen at session start so the current session's ring fill and credit threshold are unaffected.

---

## Implementation Decisions

### Platform Progression
- **Phase 1**: Mobile-optimised web app (React + Vite + TypeScript). Desktop wraps in stage pattern.
- **Phase 2**: PWA — add Service Worker, web app manifest, offline support.
- **Phase 3**: Chromium extension — reuse the React app, add background service worker for timer state, badge updates via `chrome.action.setIcon()` and `chrome.action.setBadgeText()`.

### State Management
- React Context + `useReducer` for the timer state machine. No external state library needed.
- Three contexts: `TimerContext` (state machine + current session), `SettingsContext` (persisted to localStorage), `StatsContext` (read/write to IndexedDB).

### Timer State Machine
States: `idle | focus_running | focus_paused | break_running | break_paused`

Transitions driven by: tap-ring, skip, session-end, settings-change, loop-reset.

### Persistence
- **localStorage**: current timer state (including `endTimestamp` for backgrounding accuracy), settings.
- **IndexedDB** (via `idb` library): all session event records.

### Session Record Schema
Sessions are stored as canonical records — not event logs. The reducer uses a `TimerEvent[]` list internally while a session is live; on completion, `lib/db/sessions.ts` collapses it into the persisted shape:

```
{
  schemaVersion: 1,
  id: string,
  startedAt: number,           // epoch ms; IndexedDB index key
  endedAt: number,             // epoch ms of terminal event
  netActiveMs: number,         // precomputed: wall time minus pause durations
  sessionType: 'focus' | 'short_break' | 'long_break',
  mode: 'pomodoro' | 'flowmodoro',
  endReason: 'natural' | 'skip' | 'abandoned',
  sessionIndex: number,        // 1-based position within loop at session start
  plannedDuration: number,     // ms; Flowmodoro uses configured Focus Duration as reference
  flowmodoroDerivedBreakMs?: number,  // focus sessions only
  tzOffsetMinutes: number,     // device UTC offset at startedAt; anchors historical day boundaries
}
```

Skipped breaks produce no record. Break compliance is `breakRecords.length / completedFocusRecords.length`.

### Backgrounding Strategy
On every tick while running, write `endTimestamp = Date.now() + remainingMs` to localStorage. On visibility restore or popup open, derive remaining time from `endTimestamp`. If `endTimestamp` is in the past, treat as naturally completed and advance state.

### Stats Derivation
All stats are derived on-the-fly from raw IndexedDB session records — no aggregated cache. Bar chart data, streaks, and Full Analysis metrics are all computed from the event log at render time. Memoised with `useMemo` to avoid recomputation on every render.

### Streak Logic
A day is "active" if total net focus time (from completed sessions) meets or exceeds the Daily Streak Goal. Day boundary is determined by the Day Start Time setting, applied in local timezone.

### Flowmodoro Ring Math
Ring fill percentage for Flowmodoro:
- `t ≤ target`: `fill = (t / target) × 0.75`
- `t > target`: `fill = 0.75 + 0.25 × (1 - e^(-k × (t - target) / target))`

Where `k` is a tunable constant (≈ 3) controlling how quickly the ring approaches full past the target.

### Skip + Credit Threshold
On skip: compute `elapsed / plannedDuration`. If `≥ Count Session After %`, mark `completed: true` and record the session. Break skips always discard silently.

### Extension Architecture
- Timer state lives in the extension background service worker.
- Popup renders the same React app; communicates with background via `chrome.runtime.sendMessage`.
- Badge and icon updated by background service worker on each state change.
- "Pop out" button opens the PWA URL in a new tab (extension context only, detected via build-time env flag).

### Settings Applied Mid-Session
When settings change: update `plannedDuration` for the current session. `remainingMs` is unchanged. Ring recalculates fill based on new `plannedDuration`. Takes effect immediately.

### Import/Export
- Export: serialise all IndexedDB records + localStorage settings into a versioned envelope. Trigger browser file download with filename `statmodoro-export-{YYYY-MM-DD}.json`.

  Envelope format:
  ```json
  { "format": "statmodoro-export", "version": 1, "exportedAt": "ISO-8601", "appVersion": "semver", "settings": {}, "sessions": [] }
  ```

- Import: parse file, dispatch on `version`, validate shape, prompt confirmation, then replace all IndexedDB records and localStorage settings. A file whose `version` is higher than the current app version is refused with a "this export is from a newer version" message. Migration from older versions is handled by `lib/db/migrations.ts`.

### Notifications
- Sound: single bundled audio file played via Web Audio API at phase transitions, gated by Sound Alerts toggle and Volume setting.
- Desktop: `Notification` API, requested lazily on first enable. Fired at phase transitions, gated by Desktop Notifications toggle.

### Icon State
Two SVG/PNG icon variants per colour theme: focus (purple) and rest (green). Extension uses `chrome.action.setIcon()`. PWA updates `<link rel="icon">` dynamically.

---

## Testing Decisions

### Philosophy
Tests should verify observable behaviour, not implementation details. A good test: given this sequence of user actions and time elapsed, assert this state and these stored records. Never assert which internal functions were called.

### Modules to Test

**Timer state machine** — highest priority. Pure reducer with no side effects. Test all state transitions: idle → running, running → paused, paused → running, skip with/without credit, loop reset, end-of-loop cycling, auto-start behaviour, settings applied mid-session.

**Stats derivation functions** — high priority. Pure functions from event records → computed stats. Test each view's hero value, chip values, bar chart data, streak calculation, day boundary logic. Cover edge cases: no data, single session, sessions spanning day boundary, sessions with multiple pauses.

**Flowmodoro ring math** — medium priority. Pure function. Test boundary at `t = target` (exactly 75%), behaviour well past target (approaches but never reaches 100%), and ratio-derived break duration.

**Credit threshold** — medium priority. Pure derivation: `netActiveMs / plannedDuration >= threshold`. Test just below, at, and above the threshold. Credit is computed at stats time so threshold changes apply to all history.

**IndexedDB persistence layer** — medium priority. Test write → read round-trip for session records. Test that import replaces all records correctly.

### Not Tested
- React component rendering (too implementation-coupled)
- CSS transitions and visual polish
- Browser API integrations (Notification API, Web Audio API) — mock at the boundary

---

## Planned Future Features

This section captures features and metrics that are out of scope for the current implementation but are explicitly planned for future versions. The data schema and architecture are designed to support all of these without migration.

### Analytics — Additional Metrics

**Trend lines.** Week-over-week and month-over-month deltas on total focus time displayed alongside the hero value (e.g. "↑ 12% from last week"). More motivating than a raw total in isolation.

**Pause analytics.** Average pauses per session, average pause duration, and a distribution of pause lengths. Requires adding `pauses: PauseInterval[]` to `SessionRecord` in a future schema version (v2). A user whose pauses average 30 seconds is taking water breaks; one whose pauses average 4 minutes is context-switching.

**Intra-day session streaks.** A streak of consecutive focus → break → focus cycles uninterrupted by gaps longer than a threshold. The day-level streak in the current PRD measures consistency across days; this measures momentum within a day — the unit Pomodoro practitioners actually feel.

**Time-of-day distribution shifts.** Overlay this month's hour-of-day focus curve against last month's. Surfaces lifestyle changes the user might not consciously notice (e.g. shifting from morning to evening work after a schedule change).

**Completion rate by hour of day.** Sessions started at 3pm might complete at 95%; sessions started at 11pm at 40%. Tells users when they are most and least effective at following through.

**Mode-specific session length distribution.** A separate histogram for Flowmodoro sessions reveals the user's natural focus rhythm — the distribution that Pomodoro hides behind a fixed target.

**First-session-of-day distribution.** The current PRD asks for the average time to first session. The full distribution is more useful: a bimodal curve ("9am most weekdays, 2pm on weekends") carries information that the mean flattens.

**Break-to-focus ratio over time.** Tracks whether the user is actually taking the breaks they configured, or skipping through them. Distinct from compliance rate — this is a time-series view of behaviour drift.

**Session momentum score.** A rolling metric combining session completion rate, break compliance, and intra-day streak length into a single "focus quality" number for a given day or week.

### Analytics — Additional Charts

**Comparative week view.** Side-by-side bar charts for this week vs last week on the Week range panel.

**Hourly distribution comparison.** Overlay chart for hour-of-day focus comparing two selectable time periods.

### Schema Addition (v2)

**`pauses: PauseInterval[]` on `SessionRecord`.** Each entry: `{ pausedAt: number; resumedAt: number }`. Precomputed from the event list at write time (same collapse-on-write pattern as `netActiveMs`). Required for pause analytics. Not included in v1 to keep the write layer simple — `netActiveMs` already satisfies all current metrics.

### Platform & UX

**Lock screen notification (PWA).** Surface session status on the device lock screen when a timer is running. Platform API support varies; deferred to a later PWA phase.

**Color theme picker.** Curated accent colour sets beyond purple/green. Architecture already supports this via the `data-mode` CSS variable system.

**Curated sound picker.** A small selection of transition sounds beyond the single bundled default.

**Ambient sounds / focus music.** Looping background audio during focus sessions (rain, white noise, etc.).

**Session labels / tags.** User-defined labels attached to focus sessions, with per-label stat breakdowns.

**Website blocking (extension).** Block configurable sites during focus sessions.

**Multiple timer profiles.** Save and switch between named setting sets (e.g. "Deep Work", "Quick Tasks").

**Keyboard shortcuts.** Full keyboard navigation beyond the native Enter on the focused ring button.

**Vibration API.** Haptic feedback at phase transitions on supporting mobile devices.

**Desktop explainer / demo text.** Informational content surrounding the app frame on large screens (desktop stage pattern).

---

## Out of Scope

The following are out of scope for all planned versions, not deferred to future versions:

- User accounts, cloud sync, or any server-side infrastructure
- Social features, sharing, leaderboards
- Any analytics or telemetry
- Flowmodoro-specific UI indicator on the timer screen

---

## Further Notes

- **Flowmodoro session schema**: break duration for Flowmodoro is derived at session end (focus elapsed ÷ ratio). Stored as `flowmodoroDerivedBreakMs` on the focus session record.
- **Session record schema**: settled — see Implementation Decisions above. The reducer uses `TimerEvent[]` internally while live; `lib/db/sessions.ts` collapses to the canonical shape on write.
- **Chromium extension store listing**: will reuse manifest description — "A privacy-first Pomodoro timer with extensive local statistics. All your data stays on your device."
- **`k` constant for Flowmodoro ring**: tune visually during implementation. Starting point: `k = 3` (ring reaches ~95% at `2× target`).
- **Settings stepper UX**: numeric input opens native numeric keyboard on mobile (`inputmode="numeric"`). − and + buttons are touch-friendly (min 44px hit target).
- **"Count Session After" for Flowmodoro**: uses configured Focus Duration as the reference `plannedDuration` since there is no inherent target.
