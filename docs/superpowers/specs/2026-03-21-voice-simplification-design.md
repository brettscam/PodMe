# Voice Simplification Design

**Date:** 2026-03-21
**Status:** Draft
**Goal:** Reduce the voice system from 13 voices, dual TTS engines, per-topic overrides, and a dedicated tab to 4 voices, one TTS engine, one default selection, and a card in Throttles.

---

## Problem

The current voice system is overbuilt for the product's stage:

- 13 voices (8 base + 5 personality packs) with a free/pro tier split
- Dual TTS engines: ElevenLabs for previews, Chatterbox via Replicate for segments
- Per-topic voice overrides adding UI complexity in the Topics view
- A dedicated Voices tab consuming bottom nav real estate
- A `VoiceCard` component, `useVoicePreviews` hook, and two API endpoints (`list-voices`, `voice-sample`) serving only the preview flow

None of this complexity serves users yet. Simplifying lets us ship faster and reduces API costs.

---

## Design

### Four Voices

Strip to four voices with distinct, non-overlapping vibes:

| ID | Name | Description |
|----|------|-------------|
| `anchor` | The Anchor | Warm, authoritative, NPR-adjacent |
| `correspondent` | The Correspondent | Crisp, energetic, faster pace |
| `neighbor` | The Neighbor | Casual, conversational |
| `analyst` | The Analyst | Calm, measured, Bloomberg tone |

Default: `anchor`.

### Single TTS Engine

Drop ElevenLabs. Chatterbox via Replicate handles all audio generation. The existing `generate-segment` API endpoint remains unchanged.

**Note:** Chatterbox currently produces the same voice regardless of the `voice` parameter — it accepts the ID but does not pass a speaker reference audio to the Replicate API. The voice card is real UI backed by a real preference, but voice differentiation in audio output requires supplying per-voice reference audio files to Chatterbox's `audio_path` input. That work is out of scope here; when we wire it up, the preference is already stored and flowing through the pipeline.

### Voice Selection in Throttles

Voice becomes the fourth card on the Throttles page, following the same interaction pattern as Tone, Length, and Cadence:

- Card header: "VOICE" in caps label style
- Four options displayed as selectable items
- Each shows voice name and a short description
- Selected state uses blue accent (same as other Throttle cards)
- Selection writes to `profiles.default_voice`

### Bottom Nav: Voices Tab Replaced

The current bottom nav has 5 tabs: Home, Topics, Voices, Episode, Profile. Replace the Voices tab with Throttles (the Voices tab slot becomes the Throttles tab). The Profile tab stays.

| Tab | Icon | View |
|-----|------|------|
| Home | `Home` | Dashboard |
| Topics | `Hash` | Topic management |
| Throttles | `Sliders` | Tone, Length, Cadence, Voice |
| Episode | `Radio` | Episode preview + player |
| Profile | `User` | User profile / settings |

### Dashboard Quick Controls

The existing Voice quick-control card on the Dashboard stays. It shows the current voice name. Update its navigation target from `'voices'` to `'throttles'`.

---

## What Gets Removed

### Constants (`src/lib/constants.ts`)
- `PERSONALITY_PACKS` array (5 entries)
- 9 entries from `BASE_VOICES`: `southern-gentleman`, `scottish-mentor`, `modern-brand-ambassador`, `host`, `sportscaster`, `strategist`, `storyteller`, `insider`, `professor`
- Update `ALL_VOICES` to contain only the 4 remaining voices

### API Endpoints
- `api/list-voices.ts` (ElevenLabs voice listing)
- `api/voice-sample.ts` (ElevenLabs TTS for previews, including `VOICE_MAP`)

### Components
- `src/components/views/Voices.tsx` (entire view)
- `src/components/ui/VoiceCard.tsx` (card component)

### Hooks
- `src/hooks/useVoicePreviews.ts` (ElevenLabs preview fetching)

### Types (`src/lib/types.ts`)
- Remove `'voices'` from `ViewName` union type
- Remove `VoiceTier` type and `tier` property from `VoiceDefinition` (no more free/pro distinction)

### Routing (`src/App.tsx`)
- Remove `Voices` component import and its route/render case

### UI Logic
- Voice override selection in Topics view (`voice_override` picker per topic)
- Voices tab entry in bottom navigation (replaced by Throttles)
- Pro/free tier badge rendering
- Dashboard voice quick-control: change navigation target from `'voices'` to `'throttles'`
- ElevenLabs API key references in env config (including `.env.example`)

## What Stays

- `profiles.default_voice` column (now picks from 4 instead of 13)
- `user_topics.voice_override` column (left in DB, ignored in UI — no migration needed)
- `episode_segments.voice` column (set to user's default at generation time)
- `api/generate-segment.ts` (Chatterbox endpoint, unchanged)
- `getVoice()` helper (works with the reduced set)

---

## Throttles Page: Voice Card

The voice card follows the established Throttle card pattern:

```
VOICE
────────────────────────────────
[ The Anchor      ]  ← selected (blue border/fill)
  Warm, authoritative

[ The Correspondent ]
  Crisp, energetic

[ The Neighbor     ]
  Casual, conversational

[ The Analyst      ]
  Calm, measured
────────────────────────────────
```

Selection persists to `profiles.default_voice` via the existing `useProfile` hook. No new database columns or API endpoints required.

---

## Episode Generation Impact

In `api/build-episode.ts`:

- Replace `TOPIC_DEFAULTS` voice mapping with a single lookup to `profiles.default_voice`
- All segments (including cold open and wrap-up) use the user's chosen voice
- Change hardcoded `voice: 'scottish-mentor'` for cold open (line ~622) and wrap-up (line ~634) to use the user's default voice
- Remove the voice resolution hierarchy (topic override → topic default → user default) — it collapses to just the user's default

In `api/cron/generate-episodes.ts`: No changes needed — it already reads `default_voice` from profiles and passes topics through to `build-episode`.

---

## Existing User Fallback

Users whose `profiles.default_voice` is set to a removed voice ID (e.g., `scottish-mentor`, `host`) will silently fall back to `anchor` via `getVoice()` returning `BASE_VOICES[0]`. This is acceptable — no data migration needed.

---

## Test Updates

Update any tests referencing removed voices or the Voices view:
- `src/lib/__tests__/constants.test.ts` — update voice count assertions, remove references to removed voice IDs
- `e2e/app.spec.ts` — remove Voices tab navigation tests if present

---

## Out of Scope

- Voice-differentiated audio output (requires per-voice reference audio for Chatterbox) — preference is stored, audio differentiation wired later
- Voice previews (play a sample before selecting) — can add later
- Per-segment voice mixing — intentionally removed
- New voice additions — the 4 cover the space well enough for now
- Database migrations — no schema changes needed
