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

## Future: Visual Companion Layer (Post-MVP)

### Interactive Visuals & Rich Media
The listening experience will eventually include a **visual companion layer** — supplemental content that appears on-screen while the user listens, synced to the current segment. This is not a replacement for audio; it's an enhancement for users who are watching their screen (morning coffee, desk listening).

**Interactive Charts & Infographics**
- Earnings segments: live-updating stock charts, revenue breakdowns, analyst estimate comparisons
- Economy segments: Fed rate visualizations, employment trend lines, housing price maps
- Science segments: data visualizations, research figure reproductions
- Sports segments: standings tables, stat comparisons, bracket visualizations
- Charts should be interactive (hover for data points, tap to expand) using a library like Recharts or D3
- Data sourced from the same pipeline that generates the script — structured data output alongside narrative

**Embedded Media & External Links**
- When a source article contains a key image (earnings chart from WSJ, satellite imagery from Reuters), display it inline below the segment
- Sports highlights: link to video clips (YouTube, ESPN) with thumbnail preview cards
- Photography/creative segments: inline image galleries from referenced reviews or announcements
- Each media item shows: thumbnail, source attribution, "View original" link
- Media cards use the same tier-dot system for source credibility

**Implementation Notes**
- New `segment_media` jsonb column on `episode_segments`:
  ```json
  [
    {
      "type": "chart" | "image" | "video" | "infographic",
      "title": "NVIDIA Revenue by Segment",
      "url": "https://...",
      "thumbnail_url": "https://...",
      "source_outlet": "Wall Street Journal",
      "source_tier": 1,
      "chart_data": { ... }  // structured data for interactive charts
    }
  ]
  ```
- Visual companion is opt-in: toggle in settings ("Show visuals while listening")
- Visuals auto-advance with audio playback, synced to segment timestamps
- Offline mode: cache chart data and thumbnails for commute listening

---

## Future: Personal Life Segments (Post-MVP)

### "My Life" — Bespoke Personal Blocks
Beyond news and knowledge, MyPod can include **personal life segments** that are tailored to the user's life context. These are short, actionable blocks that feel like a thoughtful friend giving you relevant suggestions.

**How It Works**
- Users add "Life Contexts" in a profile section — structured personal details that inform content:
  - `Parenting`: child name, age (auto-updates), milestones
  - `Fitness`: current goals, training schedule
  - `Learning`: skills being developed, courses in progress
  - `Home`: projects, seasonal maintenance
  - `Relationships`: anniversaries, birthdays coming up
  - `Career`: role, goals, review cycle timing

**Example: Parenting Context**
A user with a 6-month-old son could receive:
- "THIS WEEK'S FOCUS" block: developmental milestones for 6-month-olds, new games and activities to try, sensory play ideas, sleep regression tips for this age
- Content refreshes weekly, age-aware (automatically adjusts as the child grows)
- Sources from trusted parenting research (AAP, Zero to Three, peer-reviewed developmental psychology)
- Tone matches the user's episode tone setting — factual parents get research citations, mixed gets "here's what to try", commentary gets "real talk from the trenches"

**Data Model**
```sql
create table life_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  context_type text not null,  -- 'parenting', 'fitness', 'learning', etc.
  label text not null,         -- "Leo (6 months)", "Marathon training", etc.
  config jsonb not null,       -- type-specific structured data
  enabled boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);
```

**Example config for parenting:**
```json
{
  "child_name": "Leo",
  "date_of_birth": "2025-09-15",
  "interests": ["sensory play", "outdoor time", "music"],
  "frequency": "weekly"
}
```

**UI: Life Contexts Section**
- Accessible from Dashboard or a new "My Life" section
- Each context is a card with icon, label, and toggle
- Expanding shows configuration options specific to that context type
- Preview of what the next episode's personal block will contain

**Episode Integration**
- Personal blocks appear as a distinct segment type: `segment_type: 'personal'`
- Positioned after the wrap-up, before the knowledge block — a warm, personal note to end on
- Uses a dedicated voice (default: "Neighbor" for warmth, user-configurable)
- Clearly labeled in timeline: "FOR YOU" caps label in peach

**Privacy**
- Life context data never leaves the user's Supabase row
- Not included in shared episodes — personal blocks are stripped from shared versions
- Users can pause any context without deleting it

---

## Hard Rules
- ZERO emoji in the UI
- DM Sans only
- Dark theme with #0d0d1a background
- Peach #F4A261 + blue #4A90D9 accents
- Mobile-first, 520px max-width centered
- All Lucide icons at strokeWidth={1.5}
