# Voice Simplification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the voice system from 13 voices to 4, drop ElevenLabs, remove per-topic voice overrides, fold voice selection into Throttles, and remove the Voices tab.

**Architecture:** Strip constants/types to 4 voices, remove ElevenLabs API endpoints and the Voices view, add a Voice card to the existing Throttles page, update BottomNav to replace Voices with Throttles, and simplify build-episode voice resolution to use only the user's default voice.

**Tech Stack:** React + TypeScript, Vite, Vitest, Supabase, Vercel serverless functions

**Spec:** `docs/superpowers/specs/2026-03-21-voice-simplification-design.md`

---

## File Structure

### Files to Delete
- `src/components/views/Voices.tsx` — entire Voices view
- `src/components/ui/VoiceCard.tsx` — voice preview card
- `src/hooks/useVoicePreviews.ts` — ElevenLabs preview hook
- `api/list-voices.ts` — ElevenLabs voice listing endpoint
- `api/voice-sample.ts` — ElevenLabs voice sample endpoint

### Files to Modify
- `src/lib/types.ts` — remove `VoiceTier`, remove `tier` from `VoiceDefinition`, remove `'voices'` from `ViewName`
- `src/lib/constants.ts` — reduce to 4 voices, remove `PERSONALITY_PACKS`
- `src/components/views/Throttles.tsx` — add Voice card with 4 options
- `src/components/layout/BottomNav.tsx` — replace Voices tab with Throttles
- `src/components/views/Dashboard.tsx` — change voice quick-control nav target from `'voices'` to `'throttles'`
- `src/components/views/Topics.tsx` — remove voice override picker, remove voice badge from collapsed header
- `src/App.tsx` — remove Voices import/route, pass `defaultVoice` + `onSetDefaultVoice` to Throttles
- `api/build-episode.ts` — replace `DEFAULT_VOICE`, `TOPIC_DEFAULTS` voice field, and hardcoded `scottish-mentor` with user's default voice
- `src/hooks/useEpisodeBuilder.ts` — send `default_voice` in request body to build-episode API
- `api/cron/generate-episodes.ts` — send `default_voice` in request body to build-episode API
- `.env.example` — remove `ELEVENLABS_API_KEY`
- `src/lib/__tests__/constants.test.ts` — update voice assertions
- `e2e/app.spec.ts` — no voice-specific tests exist (skip)

---

## Chunk 1: Types and Constants

### Task 1: Update types

**Files:**
- Modify: `src/lib/types.ts:7,11,29-36`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/__tests__/constants.test.ts`:

```typescript
it('has exactly 4 voices', () => {
  expect(ALL_VOICES.length).toBe(4)
})

it('voice definitions do not have a tier property', () => {
  for (const voice of ALL_VOICES) {
    expect(voice).not.toHaveProperty('tier')
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/constants.test.ts`
Expected: FAIL — currently 13 voices and they have `tier`

- [ ] **Step 3: Update types.ts**

In `src/lib/types.ts`:

Remove the `VoiceTier` type (line 7):
```typescript
// DELETE: export type VoiceTier = 'free' | 'pro'
```

Remove `'voices'` from `ViewName` (line 11):
```typescript
export type ViewName = 'home' | 'topics' | 'throttles' | 'episode' | 'profile'
```

Remove `tier` from `VoiceDefinition` (keep `icon` — it's passed to `ThrottleOption`):
```typescript
export interface VoiceDefinition {
  id: string
  name: string
  desc: string
  color: string
  icon: LucideIcon
}
```

- [ ] **Step 4: Update constants.ts**

In `src/lib/constants.ts`, replace `BASE_VOICES`, remove `PERSONALITY_PACKS`, update `ALL_VOICES`:

```typescript
export const BASE_VOICES: VoiceDefinition[] = [
  { id: 'anchor', name: 'The Anchor', desc: 'Warm, authoritative, NPR-adjacent', color: '#4A90D9', icon: Radio },
  { id: 'correspondent', name: 'The Correspondent', desc: 'Crisp, energetic, faster pace', color: '#F4A261', icon: Zap },
  { id: 'neighbor', name: 'The Neighbor', desc: 'Casual, community, conversational', color: '#D4634A', icon: Users },
  { id: 'analyst', name: 'The Analyst', desc: 'Calm, measured, Bloomberg tone', color: '#2D8A6E', icon: TrendingUp },
]

export const ALL_VOICES: VoiceDefinition[] = [...BASE_VOICES]
```

Delete the entire `PERSONALITY_PACKS` array.

- [ ] **Step 5: Update existing voice tests**

Replace the test file's voice-related tests in `src/lib/__tests__/constants.test.ts`:

```typescript
describe('getVoice', () => {
  it('returns the correct voice by id', () => {
    const voice = getVoice('anchor')
    expect(voice.name).toBe('The Anchor')
    expect(voice.color).toBe('#4A90D9')
  })

  it('falls back to first base voice for unknown id', () => {
    const voice = getVoice('nonexistent-voice')
    expect(voice.id).toBe('anchor')
  })

  it('falls back for removed voice ids', () => {
    const voice = getVoice('scottish-mentor')
    expect(voice.id).toBe('anchor')
  })
})

describe('ALL_VOICES', () => {
  it('has exactly 4 voices', () => {
    expect(ALL_VOICES.length).toBe(4)
  })

  it('each voice has required fields', () => {
    for (const voice of ALL_VOICES) {
      expect(voice.id).toBeTruthy()
      expect(voice.name).toBeTruthy()
      expect(voice.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('voice definitions do not have a tier property', () => {
    for (const voice of ALL_VOICES) {
      expect(voice).not.toHaveProperty('tier')
    }
  })

  it('has unique voice ids', () => {
    const ids = ALL_VOICES.map(v => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/constants.test.ts`
Expected: PASS

- [ ] **Step 7: Remove unused imports from constants.ts**

Remove unused icon imports that were only used by deleted voices: `Mic`, `Target`, `BookOpen`, `Eye`, `GraduationCap`. Keep `Radio`, `Zap`, `Users`, `TrendingUp` which are used by the 4 remaining voices (and check if others are used by `TOPIC_CATALOG` before removing).

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/lib/__tests__/constants.test.ts
git commit -m "feat: reduce voices to 4, remove VoiceTier and PERSONALITY_PACKS"
```

---

## Chunk 2: Delete ElevenLabs Endpoints and Voices View

### Task 2: Delete files

**Files:**
- Delete: `api/list-voices.ts`
- Delete: `api/voice-sample.ts`
- Delete: `src/components/views/Voices.tsx`
- Delete: `src/components/ui/VoiceCard.tsx`
- Delete: `src/hooks/useVoicePreviews.ts`
- Modify: `.env.example:9-10`

- [ ] **Step 1: Delete the 5 files**

```bash
rm api/list-voices.ts api/voice-sample.ts src/components/views/Voices.tsx src/components/ui/VoiceCard.tsx src/hooks/useVoicePreviews.ts
```

- [ ] **Step 2: Remove ElevenLabs key from .env.example**

In `.env.example`, remove lines 9-10:
```
# ElevenLabs (required for TTS)
ELEVENLABS_API_KEY=sk_your-key
```

- [ ] **Step 3: Verify no remaining imports of deleted files**

Run: `grep -r "useVoicePreviews\|VoiceCard\|list-voices\|voice-sample\|Voices.tsx\|ELEVENLABS" src/ api/ --include='*.ts' --include='*.tsx' -l`

Fix any remaining imports (App.tsx will be handled in Task 4).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove ElevenLabs endpoints, Voices view, VoiceCard, and voice previews"
```

---

## Chunk 3: Throttles Voice Card

### Task 3: Add voice selection to Throttles

**Files:**
- Modify: `src/components/views/Throttles.tsx:1-126`

- [ ] **Step 1: Update ThrottlesProps interface**

Add `defaultVoice` and `onSetDefaultVoice` props:

```typescript
import { Gauge, Clock, Calendar, Mic, Newspaper, Radio, Flame, Zap, Target, Waves, Sun, Users, TrendingUp } from 'lucide-react'
import type { Tone, Length, Cadence } from '../../lib/types'
import { ALL_VOICES, getVoice } from '../../lib/constants'
import ThrottleOption from '../ui/ThrottleOption'

interface ThrottlesProps {
  tone: Tone
  length: Length
  cadence: Cadence
  defaultVoice: string
  onSetTone: (tone: Tone) => void
  onSetLength: (length: Length) => void
  onSetCadence: (cadence: Cadence) => void
  onSetDefaultVoice: (voice: string) => void
}
```

- [ ] **Step 2: Add voice card after the Cadence card**

Add this JSX block after the Cadence `</div>` closing tag (after line 122) and before the closing `</div>` of the outer container:

```tsx
      {/* Voice */}
      <div
        className="rounded-card p-5"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Mic size={18} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
          <h3 className="text-[17px] font-bold">Voice</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Choose your podcast voice</p>
        <div className="space-y-1">
          {ALL_VOICES.map(voice => (
            <ThrottleOption
              key={voice.id}
              icon={voice.icon}
              label={voice.name}
              description={voice.desc}
              selected={defaultVoice === voice.id}
              onClick={() => onSetDefaultVoice(voice.id)}
            />
          ))}
        </div>
      </div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/views/Throttles.tsx
git commit -m "feat: add voice selection card to Throttles page"
```

---

## Chunk 4: Navigation and Routing

### Task 4: Update BottomNav, App.tsx, Dashboard

**Files:**
- Modify: `src/components/layout/BottomNav.tsx:1-10`
- Modify: `src/App.tsx:16,36,109-118,120-130,131-138`
- Modify: `src/components/views/Dashboard.tsx:34`

- [ ] **Step 1: Update BottomNav**

In `src/components/layout/BottomNav.tsx`:

Replace the import line and NAV_ITEMS:

```typescript
import { Home, Hash, SlidersHorizontal, Radio, User } from 'lucide-react'
import type { ViewName } from '../../lib/types'

const NAV_ITEMS: { view: ViewName; icon: typeof Home; label: string }[] = [
  { view: 'home', icon: Home, label: 'Home' },
  { view: 'topics', icon: Hash, label: 'Topics' },
  { view: 'throttles', icon: SlidersHorizontal, label: 'Throttles' },
  { view: 'episode', icon: Radio, label: 'Episode' },
  { view: 'profile', icon: User, label: 'Profile' },
]
```

- [ ] **Step 2: Update App.tsx**

Remove the `Voices` import (line 16):
```typescript
// DELETE: import Voices from './components/views/Voices'
```

Update the `'throttles'` case in `renderView()` to pass voice props:
```typescript
      case 'throttles':
        return (
          <Throttles
            tone={profile.tone}
            length={profile.length}
            cadence={profile.cadence}
            defaultVoice={profile.default_voice}
            onSetTone={setTone}
            onSetLength={setLength}
            onSetCadence={setCadence}
            onSetDefaultVoice={setDefaultVoice}
          />
        )
```

Remove the entire `case 'voices':` block (lines 131-138).

Remove `setVoiceOverride` from the `useTopics()` destructuring on line 36 (it becomes dead code since Topics no longer uses it).

Remove `onSetVoiceOverride` and `defaultVoice` props from the Topics render (lines 109-118), since Topics will no longer have voice override UI:
```typescript
      case 'topics':
        return (
          <Topics
            topics={topics}
            discoveryEnabled={profile.discovery_enabled}
            onAddTopic={addTopic}
            onRemoveTopic={removeTopic}
            onSetWeight={setWeight}
            onTogglePin={togglePin}
            onToggleDiscovery={setDiscoveryEnabled}
            onAddCustomTag={addCustomTag}
            onRemoveCustomTag={removeCustomTag}
          />
        )
```

- [ ] **Step 3: Update Dashboard voice quick-control**

In `src/components/views/Dashboard.tsx`, line 34, change `view: 'voices'` to `view: 'throttles'`:

```typescript
    { icon: Mic, label: 'VOICE', value: getVoice(profile.default_voice).name.replace('The ', ''), view: 'throttles' as ViewName },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/App.tsx src/components/views/Dashboard.tsx
git commit -m "feat: replace Voices tab with Throttles, update routing and navigation"
```

---

## Chunk 5: Topics Voice Override Removal

### Task 5: Remove voice override UI from Topics

**Files:**
- Modify: `src/components/views/Topics.tsx:1-337`

- [ ] **Step 1: Remove voice-related imports and props**

In `src/components/views/Topics.tsx`:

Remove `Mic` from the lucide-react import (line 2).
Remove `ALL_VOICES, getVoice` from the constants import (line 4) — keep `getTopic`.
Remove from `TopicsProps` interface:
- `defaultVoice: string` (line 13)
- `onSetVoiceOverride: (topicId: string, voiceId: string | null) => void` (line 17)

Update the destructured props to remove `defaultVoice` and `onSetVoiceOverride`.

- [ ] **Step 2: Remove voice badge from collapsed topic header**

Remove the voice badge block from the collapsed header (lines 109-114):
```tsx
// DELETE this block:
                  <span className="flex items-center gap-1">
                    <Mic size={10} strokeWidth={1.5} style={{ color: activeVoice.color }} />
                    <span className="text-[10px] font-medium" style={{ color: activeVoice.color }}>
                      {activeVoice.name.replace('The ', '')}
                    </span>
                  </span>
```

Also remove `const activeVoice = getVoice(ut.voice_override || defaultVoice)` (line 87).

- [ ] **Step 3: Remove voice selection section from expanded content**

Remove the entire "SEGMENT VOICE" section (lines 177-212):
```tsx
// DELETE the entire voice selection <div> block
                {/* Voice selection */}
                <div>
                  ...entire block...
                </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/views/Topics.tsx
git commit -m "feat: remove per-topic voice override UI from Topics view"
```

---

## Chunk 6: Build-Episode Voice Simplification

### Task 6: Plumb default_voice through the API pipeline

**Files:**
- Modify: `src/hooks/useEpisodeBuilder.ts:22,92`
- Modify: `api/cron/generate-episodes.ts:83-87`
- Modify: `api/build-episode.ts:30-31,34-45,348-352,489,622,634`

- [ ] **Step 1: Send default_voice from useEpisodeBuilder**

In `src/hooks/useEpisodeBuilder.ts`:

Line 22 — rename the unused parameter from `_defaultVoice` to `defaultVoice`:
```typescript
export function useEpisodeBuilder(
  topics: UserTopic[] | undefined,
  tone: Tone,
  length: Length,
  defaultVoice: string,
  userId?: string,
): UseEpisodeBuilderResult {
```

Line 92 — add `default_voice` to the request body:
```typescript
const body: Record<string, unknown> = { tone, length, topics: topicsPayload, default_voice: defaultVoice }
```

- [ ] **Step 2: Send default_voice from cron job**

In `api/cron/generate-episodes.ts`, line 83-87 — add `default_voice` to the request body (the cron already reads `default_voice` from the profile at line 32):
```typescript
body: JSON.stringify({
  tone: user.tone || 'mixed',
  length: user.length || 'standard',
  default_voice: user.default_voice || 'anchor',
  topics,
}),
```

- [ ] **Step 3: Update DEFAULT_VOICE and extract default_voice in handler**

In `api/build-episode.ts`:

Change line 31:
```typescript
const DEFAULT_VOICE = 'anchor'
```

At line ~352 (in the handler, after `topicsParam`), add:
```typescript
const defaultVoice = (params.default_voice as string) || DEFAULT_VOICE
```

- [ ] **Step 4: Simplify TOPIC_DEFAULTS**

Remove the `voice` field from `TOPIC_DEFAULTS` — simplify to just titles:
```typescript
const TOPIC_DEFAULTS: Record<string, { title: string }> = {
  earnings: { title: 'Markets & Earnings' },
  tech: { title: 'Technology' },
  world: { title: 'World News' },
  local: { title: 'Bay Area & Marin' },
  business: { title: 'Business & Economy' },
  science: { title: 'Science & Health' },
  creative: { title: 'Creative & Culture' },
  sports: { title: 'Sports' },
  travel: { title: 'Travel' },
  entertainment: { title: 'Entertainment' },
}
```

- [ ] **Step 5: Update voice resolution in the topic loop**

Line ~489, change:
```typescript
const voice = ut.voice_override || defaults.voice
```
to:
```typescript
const voice = defaultVoice
```

- [ ] **Step 6: Update cold open and wrap-up voice**

Lines 622 and 634 — change both from:
```typescript
voice: 'scottish-mentor',
```
to:
```typescript
voice: defaultVoice,
```

- [ ] **Step 7: Commit**

```bash
git add api/build-episode.ts src/hooks/useEpisodeBuilder.ts api/cron/generate-episodes.ts
git commit -m "feat: plumb default_voice through API, simplify voice resolution"
```

---

## Chunk 7: Final Cleanup and Verification

### Task 7: Cleanup and full test run

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run all unit tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 3: Run linting**

Run: `npx eslint src/ --ext .ts,.tsx --quiet` (or whatever lint command the project uses)
Expected: No new errors

- [ ] **Step 4: Verify dev server starts**

Run: `npx vite build` (or `npm run build`)
Expected: Builds successfully

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup after voice simplification"
```

- [ ] **Step 6: Push**

```bash
git push -u origin claude/setup-podme-project-tW2ya
```
