# Design — GMaps Intelligence

Locked design system. Every page reads this before emitting code. Amend here,
never per-page.

## Genre

modern-minimal — internal B2B workbench. Function carries the page.

## Macrostructure family

- App pages (dashboard, leads, lead detail): **Workbench** — dense data,
  hairline rules, no shadows, HOT-led hierarchy.
- Login: centered single card on paper. (Genre-correct; not flagged.)

## Theme (tokens in `static/tokens.css`)

- `--color-paper` oklch(97.5% 0.005 95) — warm off-white app bg
- `--color-paper-2` oklch(100% 0 0) — panels/tables
- `--color-ink` oklch(25% 0.01 260) · `--color-ink-2` oklch(45% 0.01 260) ·
  `--color-ink-3` oklch(55% 0.01 260) — all ≥4.5:1 on white
- `--color-rule` oklch(88% 0.005 95) · `--color-rule-strong` oklch(78% 0.005 95)
  (inputs)
- `--color-accent` oklch(48% 0.12 165) · `--color-accent-2` oklch(38% 0.12 165)
  hover · `--color-accent-ink` oklch(98% 0.01 165)
- `--color-focus` oklch(60% 0.14 165)
- Semantic (only for priority/status): `--color-hot` oklch(55% 0.19 25) ·
  `--color-warm` oklch(60% 0.12 70) · `--color-ok` oklch(50% 0.12 150)
- Two accents max: brand teal + semantic red/amber. No blue, no purple, no green
  buttons.

## Typography

- Display: Space Grotesk 600/700, roman, tracking -0.01em (h1–h3 auto via base
  rule)
- Body: IBM Plex Sans 400/500/600
- Mono: IBM Plex Mono — `.num` class on every numeric cell (scores, ratings,
  counts, money, timestamps). Tabular.
- Loaded via Google Fonts `<link>` in `_app.tsx`.

## Spacing

Tailwind default scale. Panels `p-5`, page `p-6`.

## Motion

motion-cut. No transitions, no reveals. `prefers-reduced-motion` moot.

## Microinteractions stance

- Silent success. No toasts.
- All submit buttons get global pending state: 8-line script in `_app.tsx` sets
  `data-pending` → disabled + dim. Protects paid AI calls from double-click.
- `:focus-visible` ring 2px `--color-focus`, instant, never animated.

## CTA voice

- Primary: solid `--color-accent`, `rounded-md`, sentence case ("Search Places",
  "Save").
- Secondary: 1px accent outline, same shape ("Export CSV", "Accept AI score …").
- Destructive: none.

## Tables

Hairline `--color-rule` row borders, `--color-paper-2` bg, no zebra, no shadows.
Sortable headers: text link + `↑/↓` when active, `aria-sort` on `th`.

## Time

`fmtTs()` in `utils.ts` renders SQLite UTC as `14 Aug 11:43` WIB (Asia/Jakarta).

## What pages MUST share

Wordmark, accent + placement, type pairing, CTA voice, table language, badge
language (1px semantic border, tint-free).

## Per-page allowances

No enrichment anywhere. Panels: hairline border, 8px radius. Badges:
border-only.

## Exports

Single source: `static/tokens.css`. Tailwind consumes tokens via `var()`
arbitrary values (`bg-[var(--color-accent)]`); no `@theme` fork.
