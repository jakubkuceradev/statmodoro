# Statmodoro — Design Decisions

---

## App Frame

- **Width**: 350px (fixed)
- **Height**: 500px (fixed)
- **Background**: `#0A0A0A`
- **Border radius**: 28px
- **Border**: `1px solid rgba(255,255,255,0.06)`
- **Box shadow**:
  ```
  0 0 0 1px rgba(0,0,0,0.8),
  0 40px 120px rgba(0,0,0,0.9),
  0 8px 32px rgba(0,0,0,0.6)
  ```
- **Overflow**: hidden (clips all children to the rounded frame)
- **Layout**: column flex, children centered horizontally

### Desktop Stage
- Viewport background: `#111`
- App frame centered horizontally and vertically
- No additional UI elements around the frame (MVP)

### Mobile
- The app frame fills the full viewport — no visible frame border or shadow on mobile
- Safe area insets must be respected on notched devices

---

## Design Tokens

### Fonts
| Token | Value |
|---|---|
| `--font-mono` | `'JetBrains Mono', 'Courier New', monospace` |
| `--font-sans` | `'DM Sans', sans-serif` |

JetBrains Mono weights loaded: 100, 300, 400. DM Sans weights loaded: 300, 400, 500.

### Backgrounds & Surfaces
| Token | Value | Usage |
|---|---|---|
| `--bg-app` | `#0A0A0A` | App background |
| `--surface` | `rgba(255,255,255,0.025)` | Navbar background |
| `--surface-raised` | `rgba(255,255,255,0.06)` | Chips, toggles (off state), bars |

### Borders
| Token | Value |
|---|---|
| `--border` | `rgba(255,255,255,0.06)` |
| `--border-strong` | `rgba(255,255,255,0.10)` |

### Text Hierarchy
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `rgba(255,255,255,1.00)` | Time display |
| `--text-secondary` | `rgba(255,255,255,0.55)` | Settings labels, stat detail values |
| `--text-muted` | `rgba(255,255,255,0.28)` | Section labels, nav text (inactive) |
| `--text-faint` | `rgba(255,255,255,0.14)` | Bar day labels |
| `--text-paused` | `rgba(255,255,255,0.38)` | Time display when paused |
| `--text-paused-hover` | `rgba(255,255,255,0.92)` | Time display when paused + ring hovered |

### Accent Colours (State-Driven)
| State | `--accent` | `--accent-dim` |
|---|---|---|
| Focus | `#9747FF` | `#3D1180` |
| Rest | `#34C759` | `#1A632D` |

`--accent` and `--accent-dim` are set on the `.app` element via `.app.focus` / `.app.rest` class. All child components reference these tokens — the entire UI recolours by swapping one class.

### Ring
| Token | Value |
|---|---|
| `--ring-track` | `#1e1e1e` |
| `--ring-stroke` | `5px` |
| `--ring-size` | `220px` |

### Layout
| Token | Value |
|---|---|
| `--gap-section` | `28px` (vertical gap between dots, ring, skip button) |
| `--navbar-h` | `64px` |

### Border Radii
| Token | Value | Usage |
|---|---|---|
| `--radius-app` | `28px` | App frame |
| `--radius-pill` | `20px` | Dots container hover area |
| `--radius-sm` | `6px` | Bar chart bars |
| `--radius-dot` | `3px` | Session dots |

### Transitions
| Token | Value | Usage |
|---|---|---|
| `--trans-color` | `0.35s ease` | Accent colour shifts (ring stroke, state label, dots) |
| `--trans-fast` | `0.18s ease` | Hover opacity, nav tab opacity |
| `--trans-med` | `0.28s ease` | Ring hover, toggle, skip icon opacity, dot background |

Animations are always enabled. The app respects `prefers-reduced-motion` via CSS media query (all transitions set to `0s` when the OS requests reduced motion).

---

## Accent Glow (Background Gradient)

A pseudo-element on `.app` creates a soft radial glow at the top of the screen:

```css
.app::before {
  content: '';
  position: absolute;
  top: -60px; left: 50%;
  transform: translateX(-50%);
  width: 300px; height: 220px;
  background: radial-gradient(ellipse at center top, var(--accent-dim) 0%, transparent 68%);
  opacity: 0.75;
  pointer-events: none;
  z-index: 0;
}
```

This glow transitions with `--accent-dim` when state changes, giving the whole screen a breathing quality.

---

## Timer Screen Layout

Three stacked sections inside a `flex-direction: column` container (`flex: 1`, centered):

1. **Session dots** — top
2. **Ring** — middle (grows to fill space)
3. **Skip button** — bottom

Vertical gap between each: `--gap-section` (28px).

---

## Session Dots

- Container: `display: flex; gap: 8px; padding: 6px 10px; border-radius: 20px; cursor: pointer`
- Each dot: `height: 6px; border-radius: 3px`

| Dot state | Width | Background |
|---|---|---|
| Done | 6px | `--accent-dim` |
| Active | 22px | `--accent` |
| Future | 6px | `rgba(255,255,255,0.14)` |

- On hover of the container: all dots (including done and active) transition to `rgba(255,255,255,0.14)` — a uniform dim — suggesting the reset affordance
- Dot background transition: `--trans-med` (0.28s ease)

**Reset hint label:**
- Positioned `top: -16px`, horizontally centered above the dots
- `font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase`
- `color: rgba(255,255,255,0.72)`
- Opacity: 0 default, 1 on container hover — transition `0.2s`
- Text: **"Reset Loop"**

---

## Progress Ring

- SVG, `220px × 220px`, rotated `-90deg` so progress starts at the top
- `viewBox="0 0 220 220"`
- Circle center: `cx="110" cy="110"`, radius: `r="102"`
- Circumference: `≈ 641px`

**Track circle:** `fill: none; stroke: #1e1e1e; stroke-width: 5px`

**Progress circle:**
```css
fill: none;
stroke: var(--accent);
stroke-width: 5px;
stroke-linecap: round;
stroke-dasharray: {progress} {remaining};  /* drives fill level */
transition: stroke 0.35s ease;
```

### Pomodoro Ring Behaviour
- Counts **down**: `stroke-dasharray` goes from full circumference (≈641) to 0 as time elapses
- `stroke-dasharray: elapsed_arc remainder_arc`

### Flowmodoro Ring Behaviour
- Counts **up** with a two-phase fill:
  - Phase 1 (0 → configured duration): linear fill from 0% to 75% of circumference
  - Phase 2 (past configured duration): asymptotic approach to 100% — `fill = 0.75 + 0.25 × (1 - e^(-k × overtime/target))` where `k ≈ 3`
- The ring never hard-stops at 100%; it approaches asymptotically

### Ring Interaction States
| App state | Ring stroke colour |
|---|---|
| Running | `--accent` |
| Running + ring hovered | `--accent-dim` (dimming signals "tap to pause") |
| Paused | `--accent-dim` |
| Paused + ring hovered | `--accent` (brightening signals "tap to resume") |

---

## Ring Inner Content

Absolutely positioned, centered over the ring SVG:

**Time display:**
- Font: `JetBrains Mono`, `font-size: 46px`, `font-weight: 300`
- `letter-spacing: -0.02em; line-height: 1`
- Format: `MM:SS` (two digits each, zero-padded). Max value displayed: `999:59`
- Colon: `font-weight: 100; opacity: 0.55; font-size: 40px; margin: 0 1px`
- Colour transitions with ring state (see table above)

**State label:**
- Font: `DM Sans`, `font-size: 10px`, `font-weight: 500`
- `letter-spacing: 0.24em; text-transform: uppercase`
- Colour: always `--accent` (never dims, even on hover — the label is a CTA)
- Sits 7px below the time display

**Label text per state:**
| State | Label |
|---|---|
| Idle (never started) | Tap to Focus |
| Focus running | Focus |
| Focus paused | Tap to Focus |
| Break running | Rest |
| Break paused | Tap to Rest |

---

## Skip Button

- Positioned below the ring, centered
- `background: none; border: none; padding: 10px; border-radius: 50%; cursor: pointer`
- Icon: 28px × 28px SVG (play-to-end shape: triangle + vertical bar)
- Icon fill: `--accent`, `opacity: 0.82`
- On hover: `opacity: 1` — transition `--trans-med`
- No confirmation on tap

---

## Bottom Navigation Bar

- `height: 64px`
- `background: rgba(255,255,255,0.025)` (surface)
- `border-top: 1px solid rgba(255,255,255,0.06)`
- Three tabs: **Timer** · **Stats** · **Settings** — equal width (`flex: 1`)
- Each tab: column flex, icon + label, vertically and horizontally centered, `gap: 4px`

**Nav icon:** 20px × 20px SVG, `stroke-width: 1.7`, `fill: none`
- Inactive: `stroke: rgba(255,255,255,0.28)`
- Active: `stroke: var(--accent)`
- Transition: `--trans-color` (0.35s ease)

**Nav label:** `font-size: 9px; letter-spacing: 0.09em; text-transform: uppercase`
- Inactive: `rgba(255,255,255,0.22)`
- Active: `var(--accent)`
- Transition: `--trans-color`

Tab hover: `opacity: 0.75` — transition `--trans-fast`

**Tab icons (Lucide-style outlines):**
- Timer: clock circle with hands (`<circle>` + `<polyline>`)
- Stats: three vertical bars of different heights
- Settings: gear (circle + path)

---

## Screen Shell (Stats & Settings)

Stats and Settings share a common screen container:

- `flex: 1; width: 100%`
- `padding: 26px 24px 48px`
- `overflow-y: auto; scrollbar-width: none` (hidden scrollbar)
- `z-index: 2`

**Scroll fade:** A gradient overlay at the bottom of the screen (above the navbar) signals more content:
```css
position: absolute; bottom: 64px; left: 0; right: 0;
height: 48px;
background: linear-gradient(to bottom, transparent, #0A0A0A);
pointer-events: none;
```

**Section label** (e.g. "Timer", "Behaviour"):
- `font-size: 9px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase`
- Colour: `--text-muted`
- `margin-bottom: 14px`

**Divider:** `width: 100%; height: 1px; background: rgba(255,255,255,0.06); margin: 18px 0`

---

## Stats Screen

### Range Switcher
- Sits at the top of the screen, flush left (slight negative left margin to align with content)
- Four buttons: **Day · Week · Month · Year**
- `font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase`
- `padding: 0 10px 8px` — bottom padding creates space before the underline indicator
- Inactive colour: `--text-muted`
- Active colour: `--accent`
- Active indicator: `1.5px` bottom border line in `--accent`, scales in from `scaleX(0)` to `scaleX(1)` — transition `--trans-med`
- Container has a `border-bottom: 1px solid rgba(255,255,255,0.06)` at the same level

### Hero Value
- Font: `JetBrains Mono`, `font-size: 38px`, `font-weight: 300`
- `letter-spacing: -0.05em; line-height: 1`
- Colour: `--text-primary`

### Hero Sub-label
- `font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase`
- Colour: `--text-muted`
- `margin-top: 6px`

### Chips Row
- `display: flex; gap: 8px; margin-top: 12px`

**Default chip:**
- `font-size: 10px; font-weight: 500; letter-spacing: 0.04em`
- `padding: 3px 9px; border-radius: 20px`
- `background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10)`
- Colour: `rgba(255,255,255,0.55)`

**Highlighted chip (`.hi`):**
- `background: var(--accent-dim); border-color: transparent`
- Colour: `rgba(255,255,255,0.85)`
- Used for the primary count chip (e.g. "4 sessions")

### Bar Chart
- Horizontally scrollable container, hidden scrollbar
- Bars align to `flex-end` (bottom-aligned), `height: 68px` total, `gap: 5px`
- Each bar column: `width: 36px`

**Bar:**
- `background: rgba(255,255,255,0.06); border-radius: 3px; min-height: 3px`
- Current period (today/this week/etc): `background: var(--accent); opacity: 0.72`
- Height set as a percentage of the column's parent height, scaled to the tallest bar in the view

**Bar label:**
- `font-size: 8px; letter-spacing: 0.05em; text-transform: uppercase`
- Colour: `--text-faint` (`rgba(255,255,255,0.14)`)
- Current period label: `var(--accent)`, `opacity: 0.8`

**Tooltip on tap:** small popover showing exact focus time for the tapped bar. Tap outside to dismiss.

### Detail Rows
- `display: flex; justify-content: space-between; padding: 8px 0`
- `border-bottom: 1px solid rgba(255,255,255,0.06)`
- Last row: no border

**Label:** `font-size: 12px; color: rgba(255,255,255,0.55)`

**Value:** `font-family: JetBrains Mono; font-size: 12px; font-weight: 300; letter-spacing: 0.02em; color: rgba(255,255,255,0.55)`
- Accent-coloured variant (streaks): `color: var(--accent)`

**Streak value format:** number + small unit label
```
<span class="streak-value">5</span><span class="streak-unit">days</span>
```
Unit: `font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: --text-muted; margin-left: 4px`

### Full Analysis Button
- Positioned at the bottom of the Stats scroll area
- Style: text link or subtle button — exact style TBD, consistent with the action-link style below

---

## Settings Screen

### Settings Group
- Groups are separated by `margin-top: 18px`
- Each group has a section label above its rows

### Settings Row
- `display: flex; justify-content: space-between; align-items: center; padding: 9px 0`
- `border-bottom: 1px solid rgba(255,255,255,0.06)`
- Last row in group: no border

**Row label:** `font-size: 12px; color: rgba(255,255,255,0.55)`

### Stepper (numeric settings)
```
[ − ]  [ value ]  [ + ]
```
- `−` / `+` buttons: `width: 18px; height: 18px; font-size: 15px; color: --text-muted; background: none; border: none`
- Value display: `font-family: JetBrains Mono; font-size: 12px; font-weight: 300; min-width: 38px; text-align: center`
- Value field is directly editable (tappable/clickable). On mobile: `inputmode="numeric"` opens numeric keyboard. On desktop: free text input.

### Toggle
- `width: 34px; height: 19px; border-radius: 10px`
- Off: `background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10)`
- On: `background: var(--accent); border-color: var(--accent)`
- Thumb: `width: 13px; height: 13px; border-radius: 50%; top: 2px; left: 2px`
- Thumb off: `background: --text-muted`
- Thumb on: `background: white; transform: translateX(15px)`
- Transition: `--trans-med` on background, border, and thumb transform

### Data Section Links
**Action link** (Import, Export):
- `font-size: 12px; color: #0A84FF; opacity: 0.85`
- Hover: `opacity: 1` — transition `--trans-fast`

**Danger link** (Clear, Reset):
- `font-size: 12px; color: #FF453A; opacity: 0.8`
- Hover: `opacity: 1` — transition `--trans-fast`

All danger actions require a confirmation dialog before executing.

---

## Confirmation Dialogs

Used for: Import Data, Clear All History, Reset All Settings.

Style: native browser `confirm()` is acceptable for MVP. A custom modal may be introduced later to match the dark theme.

---

## Full Analysis View

Slides in as a full-screen panel (same dimensions as the app frame). The bottom navbar is replaced by a back button. Contents scroll vertically. Exact layout of individual charts is TBD during implementation, but follows the same design tokens and surface system as the rest of the app.

Charts included:
- GitHub-style calendar heatmap (full year of daily focus minutes)
- Average focus by hour of day
- Average focus by day of week
- Session length distribution histogram
- 7-day × 24-hour focus density heatmap
- All-time totals
- Personal records
- Completion rate + break compliance rate
- Average time to first session

---

## Chromium Extension

- Popup dimensions: **350 × 500px** — matches the app frame exactly
- Same React app rendered inside the popup
- Pop-out button: subtle icon, top-right corner of the popup, extension context only (hidden in PWA)
- Extension icon: two variants per theme (focus purple, rest green), swapped via `chrome.action.setIcon()`
- Badge text: remaining minutes, coloured with accent. Blank when paused or idle. Updated via `chrome.action.setBadgeText()` and `chrome.action.setBadgeBackgroundColor()`

---

## Iconography

All icons are inline SVG, Lucide-style (outline, consistent stroke-width). No icon library dependency — icons are inlined to keep the bundle minimal and allow precise colour control via `stroke: var(--accent)`.

Minimum touch target for all interactive icons: **44 × 44px** (padding added around the visible icon as needed).

---

## Typography Scale Summary

| Use | Font | Size | Weight | Other |
|---|---|---|---|---|
| Time display | JetBrains Mono | 46px | 300 | letter-spacing: -0.02em |
| Time colon | JetBrains Mono | 40px | 100 | opacity: 0.55 |
| Hero stat | JetBrains Mono | 38px | 300 | letter-spacing: -0.05em |
| State label | DM Sans | 10px | 500 | uppercase, letter-spacing: 0.24em |
| Stat detail value | JetBrains Mono | 12px | 300 | letter-spacing: 0.02em |
| Settings value | JetBrains Mono | 12px | 300 | — |
| Chip label | DM Sans | 10px | 500 | letter-spacing: 0.04em |
| Section label | DM Sans | 9px | 500 | uppercase, letter-spacing: 0.16em |
| Nav label | DM Sans | 9px | 400 | uppercase, letter-spacing: 0.09em |
| Bar day label | DM Sans | 8px | 400 | uppercase, letter-spacing: 0.05em |
| Settings row label | DM Sans | 12px | 400 | — |
| Range switcher btn | DM Sans | 9px | 500 | uppercase, letter-spacing: 0.12em |
| Reset hint | DM Sans | 9px | 400 | uppercase, letter-spacing: 0.12em |
| Streak unit | DM Sans | 9px | 400 | uppercase, letter-spacing: 0.10em |
| Action/danger link | DM Sans | 12px | 400 | — |
