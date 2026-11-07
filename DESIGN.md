# DESIGN.md — Anti-Slop Design System for Northstar IT Services

This specification defines the design philosophy, visual architecture, typography, spatial principles, and component standards for Northstar IT Services across both the **Public Website** and the **Admin Studio CMS**.

---

## 1. 🧭 The Anti-Slop Manifesto

The contemporary web is flooded with "AI slop" and commodified SaaS templates: interchangeable purple/cyan gradient blobs, exaggerated floating drop-shadows, generic 3D clay figurines, unreadable low-contrast gray text, and hollow buzzwords.

**Northstar rejects this entirely.**

Our aesthetic is rooted in **Industrial Precision, Swiss Graphic Design, and Functional Telemetry**. Every pixel, border, and character serves a concrete purpose:

1. **Precision Over Decoration**: Use hairline borders (`1px`) and spatial alignment instead of heavy drop-shadows or floating cards.
2. **Tactile & Mechanical**: Interface elements should feel like precision-machined equipment, diagnostic consoles, and high-end editorial publications (inspired by Braun, Dieter Rams, Teenage Engineering, and Linear).
3. **High Signal-to-Noise Ratio**: Dense, readable information hierarchy. No decorative fluff without semantic value.
4. **Deliberate Contrast Shift**: Dual-mode architectural contrast — nocturnal obsidian surfaces for immersive anchors (Hero, Contact, Admin Sidebar) paired with warm limestone/sage editorial surfaces (Services, Work, About, Admin Workspace).
5. **Typography with Character**: Clear separation of roles:
   - `Manrope` for tight, commanding editorial headlines.
   - `DM Sans` for crisp, ergonomic readability.
   - `DM Mono` for technical kickers, telemetry labels, index counters, and operational data.

---

## 2. 🎨 Color Architecture & Tokens

### 2.1 The Obsidian Nocturne (Dark Canvas)
Used for the Hero, Contact section, Admin Sidebar, and Auth interfaces. Evokes focused command rooms and deep engineering environments.

| Token / Usage | Hex Value | Role |
| :--- | :--- | :--- |
| `--surface-obsidian-deep` | `#0c1514` | Core dark canvas / body background |
| `--surface-obsidian-card` | `#17221d` | Elevated containers, cards, sidebar shell |
| `--surface-obsidian-tint` | `#131f1a` | Form containers, input backgrounds (`#0b1411`) |
| `--border-obsidian-subtle` | `rgba(255, 255, 255, 0.09)` | Hairline dividers and orbit rings |
| `--border-obsidian-focus` | `rgba(255, 255, 255, 0.18)` | Interactive borders and hover boundaries |

### 2.2 The Limestone & Sage Editorial (Light Canvas)
Used for the Services, Case Studies, and About sections, as well as the Admin Content workspace. Provides natural daylight readability without harsh, sterile `#ffffff`.

| Token / Usage | Hex Value | Role |
| :--- | :--- | :--- |
| `--surface-stone-primary` | `#f0f2ed` | Main light section canvas |
| `--surface-stone-secondary`| `#e8ece5` | Case study and alternate panel background |
| `--surface-stone-card` | `#f6f7f3` | Card interiors and repeat containers |
| `--border-stone-grid` | `#d7dcd4` | Clean structural 1px grid borders |
| `--text-stone-headline` | `#101915` | High-contrast editorial titles |
| `--text-stone-body` | `#747d76` | Readable, balanced prose |

### 2.3 Utilitarian Accents & Telemetry Signals
Accents are never decorative wallpaper; they act strictly as focal beacons, active states, and operational status indicators.

| Color | Hex | Psychological Role & Usage |
| :--- | :--- | :--- |
| **Electric Lime** | `#baf478` / `#bcf778` | **Primary Brand Beacon**: CTAs, active badges, live pulse dots, brand mark, key metrics |
| **Lime Glow** | `rgba(186, 244, 120, 0.25)` | Micro-glow for live telemetry indicators and focus rings |
| **Forest Olive** | `#536746` / `#829d62` | Secondary technical kickers, results, and subtle icons on light canvas |
| **Muted Steel** | `#7d9ab6` / `#d1dce5` | Digital product / platform accent tone in project cards |
| **Warning / Bronze**| `#d3ba89` | Warm secondary metrics, pending notices |
| **Signal Crimson** | `#e04f35` / `#ba331c` | Urgent alerts, unread message badges, destructive actions |

### 2.4 Multi-Theme Architecture (Light, Dark, Auto)
Northstar implements a precision three-state theme controller (`auto`, `light`, `dark`):
- **`auto`**: Listens to system OS telemetry via `prefers-color-scheme`. Dynamic real-time switching without manual intervention.
- **`dark`**: Full nocturnal slate & obsidian architecture across both website sections and the Admin Studio cockpit.
- **`light`**: Daylight limestone command architecture with high-contrast forest olive accents (`#477124`).
- **Anti-Flicker Execution**: Injected inline `<head>` initializer in `BaseLayout.astro` prevents Flash of Unstyled Theme (FOUT).
- **Segmented Mechanical Switch**: Precision segmented button group (`ThemeToggle.tsx`) without cartoonish animations.

---

## 3. ✍️ Typographic Hierarchy & Rules

| Role | Font Family | Size / Leading | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | `Manrope, sans-serif` | `clamp(50px, 6vw, 78px)` / `1.03` | `600` | `-0.065em` | Hero title, contact impact hook |
| **Section H2** | `Manrope, sans-serif` | `clamp(34px, 4.5vw, 54px)` / `1.07` | `600` | `-0.055em` | Section headers, major editorial statements |
| **Card H3** | `Manrope, sans-serif` | `18px - 21px` / `1.2` | `600` - `700` | `-0.035em` | Service title, project title, modal headline |
| **Body Primary**| `DM Sans, sans-serif` | `14px - 15px` / `1.75` | `400` - `500` | `0` | Lead paragraphs, descriptions, input texts |
| **UI Control** | `DM Sans, sans-serif` | `11px - 13px` / `1.4` | `600` - `700` | `0` | Buttons, navigation labels, tab switches |
| **Telemetry** | `DM Mono, monospace` | `8px - 11px` / `1.3` | `500` - `600` | `+0.11em` | Section kickers, index numbers (`01`), timestamps, status badges |

### Typographic Principles:
1. **Never use generic fonts like Inter, Roboto, or Arial** without purposeful styling.
2. **Kickers are always uppercase DM Mono with positive tracking** (`letter-spacing: 0.11em`).
3. **Headlines use tight negative tracking** (`letter-spacing: -0.05em` to `-0.065em`) for a solid, crafted editorial presence.
4. **Italics are reserved for accented words with color shift** (e.g. `<em>business forward.</em>` in `#baf478`).

---

## 4. 📐 Spatial Grid & Architectural Layout

### 4.1 Structural Framing
- **Maximum Width**: `1160px` centered via `.wrap { width: min(1160px, calc(100% - 64px)); margin: 0 auto; }`.
- **Rhythm & Padding**: Major sections use generous breathing room (`padding: 112px 0` on desktop, `78px` on tablet, `48px` on mobile).
- **Hairline Grids**: Grids are separated by solid `1px` lines (`#d7dcd4` or `#ffffff17`) rather than floating cards with gaps.

### 4.2 Border Radii Discipline
To maintain architectural rigour, roundness is strictly bounded:
- **Buttons & Tags**: `border-radius: 3px` (subtle bevel, never pill-shaped).
- **Panels & Cards**: `border-radius: 4px` to `6px` (sharp, confident edges).
- **Status Indicators / Dots**: `border-radius: 50%` (true geometric circles).
- **Forbidden**: Large bubbly radii (`> 12px` on cards or `9999px` pill buttons).

---

## 5. 🖥️ Public Website Design Principles

### 5.1 Hero Section: Engineering Telemetry
- **Left Hemisphere**: Clear, grounded value proposition. Status pulse dot (`7px` glowing green) signaling operational readiness ("AVAILABLE FOR Q2 ENGAGEMENTS").
- **Right Hemisphere**: Abstract technical radar / orbital core. Concentric dashed rings, orbital rotation, real-time looking telemetry badges (e.g. `99.98% uptime`, `latency 24ms`).

### 5.2 Services Section: Architectural Ledger
- **Structure**: 3-column continuous grid with vertical divider lines.
- **Header**: Monospaced sequential numbering (`01`, `02`, `03`) with a category tag (`MODERNIZE`, `BUILD`, `PROTECT`).
- **Interaction**: Subtle bottom-right directional arrow indicator (`→`) that shifts on hover.

### 5.3 Work / Case Studies: Diagnostic Windows
- Avoid generic mockups on phone screens.
- Frame deliverables inside **diagnostic window frames** with title bars, mini status lights (`5px` gray dots), schematic charts, and clear ROI metrics (`42% faster reporting`, `2.4x self-service`).

### 5.4 About Section: The Verification Seal
- Features a circular mechanical stamp/seal with dual concentric dashed borders.
- Delivers authority and engineering longevity (`12+ years`, `Jakarta · APAC`).

### 5.5 Contact Section: Command Console
- Dark obsidian surface creating visual closure.
- Clean high-contrast input fields with mechanical focus rings (`#baf47829`).
- Instant validation and reassuring human confirmation state.

---

## 6. 🎛️ Admin Studio (CMS & Telemetry) Design Principles

The Admin Studio is a **dense, high-efficiency workstation**, not a toy dashboard.

### 6.1 The 3 Golden Rules of Admin UI:
1. **Density with Legibility**: Use compact font sizes (`10px - 12px`) with generous letter-spacing on metadata and tight, high-contrast rows.
2. **Keyboard & Action First**: Clear visual focus states, direct CTA anchors, and no hidden multi-step dropdown menus for common tasks.
3. **Unambiguous State Telemetry**:
   - `UNREAD`: High-contrast peach/crimson badge with attention dot.
   - `READ`: Subtle muted sage pill.
   - `REPLIED`: Crisp green badge signaling resolution.

### 6.2 Admin Components:
- **Sidebar**: Sticky, 235px obsidian bar with monospaced section dividers and quick live-site preview links.
- **Top Bar**: Minimalist breadcrumb system and notification bell badge.
- **Stat Cards**: 4-column metric grid displaying system state, total inquiries, and recent activity.
- **Editor Panels**: Clean white cards with `1px #e5e9e2` border, monospaced section kickers, dual-column input fields, and real-time preview thumbnails for uploaded media.

---

## 7. 🚫 The "Anti-Slop" Checklist (What to Avoid)

| Anti-Pattern (Slop) | Northstar Standard (Anti-Slop) |
| :--- | :--- |
| ❌ Blurry purple/blue radial blobs as backgrounds | ✅ Deep nocturnal obsidian `#0c1514` with subtle localized radial glow |
| ❌ 3D floating emojis, puffy isometric robots | ✅ Schematic UI windows, orbital telemetry, architectural stamps |
| ❌ Pill-shaped buttons with `border-radius: 9999px` | ✅ Crisp `border-radius: 3px` with high-contrast tactile hover |
| ❌ Fluffy hype copy ("AI-powered revolution") | ✅ Concrete, grounded copy ("Unified reporting & resilient cloud foundation") |
| ❌ Low-contrast gray-on-white text (unreadable) | ✅ High-contrast `#101915` on `#f0f2ed`, with `#747d76` for supporting copy |
| ❌ Floating cards with 60px blurred drop shadows | ✅ Structural `1px` grid borders (`#d7dcd4`) and subtle `box-shadow` |
| ❌ Endless generic stock photos of smiling people | ✅ Clean SVG visual schematics or real project screenshots |

---

## 8. 🛠️ Code Conventions for CSS & UI

1. **Keep styles consolidated and modular**:
   - Core design tokens and utilities reside in `src/styles/global.css`.
   - Responsive breakpoints: Mobile (`max-width: 560px`), Tablet (`max-width: 850px`), Desktop (`> 850px`).
2. **Accessibility (a11y)**:
   - Decorative ornaments (orbits, spark icons, status dots) must have `aria-hidden="true"`.
   - Contrast ratio between text and background must exceed WCAG AA standards (4.5:1 minimum).
3. **Performance**:
   - Zero external icon libraries (no bulky FontAwesome or Lucide packages if raw SVG/CSS glyphs suffice).
   - Fonts are preconnected to Google Fonts CDN with minimal weights (`DM Sans: 400,600`, `Manrope: 600,700,800`, `DM Mono: 500`).
