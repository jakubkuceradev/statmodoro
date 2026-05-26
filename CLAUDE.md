# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Statmodoro is a privacy-first Pomodoro timer with extensive local statistics. All data is local-only — no accounts, no cloud. Full documentation lives in `docs/` — summaries below cover the essentials for most tasks.

---

## Product overview (`docs/PRD.md`)

Three screens behind a bottom navbar: **Timer**, **Stats**, **Settings**.

**Timer screen:** circular SVG progress ring (220px) that fills as time elapses (0 → 1) in both modes. Regular Pomodoro fills linearly; Flowmodoro fills asymptotically toward 1. Tap the ring to pause/resume. Skip button advances to the next phase. Session dots above the ring show loop position; tapping dots resets the loop. State labels: "Tap to Focus" (paused/idle), "Focus" (running), "Tap to Rest" (break paused), "Rest" (break running).

**Session flow:** focus → short break → focus → … → focus → long break → repeat. The break shares the same loop dot as the focus that preceded it; loopPosition advances when break → focus transitions. Auto-Start Breaks/Focus settings control whether the next phase starts automatically. Sessions only count as completed if elapsed time ≥ "Count Session After" threshold (default 50%).

**Flowmodoro mode:** ring fills asymptotically (0 → 0.75 linearly to planned duration, then 0.75 → 1 asymptotically for overtime). User ends focus by pressing Skip. Break duration = elapsed ÷ Break Ratio.

**Stats screen:** Day/Week/Month/Year range switcher with hero focus-time value, 3 stat chips, a horizontally scrollable bar chart, and detail rows. "Full Analysis" opens a full-screen panel with a GitHub-style calendar heatmap, hour-of-day/day-of-week charts, session histogram, density heatmap, all-time totals, personal records, and rate metrics.

**Settings:** Timer group (durations, sessions per loop, count threshold), Behaviour group (auto-start, streak goal, mode, Flowmodoro ratio, day start time), Notifications group (sound, volume, desktop), Data group (export, import, clear, reset).

**Backgrounding:** `endTimestamp = Date.now() + remainingMs` written to localStorage on every tick; remaining time is recomputed from it on resume.

**Platforms:** Phase 1 = web app (mobile-optimised, desktop stage pattern). Phase 2 = PWA. Phase 3 = Chromium extension (popup reuses React app; timer state lives in an Offscreen Document).

---

## Design system (`docs/DESIGN.md`)

Fixed 350×500px app frame, `#0A0A0A` background, 28px border radius. Desktop: frame centred on `#111`. Mobile: frame fills viewport.

**Fonts:** JetBrains Mono (time display, stats values) · DM Sans (labels, nav, chips).

**Accent system:** `--accent` / `--accent-dim` are runtime CSS vars set via `data-mode="focus"` (purple `#9747FF` / `#3D1180`) or `data-mode="rest"` (green `#34C759` / `#1A632D`) on the root `.app` element. Every child references these vars — the whole UI recolours by changing one attribute.

**Key static tokens:** `--bg-app: #0A0A0A`, `--surface: rgba(255,255,255,0.025)`, `--surface-raised: rgba(255,255,255,0.06)`, `--border: rgba(255,255,255,0.06)`. Text: `--text-primary` (full white) → `--text-secondary` (0.55) → `--text-muted` (0.28) → `--text-faint` (0.14).

**Ring:** SVG, `r=102`, circumference ≈ 641px, `stroke-dasharray` drives fill. Running = `--accent`, paused = `--accent-dim`, hover inverts these.

**Transitions:** `--trans-color: 0.35s` (accent shifts), `--trans-fast: 0.18s` (hover), `--trans-med: 0.28s` (ring hover, toggle, dots). All set to `0s` under `prefers-reduced-motion`.

---

## Architecture (`docs/ARCHITECTURE.md`)

**`src/lib/` — zero React imports.** Pure TypeScript: timer reducer, stats derivation, DB access, audio, notifications.

**`src/contexts/` — owns all side effects.** Side effects (localStorage writes, IndexedDB writes, audio, notifications) happen in context providers via `useEffect`, never in the reducer.

**Context hierarchy:**
```
SettingsProvider
  TimerPhaseProvider      ← reducer + side effects; updates on phase transitions only
    TimerClockProvider    ← remainingMs only; updates every 100ms tick
      StatsProvider       ← raw SessionRecord[] from IndexedDB
```

**Timer state machine** (`lib/timer/reducer.ts` — pure function):
- States: `idle | focus_running | focus_paused | break_running | break_paused`
- Actions: `PLAY_PAUSE`, `SKIP`, `SESSION_END`, `LOOP_RESET`, `STOP`, `SETTINGS_CHANGED`, `TICK`, `RESUME_FROM_BACKGROUND`, `RESTORE`
- `loopPosition` is 0-indexed; last session of loop triggers `long_break` then resets to 0
- Abandoned session detection: if `now - endTimestamp > plannedDuration + 10min` on resume, write `endReason='abandoned'` and go idle

**Session record** (`types/session.ts`): canonical shape written on session completion — `id`, `startedAt`, `endedAt`, `netActiveMs` (precomputed), `sessionType`, `mode`, `endReason`, `completed`, `sessionIndex`, `plannedDuration`, `flowmodoroDerivedBreakMs?`, `tzOffsetMinutes`. `TimerEvent[]` is internal reducer state only; never persisted.

**Stats derivation:** pure functions in `lib/stats/` called with `useMemo` at the component level. No aggregated cache. `lib/stats/bucketDay.ts` is the single source of truth for day-boundary logic (uses `tzOffsetMinutes` + `dayStartHour`).

**Tailwind v4 strategy:** static tokens in `@theme` (become utility classes); accent colours as scoped CSS vars set by `data-mode` (not in `@theme`, referenced as `text-[var(--accent)]` or inline styles).

**Screen navigation:** `useState<ActiveScreen>` in `App.tsx` — no router. Timer/Stats/Settings conditionally rendered; Full Analysis always mounted, slides in via CSS transform.

**Extension architecture:** `TimerPhaseProvider` and `TimerClockProvider` have two implementations selected by `IS_EXTENSION` (`VITE_PLATFORM=extension`). Extension mode: Offscreen Document owns the reducer + tick loop + audio; service worker brokers messages; popup is a dumb client reading `endTimestamp` from `chrome.storage.local`.

---

## Implementation plan (`docs/ISSUES.md`)

13 vertical slices in dependency order:

| # | Issue | Depends on |
|---|---|---|
| 1 | Design system & app shell | — |
| 2 | Timer state machine | 1 |
| 3 | Timer screen UI | 1, 2 |
| 4 | Settings screen | 1 |
| 5 | Session schema & IndexedDB storage | 2 |
| 6 | Stats derivation (pure functions) | 5 |
| 7 | Stats screen — quick glance | 3, 6 |
| 8 | Import / Export & data management | 5 |
| 9 | Notifications (sound + desktop) | 2, 4 |
| 10 | Flowmodoro mode | 2, 4, 5 |
| 11 | Full Analysis view | 6, 7 |
| 12 | PWA | 1–11 |
| 13 | Chromium extension | 12 |

---

## Commands

All commands run from `app/`:

```bash
npm run dev        # start dev server
npm run build      # type-check + build
npm run lint       # eslint
npm run preview    # preview production build
```

No test runner is configured yet.

## Stack

- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`, configured via `@theme` in CSS
- `idb` for IndexedDB (to be added)

## Key architectural constraints

`src/lib/` must never import from React — pure TypeScript only. All business logic (timer reducer, stats derivation, DB access) lives here and is independently testable.

Side effects (audio, notifications, localStorage, IndexedDB writes) belong in context providers reacting to state via `useEffect`, never inside the reducer.

The `docs/ARCHITECTURE.md` is the authoritative reference for module boundaries, context hierarchy, state machine transitions, and the design token strategy.
