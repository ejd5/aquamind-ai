# AQWELIA — Design System

> Source of truth for colors, typography, spacing, shadows, components and visual patterns.
>
> Last updated: P6-DESIGN · Stack: Next.js 16 + Tailwind CSS v4 + shadcn/ui

---

## 1. Architecture

AQWELIA uses a **dual-token system** that coexists by design:

| System | Prefix | Color space | Purpose |
|--------|--------|-------------|---------|
| **Legacy "Oceanic Luxury"** | `--gold`, `--ocean`, `--pearl`, `--accent`... | `oklch()` | Drives shadcn/ui primitives (`bg-background`, `text-primary`, `border-border`...) and the existing glassmorphism utilities. Defined in `src/app/globals.css`. |
| **Centralized brand (P6-DESIGN)** | `--aqwelia-*` | `#hex` | Single source of truth for the brand palette by name (`lagoon`, `aqua`, `champagne`...). Resolves to readable Tailwind utilities (`text-lagoon`, `bg-night`, `rounded-aq-md`, `shadow-aq-lg`). Defined in `src/app/globals.css`. |

Both systems are wired into Tailwind v4 via `@theme inline` (in `globals.css`) and into the legacy Tailwind v3 `tailwind.config.ts` for editor/IDE IntelliSense.

**Rule of thumb for new components:**
- For shadcn/ui-driven UI (cards, buttons, inputs) → keep using `bg-background`, `text-primary`, `rounded-lg`...
- For brand-forward surfaces (hero sections, CTAs, badges, marketing) → use `text-lagoon`, `bg-night`, `text-champagne`, `rounded-aq-xl`...

---

## 2. Brand Color Palette (P6-DESIGN)

Defined in `src/app/globals.css` as `--aqwelia-*` and exposed via the `--color-*` aliases in `@theme inline`.

| Token | CSS variable | Light value | Dark value | Usage |
|-------|--------------|-------------|------------|-------|
| **Lagoon** | `--aqwelia-lagoon` | `#18CFC3` | `#2EE0D6` | Primary brand cyan-teal. Buttons, links, focus rings, primary CTAs. |
| **Aqua** | `--aqwelia-aqua` | `#72E8DF` | `#8FEEDE` | Light aqua accent. Highlights, hover states, decorative orbs. |
| **Deep Teal** | `--aqwelia-deep-teal` | `#073C45` | `#0A5663` | Dark text on light backgrounds. Headings on `mist`/`ivory`. |
| **Night** | `--aqwelia-night` | `#061F2B` | `#03131A` | Darkest navy. Hero section backgrounds, dark UI panels. |
| **Mist** | `--aqwelia-mist` | `#EAFBF8` | `#0A1F2B` | Near-white aqua tint. Page-level background alt. |
| **Silver** | `--aqwelia-silver` | `#A8BDC1` | `#6E8085` | Muted neutral. Borders, dividers, secondary text. |
| **Ivory** | `--aqwelia-ivory` | `#FAFCFB` | `#0F2A36` | Warm off-white. Cards, surfaces, modal backgrounds. |
| **Champagne** | `--aqwelia-champagne` | `#C6A56B` | `#D8B97A` | Premium gold accent. CTAs, badges, "Pro" tags, dividers. |

### Tailwind utilities

Each color is available as `text-*`, `bg-*`, `border-*`, `fill-*`, `stroke-*`, `ring-*`:

```tsx
<button className="bg-lagoon text-night hover:bg-aqua rounded-aq-md shadow-aq-md">
  Get started
</button>

<div className="bg-night text-ivory rounded-aq-xl border border-silver/30">
  <h2 className="text-champagne font-aq-display">Premium plan</h2>
</div>
```

### Raw CSS usage

```css
.hero-title {
  color: var(--aqwelia-deep-teal);
  background: linear-gradient(95deg, var(--aqwelia-lagoon), var(--aqwelia-champagne));
  border-radius: var(--aqwelia-radius-lg);
  box-shadow: var(--aqwelia-shadow-md);
}
```

---

## 3. Legacy "Oceanic Luxury" Tokens

These pre-date P6-DESIGN and remain the foundation for shadcn/ui primitives. They are `oklch()`-based for perceptual uniformity and automatic dark mode.

| Token | Light (oklch) | Dark (oklch) | Tailwind utility |
|-------|---------------|--------------|------------------|
| `--background` | `0.99 0.006 195` | `0.18 0.02 200` | `bg-background` |
| `--foreground` | `0.20 0.04 200` | `0.96 0.01 195` | `text-foreground` |
| `--primary` | `0.39 0.08 200` | `0.76 0.11 195` | `bg-primary` / `text-primary` |
| `--primary-foreground` | `0.99 0.01 195` | `0.15 0.03 200` | `text-primary-foreground` |
| `--accent` | `0.65 0.11 195` | `0.65 0.11 195` | `bg-accent` |
| `--gold` | `0.45 0.10 200` | `0.45 0.10 200` | `text-gold` |
| `--gold-light` | `0.65 0.11 195` | `0.65 0.11 195` | (raw CSS) |
| `--ocean` | `0.69 0.10 195` | `0.69 0.10 195` | `text-ocean` |
| `--ocean-deep` | `0.30 0.07 200` | `0.18 0.02 200` | `text-ocean-deep` |
| `--ocean-light` | `0.76 0.11 195` | `0.76 0.11 195` | `text-ocean-light` |
| `--pearl` | `0.99 0.006 195` | `0.18 0.02 200` | `bg-pearl` |
| `--card` | `1 0.004 195` | `0.22 0.025 200` | `bg-card` |
| `--muted` | `0.96 0.014 195` | `0.26 0.025 200` | `bg-muted` |
| `--border` | `0.91 0.015 195` | `1 0 0 / 10%` | `border-border` |
| `--ring` | `0.39 0.08 200` | `0.76 0.11 195` | `ring-ring` |
| `--destructive` | `0.577 0.245 27.325` | `0.704 0.191 22.216` | `bg-destructive` |
| `--radius` | `0.875rem` | `0.875rem` | `rounded-lg` (calc-derived: `sm`/`md`/`lg`/`xl`/`2xl`) |

Chart palette (`--chart-1` → `--chart-5`) is wired to Recharts via `src/components/ui/chart.tsx`.

---

## 4. Spacing — Border Radii

Two coexisting scales (do not mix within the same component):

### shadcn/ui scale (calc-derived from `--radius = 0.875rem`)

| Token | Value | Tailwind utility |
|-------|-------|------------------|
| `--radius-sm` | `calc(var(--radius) - 4px)` = `0.625rem` | `rounded-sm` |
| `--radius-md` | `calc(var(--radius) - 2px)` = `0.75rem` | `rounded-md` |
| `--radius-lg` | `var(--radius)` = `0.875rem` | `rounded-lg` |
| `--radius-xl` | `calc(var(--radius) + 4px)` = `1.125rem` | `rounded-xl` |
| `--radius-2xl` | `calc(var(--radius) + 10px)` = `1.5rem` | `rounded-2xl` |

Use this for shadcn/ui components (Button, Input, Card, Dialog...).

### AQWELIA named scale (P6-DESIGN, fixed values)

| Token | Value | Tailwind utility |
|-------|-------|------------------|
| `--aqwelia-radius-sm` | `0.5rem` (8px) | `rounded-aq-sm` |
| `--aqwelia-radius-md` | `1rem` (16px) | `rounded-aq-md` |
| `--aqwelia-radius-lg` | `1.5rem` (24px) | `rounded-aq-lg` |
| `--aqwelia-radius-xl` | `2rem` (32px) | `rounded-aq-xl` |

Use this for brand-forward surfaces (hero cards, marketing panels, decorative containers) where you want a fixed, design-controlled radius independent of the shadcn scale.

---

## 5. Shadows — Premium Elevation

Defined as soft, glassmorphism-friendly box-shadows (no harsh edges). All three work on top of `backdrop-filter: blur()` without visual conflict.

| Token | Value | Tailwind utility |
|-------|-------|------------------|
| `--aqwelia-shadow-sm` | `0 2px 8px -2px rgba(0,0,0,0.1)` | `shadow-aq-sm` |
| `--aqwelia-shadow-md` | `0 8px 24px -4px rgba(0,0,0,0.15)` | `shadow-aq-md` |
| `--aqwelia-shadow-lg` | `0 18px 40px -22px rgba(0,0,0,0.2)` | `shadow-aq-lg` |

Legacy glow utilities (still in use across landing pages):

- `.glow-primary` — `0 0 40px -10px oklch(0.39 0.08 200 / 0.5)` (deep teal halo)
- `.glow-gold` — `0 0 40px -10px oklch(0.65 0.11 195 / 0.5)` (gold halo)
- `.glow-pulse-anim` — animated `glow-pulse` keyframe (4s ease-in-out infinite)

---

## 6. Typography

### Font families

| Token | Value | Tailwind utility | Loaded via |
|-------|-------|------------------|------------|
| `--font-geist-sans` | Geist Sans | `font-sans` (default) | `next/font/google` in `src/app/layout.tsx` |
| `--font-geist-mono` | Geist Mono | `font-mono` | `next/font/google` |
| `--font-playfair-display` | Playfair Display (500/600/700/800) | `font-display` | `next/font/google` |
| `--aqwelia-font-display` | `'Cormorant Garamond', serif` | `font-aq-display` | NOT loaded by default — opt-in via `next/font/google` when first used |
| `--aqwelia-font-body` | `-apple-system, BlinkMacSystemFont, sans-serif` | `font-aq-body` | System stack — no load needed |

> **Note:** `--aqwelia-font-display` is declared but not loaded by `next/font/google` yet. To activate Cormorant Garamond, add it to `src/app/layout.tsx`:
> ```ts
> import { Cormorant_Garamond } from "next/font/google";
> const cormorant = Cormorant_Garamond({
>   variable: "--aqwelia-font-display-loaded",
>   subsets: ["latin"],
>   weight: ["400", "500", "600", "700"],
>   style: ["normal", "italic"],
>   display: "swap",
> });
> ```
> Then update `--aqwelia-font-display` to `var(--aqwelia-font-display-loaded), 'Cormorant Garamond', serif` for proper fallback.

### Type scale (Tailwind defaults)

| Use case | Class | Approx. size |
|----------|-------|--------------|
| Hero H1 (landing) | `text-5xl md:text-7xl font-display` | 48–72px |
| Section H2 | `text-3xl md:text-5xl font-display` | 30–48px |
| Card H3 | `text-xl md:text-2xl font-semibold` | 20–24px |
| Body | `text-base md:text-lg` | 16–18px |
| Small / caption | `text-sm text-muted-foreground` | 14px |
| Eyebrow label | `.section-label` (0.7rem, 600, uppercase, 0.18em letter-spacing, gold) | 11px |

### Eyebrow / section label pattern

```tsx
<p className="section-label">Le problème</p>
<h2 className="text-3xl md:text-5xl font-display">Pourquoi l'entretien de piscine coûte si cher</h2>
```

The `.section-label` class is defined in `globals.css` and uses `color: var(--gold)` (light) / `var(--gold-light)` (dark).

---

## 7. Reusable Component Patterns (CSS utility classes)

All defined in `src/app/globals.css`. Use as className strings — no import needed.

### Glassmorphism

| Class | Effect | Used for |
|-------|--------|----------|
| `.glass-card` | Frosted glass card (`backdrop-filter: blur(22px) saturate(180%)`, semi-transparent bg, inset top highlight, deep teal drop shadow). Dark mode aware. | Marketing cards, hero CTAs, dashboard modules. |
| `.glass-pill` | Thinner glass pill (16px blur, more opaque). | Badges, nav pills, CTAs in nav bars. |
| `.input-glass` | Glass-styled form input with focus state (gold ring on focus). | `/pro/early-access`, `/contact`, `/partenaires/apply` forms. |

### Backgrounds & decorative effects

| Class | Effect |
|-------|--------|
| `.aurora-bg` | Multi-radial-gradient mesh (lagoon + gold + deep teal + ocean-light). Full-page hero background. Dark mode variant. |
| `.aurora-orb` | Absolutely-positioned blurred orb (50%, blur 70px, opacity 0.6) that floats via `aurora-float` 22s animation. |
| `.gradient-text-premium` | Deep-teal → gold → ocean-light linear gradient clipped to text. For premium headlines. |
| `.aqua-text-gradient` | Animated shimmer (deep-teal → gold → deep-teal, 200% size, 5s linear infinite). For the AQWELIA wordmark. |
| `.gold-divider` | 1px gold-to-transparent horizontal divider. Section separators. |

### Glows

| Class | Effect |
|-------|--------|
| `.glow-primary` | Static deep-teal halo box-shadow. |
| `.glow-gold` | Static gold halo. |
| `.glow-pulse-anim` | Animated glow keyframe (4s). Hero CTAs. |

### Animations (keyframes)

| Keyframe | Duration | Used by |
|----------|----------|---------|
| `aurora-float` | 22s ease-in-out infinite | `.aurora-orb` |
| `aqua-shimmer` | 5s linear infinite | `.aqua-text-gradient` |
| `aqua-float` | (defined, unused — available) | Decorative floating elements |
| `glow-pulse` | 4s ease-in-out infinite | `.glow-pulse-anim` |
| `premium-rise` | 0.6s cubic-bezier(0.22,1,0.36,1) | `.rise-in` (mount animation) |

All animations respect `@media (prefers-reduced-motion: reduce)` (disabled for accessibility).

### Mobile / safe area

| Class | Effect |
|-------|--------|
| `.safe-area-top` / `-bottom` / `-left` / `-right` / `-all` | `padding: env(safe-area-inset-*)` for iOS notch. |
| `.mobile-bottom-tabs` | Fixed bottom bar with safe-area-inset-bottom padding. |
| `.mobile-header` | Top padding for safe-area-inset-top. |
| `.mobile-scroll` | `-webkit-overflow-scrolling: touch` + overscroll containment. |
| `.custom-scroll` | 6px thin scrollbar with gold thumb. |

### Navigation

| Class | Effect |
|-------|--------|
| `.nav-link` | Underline-on-hover effect: gradient gold underline scales from 0 to 1 over 0.35s. |

---

## 8. Component Library (shadcn/ui)

Built on Radix UI primitives, themed via the legacy `--background` / `--primary` / `--accent` tokens. Located in `src/components/ui/`.

| Component | File | Notes |
|-----------|------|-------|
| Button | `button.tsx` | Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default`, `sm`, `lg`, `icon`. |
| Card | `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. |
| Input / Textarea / Label | `input.tsx`, `textarea.tsx`, `label.tsx` | Standard shadcn. |
| Dialog / Sheet / Drawer | `dialog.tsx`, `sheet.tsx`, `drawer.tsx` | Mobile-aware: Sheet for desktop, Drawer (vaul) for mobile. |
| Form | `form.tsx` | React Hook Form + Zod resolver. |
| Toast / Sonner | `toast.tsx`, `sonner.tsx`, `toaster.tsx` | Sonner is the primary toast system. |
| Accordion | `accordion.tsx` | Used in FAQ sections (landing, /tarifs, /comment-ca-marche). |
| Tabs | `tabs.tsx` | Used in /tarifs pricing explorer. |
| Tooltip / Popover / HoverCard | — | Contextual overlays. |
| Select / Combobox (Command) | `select.tsx`, `command.tsx` | Form selectors. |
| Calendar / Date Picker | `calendar.tsx` | `react-day-picker` v9. |
| Chart | `chart.tsx` | Recharts wrapper with `--chart-1` to `--chart-5` palette. |
| Sidebar | `sidebar.tsx` | App shell navigation (mobile). |
| Carousel | `carousel.tsx` | Embla-carousel-react. |

---

## 9. Layout Patterns

### Page container

```tsx
<main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
  {/* content */}
</main>
```

### Section spacing

```tsx
<section className="py-16 md:py-24">
  <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    {/* eyebrow + headline + content */}
  </div>
</section>
```

### Grid (3 cols → 2 cols → 1 col responsive)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* cards */}
</div>
```

### Hero with aurora background

```tsx
<section className="relative overflow-hidden">
  <div className="absolute inset-0 aurora-bg" />
  <div className="aurora-orb" style={{ background: "var(--aqwelia-lagoon)", width: 320, height: 320, top: "10%", left: "60%" }} />
  <div className="relative z-10 mx-auto max-w-6xl px-4 py-24">
    <p className="section-label">Eyebrow</p>
    <h1 className="text-5xl md:text-7xl font-display text-deep-teal">
      Premium headline
    </h1>
    <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
      Subtitle
    </p>
    <div className="mt-8 flex gap-4">
      <button className="bg-lagoon text-night rounded-aq-md px-6 py-3 shadow-aq-md hover:bg-aqua transition">
        Primary CTA
      </button>
      <button className="glass-pill rounded-aq-md px-6 py-3">
        Secondary
      </button>
    </div>
  </div>
</section>
```

---

## 10. Dark Mode

Toggled via the `dark` class on `<html>` (managed by `next-themes`).

- All legacy `--*` tokens (background, primary, ocean, gold...) have explicit `.dark` overrides.
- All `--aqwelia-*` brand tokens (P6-DESIGN) have explicit `.dark` overrides that brighten the chroma and invert the surface tones (mist/ivory → deep navy).

Dark mode is **opt-in** for new components: prefer `bg-background`, `text-foreground`, `border-border` (auto-flip) over hardcoded `bg-white` / `text-black`.

---

## 11. Accessibility

- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables `.aurora-orb`, `.aqua-text-gradient`, `.glow-pulse-anim`, `.rise-in` animations.
- **Color contrast**: brand `lagoon`/`aqua` on `night`/`deep-teal` passes WCAG AA. `champagne` on `night` passes AAA. `silver` on `mist` is borderline — use only for non-text decorative borders.
- **Focus rings**: all interactive elements use `outline-ring/50` (set in `@layer base` `*` rule). Custom buttons should preserve this.
- **Tap targets**: `min-h-11` (44px) for all mobile buttons (Capacitor requirement).
- **Safe areas**: iOS notch handled via `.safe-area-*` utilities (PWA / Capacitor).

---

## 12. Token Map (Quick Reference)

```
COLORS (Tailwind v4 @theme inline)
├── shadcn/ui primitives (legacy, oklch)
│   ├── --background / --foreground / --card / --popover
│   ├── --primary / --primary-foreground / --secondary / --muted
│   ├── --accent / --accent-foreground / --destructive
│   ├── --border / --input / --ring
│   ├── --chart-1 … --chart-5
│   ├── --sidebar-* (7 tokens)
│   └── AQWELIA legacy: --gold, --gold-light, --gold-foreground,
│       --ocean, --ocean-deep, --ocean-light, --pearl
│
└── AQWELIA brand (P6-DESIGN, hex)
    ├── --aqwelia-lagoon / --aqwelia-aqua
    ├── --aqwelia-deep-teal / --aqwelia-night
    ├── --aqwelia-mist / --aqwelia-silver
    ├── --aqwelia-ivory / --aqwelia-champagne
    └── (dark overrides in .dark block)

RADII
├── shadcn: --radius (0.875rem) → sm/md/lg/xl/2xl (calc-derived)
└── AQWELIA: --aqwelia-radius-{sm,md,lg,xl} (fixed: 0.5/1/1.5/2rem)

SHADOWS
├── AQWELIA: --aqwelia-shadow-{sm,md,lg}
└── Legacy glows: .glow-primary, .glow-gold, .glow-pulse-anim

TYPOGRAPHY
├── Loaded: Geist Sans (font-sans), Geist Mono (font-mono), Playfair Display (font-display)
├── Declared (opt-in load): Cormorant Garamond (--aqwelia-font-display)
└── System stack: --aqwelia-font-body
```

---

## 13. File References

| File | Purpose |
|------|---------|
| `src/app/globals.css` | All CSS variables + utility classes (single source of truth for design tokens) |
| `tailwind.config.ts` | Legacy Tailwind v3 config (editor IntelliSense, boxShadow + fontFamily + colors + borderRadius extensions) |
| `src/app/layout.tsx` | Root layout, font loading (`next/font/google`), `<NextIntlClientProvider>` wrapper |
| `src/components/ui/*` | shadcn/ui component library |
| `docs/DESIGN_SYSTEM.md` | This file |
| `docs/I18N_ROUTING.md` | Migration plan for locale-prefixed routing (`/fr/`, `/en/`...) |

---

_Maintained by the AQWELIA engineering team. Update this document whenever you add a new token, component, or visual pattern._
