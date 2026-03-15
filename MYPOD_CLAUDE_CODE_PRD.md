# MyPod — Claude Code Implementation PRD

> **Your News. Your Voice. Your Commute.**
> A voice-first, AI-generated personalized podcast.

**Version:** 1.1
**Author:** Smithers
**Date:** March 2026
**Stack:** React (Vite) · Supabase · Anthropic Claude · ElevenLabs TTS · Lucide Icons · Tailwind CSS

---

## 1. What This Is

MyPod is a personalized AI-generated podcast that delivers a bespoke audio briefing every morning (or weekly) based on topics the user selects. The MVP is the **visual control layer** — the app where users configure their pod, manage topics, set preferences, preview episodes, and share them. Audio generation will be wired in after the visual foundation is solid.

This is **voice-first by design** — the visual UI is the configuration and management surface. The listening experience will eventually be primarily voice-controlled (AirPods, car, running). The app is the cockpit, not the destination.

---

## 2. Design System

### Aesthetic Direction
Dark, editorial, refined. Think Bloomberg Terminal meets a premium podcast app. Not playful — purposeful. No emoji anywhere in the UI. Use Lucide React icons exclusively.

### Colors
```
--bg-primary: #0d0d1a (near-black with blue tint)
--bg-card: rgba(255,255,255,0.04)
--bg-card-hover: rgba(255,255,255,0.08)
--border-subtle: rgba(255,255,255,0.08)
--border-active: rgba(74,144,217,0.4)
--text-primary: #ffffff
--text-secondary: #aaaaaa
--text-muted: #666666
--accent-peach: #F4A261 (brand accent, CTAs, highlights)
--accent-blue: #4A90D9 (interactive elements, selections)
--accent-blue-dark: #1B3A5C (headers, premium feel)
--danger: #E74C3C
--success: #2D8A6E
```

### Typography
- **Font:** DM Sans (Google Fonts) — load weights 300, 400, 500, 600, 700
- **Headings:** DM Sans 700, tracking tight (-0.5px)
- **Body:** DM Sans 400, 14px
- **Labels/Caps:** DM Sans 600, 11px, letter-spacing 1.5–2px, uppercase
- **Numbers (timestamps, stats):** tabular-nums variant

### Icons
- **Library:** `lucide-react`
- **Size convention:** 16px inline, 20px in cards, 24px in nav/headers
- **Style:** `strokeWidth={1.5}` for refined weight. Never use filled variants.
- **NEVER use emoji.** Every icon is a Lucide component.

### Components
- **Cards:** `background: var(--bg-card)`, `border: 1px solid var(--border-subtle)`, `border-radius: 16px`, `padding: 20px`
- **Hover states:** card bg shifts to `--bg-card-hover`, border shifts to `rgba(244,162,97,0.3)`
- **Active/selected states:** bg includes accent color at 12% opacity, border at 40% opacity
- **Toggle switches:** 44x24px, custom (not native checkbox), animated thumb
- **Buttons:** border-radius 10-12px, font-weight 600, transitions on all properties 0.2s
- **Ambient glow orbs:** 2 fixed-position blurred circles (blue top-right, peach bottom-left) at ~5-8% opacity for depth. CSS only, no canvas.

### Layout
- Max content width: 520px, centered
- Sticky top bar with blur backdrop
- Fixed bottom navigation bar with blur backdrop
- Content area scrolls with bottom padding for nav clearance (100px)
- Mobile-first, single column

---

## 3. App Structure

### Navigation (Bottom Tab Bar)
5 tabs with Lucide icons:

| Tab | Icon (Lucide) | View |
|-----|---------------|------|
| Home | `Home` | Dashboard — status, quick controls, episode preview link |
| Topics | `Hash` | Topic management — add/remove/configure topics |
| Throttles | `Sliders` | Three dials — tone, length, cadence |
| Voices | `Mic` | Voice library + personality packs + per-topic assignment |
| Episode | `Radio` | Episode preview timeline + player + share |

Active tab: icon at full opacity + `--accent-peach` label color. Inactive: 40% opacity.

### Top Bar
- Sticky, blur backdrop (`backdrop-filter: blur(20px)`)
- Left: back arrow (ChevronLeft) when not on dashboard, then logo
- Logo: "my" in white 700 + "pod" in `--accent-peach` 700
- Right: current view name in muted caps

---

## 4. Data Model (Supabase)

See `supabase/migrations/` for table definitions.

---

## 5. Topic Catalog

See `src/lib/constants.ts` for TOPIC_CATALOG definition.

---

## 6. Voice System

See `src/lib/constants.ts` for BASE_VOICES and PERSONALITY_PACKS definitions.

---

## 7. Screen-by-Screen Specification

### 7.1 Dashboard (Home)
- Next Episode Card with date, delivery time, cadence badge, topic chips
- Quick Controls Grid (2x2): Tone, Length, Topics count, Voice
- Episode Preview Button with gradient
- Delivery Time Row with time input

### 7.2 Topics
- Header with topic count and Add Topic button
- Wild Card Discovery toggle
- Expandable topic cards with: coverage depth, pin toggle, voice selection, sub-topics, remove button
- Add Topic Modal (bottom sheet)

### 7.3 Throttles
- Three stacked cards: Tone (factual/mixed/commentary), Length (quick/standard/deep), Cadence (daily/weekly)
- Selected state with blue accent

### 7.4 Voices
- Base Voices section with voice cards
- Personality Packs section with PRO+ badge
- Per-topic voice assignment display

### 7.5 Episode Preview
- Header with date, duration, tone, segment count, source summary
- Vertical timeline with expandable segments showing sources with tier dots
- Player bar with transport controls
- Show Notes with sources grouped by segment
- Share section
- Voice Interaction Preview

---

## 8. Share Flow
- Share token generation via nanoid
- Share modal with copy link and native share
- Public share landing page at /s/:shareToken

---

## 9-16. Implementation Details

See the full codebase for implementation of all remaining sections including:
- Project structure
- Dependencies
- Implementation order (Phases 1-5)
- Source and citation system
- Success criteria

---

## Hard Rules
- ZERO emoji in the UI
- DM Sans only
- Dark theme with #0d0d1a background
- Peach #F4A261 + blue #4A90D9 accents
- Mobile-first, 520px max-width centered
- All Lucide icons at strokeWidth={1.5}
