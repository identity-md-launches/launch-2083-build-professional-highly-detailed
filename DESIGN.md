# SeedClock design system

## Overview

SeedClock is a collection website and Ethereum mint/claim interface. Its implemented character is a near-black editorial canvas with warm amber actions, cool teal details, and the contract’s own cartoon/vector clocks. Generous section spacing separates the detailed research story from transaction controls. The interface uses a flat surface system; the artwork provides its visual depth.

Source of truth: `src/styles.css`, `src/components/`, and `src/App.tsx`. This describes the implementation, rather than a proposed redesign.

## Colors

The hexadecimal primitive palette and semantic aliases are in `src/styles.css` under `:root`. Components use the semantic tokens; `[data-theme='light']` changes them together. Dark mode is the default, and the selected theme is stored locally.

| Semantic token           | Dark      | Light     | Use                                               |
| ------------------------ | --------- | --------- | ------------------------------------------------- |
| `--color-page`           | `#111513` | `#f7f6ef` | Page background                                   |
| `--color-surface`        | `#191e1b` | `#edeee5` | Mint panel, about section, origin visual, dialogs |
| `--color-surface-hover`  | `#202722` | `#e2e6dc` | Neutral control hover, inline code                |
| `--color-text`           | `#f3f2e9` | `#1d2c23` | Headings, body, control labels                    |
| `--color-text-muted`     | `#a8b2a9` | `#526257` | Supporting text and data labels                   |
| `--color-border`         | `#353e37` | `#c3cabe` | Structural dividers and outlined controls         |
| `--color-accent`         | `#f2bd68` | `#8b510c` | Primary action and signature headline             |
| `--color-accent-hover`   | `#ffd18b` | `#754209` | Primary control hover                             |
| `--color-on-accent`      | `#241a0d` | `#fff9ef` | Filled-action text                                |
| `--color-teal`           | `#80cbbb` | `#22695b` | Seed details, icons, progress, status dots        |
| `--color-focus`          | `#f2bd68` | `#80500e` | Two-pixel focus outline                           |
| `--color-error`          | `#ffb5a8` | `#a12a23` | Actionable errors, with explanatory text          |
| `--color-status-surface` | `#21342b` | `#dcebe0` | Confirmed transaction background                  |
| `--color-error-surface`  | `#35231f` | `#f3e2dc` | Failed transaction background                     |
| `--color-lattice`        | `#263029` | `#dde2d7` | Decorative hero dot grid                          |

`--color-art-outline` is white at 10% in dark mode and black at 10% in light mode. It outlines an image without changing the collection’s own colors. The original art retains its historical renderer palette in both themes. Status always includes text; color alone never communicates transaction outcome. Rendered contrast checks and their limitations are in `artifacts/validation.md`.

## Typography

Manrope Variable is self-hosted at `public/fonts/manrope-latin-variable.woff2`, with `font-display: swap` and the real weight range 200–800. The UI uses only 400, 500, and 700. The fallback is `Manrope, sans-serif`. Useful identifiers and formulas use `ui-monospace, SFMono-Regular, Consolas, Liberation Mono, monospace`, restricted to code and data.

| Token             | Desktop default  | Role                                       |
| ----------------- | ---------------- | ------------------------------------------ |
| `--text-small`    | 13px / 0.8125rem | Captions, data, compact secondary copy     |
| `--text-body`     | 16px / 1rem      | Body, fields, controls                     |
| `--text-subtitle` | 20px / 1.25rem   | Section introduction and component heading |
| `--text-title`    | 28px / 1.75rem   | Collection facts and claim amount          |
| `--text-section`  | 40px / 2.5rem    | Section headings; 28px at ≤900px           |
| `--text-display`  | 72px / 4.5rem    | Hero; 56px at ≤1150px, 40px on phones      |

The hero uses 28px in the narrow two-column tablet layout (641–900px) and at ≤370px. At 390px it uses 40px. Headings are weight 700; controls use 700 or 500; text uses 400. H1 line height is 1.08 on desktop and 1.12 on phones, h2 is 1.2, h3 is 1.4, and prose is 1.6. Display tracking is −0.055em (−0.045em on phones); h2 is −0.035em. Smaller labels have natural tracking. Headings balance, descriptions use pretty wrapping, and prose columns have explicit character limits. Data uses tabular numbers. Full addresses and seeds wrap instead of being clipped or ellipsized.

## Layout

`.container` caps content at 1248px. Its width is `calc(100% - 112px)` initially, `calc(100% - 64px)` at ≤1150px, `calc(100% - 40px)` at ≤640px, and `calc(100% - 32px)` at ≤370px. Shared spacing tokens use 4, 8, 12, 16, 24, 32, 48, 64, and 96px. Sections use 96px vertical padding, then 64px at ≤900px and 56px at ≤640px.

- Hero: two columns with a 1.1:1 ratio, changing to 1:1 for tablets and one column at ≤640px. Text and the mint action precede the artwork in DOM order. At 390px the primary action is on the first screen.
- Gallery: three equal columns, becoming one at ≤640px. Additional previews are revealed by a real button; image space is reserved to prevent loading shifts.
- Mint/claim: two columns, then one at ≤640px. Supply, balance, quantity, price, and the main action stay together. The claim panel shares the same lower action alignment on desktop.
- Story and art explanation: two columns, then one at ≤900px; the five historical origins remain visible. The seed explorer wraps long outputs.
- Header and footer wrap when text enlargement needs more space. Navigation becomes a disclosure at ≤900px. Contract rows become two-line layouts at ≤640px, preserving full addresses.
- Modals are centered on desktop and bottom sheets at ≤640px, with a scrollable maximum of viewport height minus 32px and safe-area padding.

Chromium checked widths: 320, 390, 640, 768, 900, 1150, and 1440px in both themes. A 200% text-enlargement check also runs at 390px. These are viewport and text-size tests; they are not physical-device or native browser-zoom sessions.

## Elevation & Depth

Structural regions use one-pixel borders or tonal backgrounds. There is no border-plus-shadow card system and no nested transaction cards. The hero’s main art tile alone has a `0 16px 40px rgb(0 0 0 / .22)` shadow to lift it above the two offset previews. Decorative orbit lines and seed squares remain within the viewport. Dialog backdrops use `rgb(3 9 6 / .78)` and a 5px blur. The dialog uses the browser’s native top layer rather than a custom z-index overlay.

## Shapes

Control radius is 8px; structured surface radius is 16px. Gallery art uses 12px corners, reducing to 10px on phones. The hero art uses 12px corners, reducing to 8px on phones. Dialogs use 20px corners, with square bottom corners on the phone sheet. Trait labels use 4px corners. Small round status dots and step numbers are the only repeated circular UI shapes outside the clocks.

## Components

| Component / pattern                   | Source                            | Behavior and reuse                                                                                                                                                                                      |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buttons and text links                | `src/styles.css`                  | `.button-primary` marks mint as the main action; `.button-neutral`, `.button-wallet`, `.button-quiet` are outlined alternatives. Visible hover, pressed, disabled, loading, and focus states.           |
| `Icon`, `ClockMark`                   | `src/components/Icon.tsx`         | Shared vector icons use `currentColor`; decorative icons are hidden from assistive technology. Icon-only actions carry labels on their buttons.                                                         |
| `WalletControl`, `WalletSheet`        | `src/components/WalletSheet.tsx`  | A single entry point, detected extension rows, mobile app links, Smart Wallet, full account address, copy, Etherscan, disconnect, and network switching.                                                |
| `Modal`                               | `src/components/Modal.tsx`        | Native `dialog.showModal()` traps focus and makes the background inert. Escape and backdrop close; focus returns to the trigger. Body scrolling is held while open. `wide` supports artwork inspection. |
| `Artwork`, `PreviewCard`, `ArtDetail` | `src/components/Artwork.tsx`      | Local SVGs with reserved aspect ratio. `paused` chooses still variants. Preview buttons open exact traits and candidate metadata; original SVG links are available.                                     |
| `MintClaim`                           | `src/components/MintClaim.tsx`    | Quantity bounds follow supply and lifetime allowance. Fields expose loading/unavailable/empty states. Transaction status has a stable polite live region, receipt links, and confirmation retry.        |
| `SeedExplorer`, `OriginTable`         | `src/components/SeedExplorer.tsx` | A labelled integer input, inline range errors, live result announcement, full seed hashes, and a semantic table. Reproduction runs locally from `src/lib/seeds.ts`.                                     |
| FAQ                                   | `src/App.tsx`                     | Native `details`/`summary` with a visible disclosure icon and keyboard support.                                                                                                                         |
| Contracts                             | `src/App.tsx`                     | Full, selectable addresses, descriptive Etherscan links, separate copy buttons, and copy status text.                                                                                                   |

Motion is opt-in under `prefers-reduced-motion: no-preference`. Controls transition only background and transform, at 150ms with `cubic-bezier(.2,0,0,1)`; pressed controls scale to 0.96. Hero tilt changes over 300ms. The global pause control changes original SMIL SVGs to still assets, and reduced motion starts paused. Theme changes suppress transitions for the swap. Spinners retain explanatory text even when animation is disabled.

## Do’s and Don’ts

- Reuse `.container`, `.section`, semantic color tokens, and the six-step type scale for added content.
- Keep one filled amber action per task context. Use outlined styles for wallet utilities and the secondary claim action.
- Keep money, addresses, seed values, and transaction state complete and readable. Label previews, unavailable data, and future links honestly.
- Use the shared native modal, icons, and focus treatment. Preserve both reduced-motion stills and original animated SVGs.
- To add a section, start with a semantic section and h2, use `.section-heading`, and choose an existing grid that collapses at its documented breakpoint. Avoid a new font, card style, motion library, or unrelated accent.
- Keep contract addresses, chain checks, and transaction logic in `src/lib/`; do not scatter them through presentation components.

Guidance adapted from Jakub Krehel’s Better Interface (MIT) and Paul Bakaus’s Impeccable documentation method (Apache-2.0), as pinned by the assignment. Notices and licenses are retained in `LICENSES/Design-guidance.txt`.
