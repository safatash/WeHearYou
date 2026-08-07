# Design reference

The canonical WeHearYou design system. **When this and the app disagree, this wins.**

Extracted from the design mockup bundle so it lives in version control instead of one
developer's Downloads folder.

## What's here

| Path | What it is |
|---|---|
| `styles.css` | **The authoritative token layer** — `:root` variables and base styles |
| `screens/foundations.jsx` | The design-system reference view: colour, type scale, components |
| `screens/app.jsx` | App shell — sidebar, nav item, header, location switcher, trial card |
| `screens/*.jsx` | Per-module reference layouts (dashboard, widgets, wizard, gbp-*, funnel-*, …) |
| `screenshots/` | The mockups rendered — the visual target for each surface |

These are **reference material, not application code.** Nothing here is imported, built or
deployed; `design-reference/` is excluded from the TypeScript project. The `.jsx` files use a
mockup-local component vocabulary (`Icon`, `NavItem`, `Tweak*`) that does not exist in `src/`.

## How to use it

Before restyling a surface, open its reference layout and its screenshot. The mockups are the
spec for composition and hierarchy, not just colour.

`styles.css` is the source of truth for `src/app/globals.css`. The repo's token layer had
silently drifted from it — Tailwind's gray ramp instead of the cool zinc one, radii 4/6/12/16
instead of 5/7/10/14, generic black shadows, brighter semantic hues, and hardcoded accent
variants instead of `color-mix` derivations. Realigned in PR #19.

## Two deliberate deviations

`src/app/globals.css` departs from `styles.css` in exactly two places, both for accessibility,
both asserted in `src/lib/design-tokens.test.ts`:

1. **Solid interactive fill.** The design system's `.btn-primary` is `--accent` (`#37aeb7`) with
   white content — **2.66:1**, and `--accent-strong` is **3.52:1**. Both fail WCAG 2.2 AA on the
   product's most-used control. The app uses `--accent-solid` (`#1f6f76`, **5.84:1**) for solid
   fills and `--accent-ink` for teal text. `--accent` remains the brand hue for borders, soft
   fills, dots and charts.

2. **Status label colours.** The canonical `--success` / `--warning` / `--danger` are
   **4.00 / 3.51 / 4.48:1** on white — fine as fills, short of the 4.5 needed for label text. The
   app adds `--success-ink` / `--warning-ink` / `--danger-ink` (5.48 / 4.92 / 6.47:1) for labels.

Do not "simplify" these back to `--accent` or the vivid hues. The tests will fail, which is the
point.

## Not included

The source bundle also contained standalone HTML exports (~2.3 MB each, the same screens
inlined) and an `uploads/` directory of ~57 MB of unnamed images. Neither adds anything the
`.jsx` and `styles.css` do not, so both were left out.
