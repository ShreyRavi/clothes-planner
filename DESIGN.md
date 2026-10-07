---
colors:
  light:
    bg: "#F6F2EB"
    surface: "#FFFDF9"
    soft: "#EEE7DC"
    line: "#E2D9CC"
    ink: "#221C17"
    muted: "#6B6158"
    accent: "#A93A22"
    accent-ink: "#FFFFFF"
  dark:
    bg: "#161311"
    surface: "#1F1B18"
    soft: "#2A2420"
    line: "#36302A"
    ink: "#F1ECE4"
    muted: "#A99F93"
    accent: "#E36B4E"
    accent-ink: "#1A0F0B"
spacing: { s-1: 4px, s-2: 8px, s-3: 12px, s-4: 16px, s-5: 20px, s-6: 24px, s-7: 32px }
rounded: { thumb: 6px, tile: 10px, input: 12px, card: 16px, pill: 999px }
type:
  serif: "Newsreader — names of things: plans, functions, sheet titles"
  sans: "Instrument Sans — everything you read or tap"
  mono: "JetBrains Mono — field labels and image placeholders only"
motion: { ease: "cubic-bezier(0.2, 0.8, 0.2, 1)", panel: 240ms, quick: 160ms }
touch: { min: 44px, primary: 56px, input: 52px }
---

# Trousseau design system

Warm, editorial and calm. Clothing photos supply the color; the interface stays neutral with one accent. Source: `design/Trousseau Handoff.dc.html` and the design review in `docs/designs/trousseau.md` (DR1 to DR20). `src/styles/tokens.css` must match the front matter; `npm run check:tokens` enforces it in CI.

## Type scale

| Role | Size / line height | Face |
|---|---|---|
| display | 42/1.05 | Newsreader |
| title | 34–38/1.1 | Newsreader |
| card | 23/1.15 | Newsreader |
| body | 15–16/1.45 | Instrument Sans |
| meta | 13/1.3 | Instrument Sans, muted |
| label | 12 caps +0.08em | Instrument Sans 600, muted |

## Components

| Component | States and notes |
|---|---|
| TopBar | Wordmark (home) and the plan switcher menu. No theme button (DR18). Sticky, 60 px. |
| PlanHeader | Owner and preset eyebrow, serif title, place, dates, total picked, budget. |
| FunctionCard | Default, selected (desktop split), complete, missing count, empty plan. |
| FunctionHeader | Editable name and the date, time, dress code, color theme, venue grid. |
| SlotRow | Picked, candidates without a pick, missing (accent), optional (dashed). |
| CandidateTile | Picked (check, outline), alternative (72% opacity), broken image (fallback tile), add tile with hint, use existing. |
| StatusChip | Tap cycles Idea → Packed. Accent dot = action pending, ink dot = done. |
| Sheet | Native `<dialog>`; bottom sheet on phones, 440 px side panel at 900 px and up; focus to title, returns to trigger (DR15). |
| PlanMenu | Plans, then Inbox (count), Shopping and packing, Plan details, Duplicate, Settings, Back up, Delete. Popover at 900 px. |
| InboxRow | Overview row "3 items to place", only when the Inbox is non-empty (DR1). |
| Banner | One at a time: save failed (`role=alert`, accent tint) beats back up (`role=status`, soft) (DR7). |
| Toast | Undo variant 6 s, info variant 2.6 s, optional action label. |
| PreviewStrip | Snap-scrolling 9:16 previews in the Share sheet, Send pinned at the bottom (DR5). |
| FallbackViewer | Full-screen dark pager of real images with "Press and hold, then Save to Photos" (DR8). |
| PresetEditor | Drag plus Move up/down, rename, Optional, add, reset; changes apply to new plans only. |
| CantOpen | Plain-language error, primary next step, Details disclosure (DR9). |

## Share images (DR2, DR3, DR17, DR20)

1080×1920 PNG, always the light palette. Per function: name Newsreader 96 px (wraps to 2 lines, then 72 px, then ellipsis), meta 34 px, a 3-column grid of 296 px squares with the main outfit as a 2×2 hero, captions (slot label caps, title), dashed "Not picked yet" tiles for required gaps, overflow continues as "Name, 2 of 2". Overview: a contact sheet of each function's main outfit, up to 9 per image. Footer: app name and URL from build config.

## Browser surfaces (DR12)

Focus ring 2 px accent with 2 px offset; selection is an accent tint; caret accent; scrollbar `--line`; tabular numerals on counts, prices and dates; `color-scheme` follows the theme.

## Layout

Phone first at 375 px. At 900 px and up the plan screen splits into the overview (400 px) and the function detail; Inbox, Settings and the preset editor sit in a 640 px column (DR16). Touch targets are at least 44 px; primary buttons 56 px; inputs 52 px.
