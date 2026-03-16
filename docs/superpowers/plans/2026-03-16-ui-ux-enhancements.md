# PodMe UI/UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver 5 UI/UX improvements — updated favicon, personalized knowledge block, player animation bug fix, enhanced player visuals (color glow, dynamic background, animated progress), and episode regenerate button.

**Architecture:** All changes are frontend-only React/TypeScript modifications to the existing Vite + Tailwind + Supabase SPA. The knowledge block personalization uses existing `UserTopic[]` data to filter content by topic. The regenerate button reuses the existing `useGenerate` hook with a `reset()` call before re-triggering. New CSS animations are added to `globals.css` and consumed by the MiniPlayer component.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 3.4, Vite 8, Vitest 4, Lucide React icons

---

## Chunk 1: Favicon + Knowledge Block

### Task 1: Update Favicon to PodMe Branding

The current favicon is a purple lightning bolt SVG with "puck puck" branding. Replace it with a PodMe-branded icon using the app's accent colors (orange `#FF6B35` and blue `#2563EB`).

**Files:**
- Modify: `public/favicon.svg`
- Modify: `index.html:7` (update title from "PuckPuck" to "PodMe")

- [ ] **Step 1: Create the new PodMe favicon SVG**

Replace `public/favicon.svg` with a new podcast-themed SVG icon. Simple headphone/waveform icon using the brand colors:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <!-- Outer circle -->
  <circle cx="24" cy="24" r="22" fill="#0B0F1A" stroke="#FF6B35" stroke-width="2"/>
  <!-- Waveform bars -->
  <rect x="14" y="20" width="3" height="8" rx="1.5" fill="#FF6B35"/>
  <rect x="19" y="16" width="3" height="16" rx="1.5" fill="#2563EB"/>
  <rect x="24" y="12" width="3" height="24" rx="1.5" fill="#FF6B35"/>
  <rect x="29" y="16" width="3" height="16" rx="1.5" fill="#2563EB"/>
  <rect x="34" y="20" width="3" height="8" rx="1.5" fill="#FF6B35"/>
</svg>
```

- [ ] **Step 2: Update the HTML title**

In `index.html`, change `<title>PuckPuck</title>` to `<title>PodMe</title>`.

- [ ] **Step 3: Update the branding text in App.tsx loading screen**

In `src/App.tsx:56-57`, the loading screen shows "puck" + "puck". Update to "Pod" + "Me":

```tsx
<span className="text-white">Pod</span>
<span style={{ color: 'var(--accent-pulse)' }}>Me</span>
```

- [ ] **Step 4: Verify favicon renders in browser**

Run: `npm run dev`
Check: Browser tab shows new waveform icon and "PodMe" title.

- [ ] **Step 5: Commit**

```bash
git add public/favicon.svg index.html src/App.tsx
git commit -m "feat: update favicon and branding from PuckPuck to PodMe"
```

---

### Task 2: Personalized Knowledge Block

Move the knowledge block from bottom to top of dashboard and make it personalized to the user's active topics. Expand the `KnowledgeBlock` type to include a `quote_of_the_day` type and add a `topics` field for filtering.

**Files:**
- Modify: `src/lib/types.ts:51-56` (expand KnowledgeBlock type)
- Modify: `src/lib/constants.ts:344-369` (expand KNOWLEDGE_BLOCKS with topic-tagged entries)
- Modify: `src/components/views/Dashboard.tsx` (move block to top, add filtering logic)
- Test: `src/lib/__tests__/constants.test.ts` (add knowledge block filtering tests)

- [ ] **Step 1: Write the failing test for topic-filtered knowledge blocks**

Add to `src/lib/__tests__/constants.test.ts`:

```typescript
import { getPersonalizedKnowledgeBlock, KNOWLEDGE_BLOCKS } from '../constants'

describe('getPersonalizedKnowledgeBlock', () => {
  it('returns a block matching at least one user topic', () => {
    const block = getPersonalizedKnowledgeBlock(['tech', 'science'])
    if (block) {
      expect(block.topics?.some(t => ['tech', 'science'].includes(t))).toBe(true)
    }
  })

  it('falls back to any block when no topics match', () => {
    const block = getPersonalizedKnowledgeBlock(['nonexistent_topic'])
    expect(block).toBeDefined()
    expect(KNOWLEDGE_BLOCKS).toContainEqual(block)
  })

  it('returns a block when given empty topics', () => {
    const block = getPersonalizedKnowledgeBlock([])
    expect(block).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/constants.test.ts`
Expected: FAIL — `getPersonalizedKnowledgeBlock` is not exported.

- [ ] **Step 3: Expand the KnowledgeBlock type**

In `src/lib/types.ts`, update the KnowledgeBlock interface:

```typescript
export interface KnowledgeBlock {
  type: 'word_of_the_day' | 'fact_of_the_day' | 'quote_of_the_day'
  title: string
  content: string
  source?: string
  topics?: string[]
}
```

- [ ] **Step 4: Add topic-tagged knowledge blocks and the filter function**

In `src/lib/constants.ts`, replace the existing `KNOWLEDGE_BLOCKS` array and add the helper function:

```typescript
export const KNOWLEDGE_BLOCKS: KnowledgeBlock[] = [
  {
    type: 'word_of_the_day',
    title: 'Sonder',
    content: 'The realization that each passerby has a life as vivid and complex as your own, with their own ambitions, friends, routines, worries — an epic story that continues invisibly around you.',
    source: 'The Dictionary of Obscure Sorrows',
    topics: ['creative', 'science'],
  },
  {
    type: 'fact_of_the_day',
    title: 'The Overview Effect',
    content: 'Astronauts who see Earth from space often experience a profound cognitive shift called the "Overview Effect" — a sense of awe and interconnectedness that permanently changes how they think about borders, conflict, and the environment.',
    source: 'NASA Behavioral Health',
    topics: ['science', 'world'],
  },
  {
    type: 'word_of_the_day',
    title: 'Petrichor',
    content: 'The pleasant, earthy smell produced when rain falls on dry soil. It comes from an oil released by certain plants during dry periods, absorbed by clay-based soils, then released into the air when rain arrives.',
    source: 'Nature, 1964',
    topics: ['science', 'travel'],
  },
  {
    type: 'fact_of_the_day',
    title: 'Octopus Intelligence',
    content: 'Octopuses have three hearts, blue blood, and two-thirds of their neurons are in their arms — meaning each arm can taste, touch, and make decisions independently of the brain.',
    source: 'Scientific American',
    topics: ['science'],
  },
  {
    type: 'quote_of_the_day',
    title: '"The best way to predict the future is to invent it."',
    content: 'Alan Kay, computer scientist and Turing Award winner, coined this phrase during a 1971 meeting at Xerox PARC. It became the guiding philosophy behind the personal computer revolution.',
    source: 'Alan Kay, 1971',
    topics: ['tech', 'business'],
  },
  {
    type: 'fact_of_the_day',
    title: 'Market Opening Bell',
    content: 'The NYSE opening bell tradition dates to the 1870s when a Chinese gong was used. Today, guest bell-ringers range from CEOs to astronauts to Sesame Street characters.',
    source: 'NYSE Historical Archives',
    topics: ['earnings', 'business'],
  },
  {
    type: 'quote_of_the_day',
    title: '"Sport has the power to change the world."',
    content: 'Nelson Mandela delivered this line at the inaugural Laureus World Sports Awards in 2000, arguing that sport can create hope, break down barriers, and be more powerful than governments.',
    source: 'Nelson Mandela, 2000',
    topics: ['sports'],
  },
  {
    type: 'fact_of_the_day',
    title: 'The Kuleshov Effect',
    content: 'In the 1920s, filmmaker Lev Kuleshov demonstrated that the same shot of a man's face, when edited next to different images, made audiences perceive different emotions — proof that editing creates meaning.',
    source: 'Film Theory',
    topics: ['entertainment', 'creative'],
  },
]

export function getPersonalizedKnowledgeBlock(userTopicIds: string[]): KnowledgeBlock {
  if (userTopicIds.length > 0) {
    const matched = KNOWLEDGE_BLOCKS.filter(
      b => b.topics?.some(t => userTopicIds.includes(t))
    )
    if (matched.length > 0) {
      return matched[Math.floor(Math.random() * matched.length)]
    }
  }
  return KNOWLEDGE_BLOCKS[Math.floor(Math.random() * KNOWLEDGE_BLOCKS.length)]
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/constants.test.ts`
Expected: PASS

- [ ] **Step 6: Update Dashboard to move knowledge block to top and use personalized selection**

In `src/components/views/Dashboard.tsx`:

1. Update imports — add `getPersonalizedKnowledgeBlock`, add `MessageSquareQuote` from lucide-react, remove direct `KNOWLEDGE_BLOCKS` import.
2. Change the `knowledgeBlock` state initialization to use topic-based filtering.
3. Move the knowledge block JSX from after the email preview section to right after the MiniPlayer.
4. Add support for the `quote_of_the_day` type (purple styling with quote icon).

Update the import line:
```typescript
import { getTopic, getVoice, estimateMinutes, TOPIC_CATALOG, getPersonalizedKnowledgeBlock } from '../../lib/constants'
```

Update the icon import:
```typescript
import { Gauge, Clock, Hash, Mic, ChevronRight, BookOpen, Mail, Lightbulb, Eye, MessageSquareQuote } from 'lucide-react'
```

Update the state initialization (line 24):
```typescript
const [knowledgeBlock] = useState<KnowledgeBlock>(() => getPersonalizedKnowledgeBlock(topics.map(t => t.topic_id)))
```

**Two operations:**
1. Delete the old knowledge block at lines 205-245 (everything from `{/* Knowledge Block */}` to the closing `</div>`).
2. Insert the following new JSX directly after the MiniPlayer component (after line 36, before the "Next Episode Card"):

```tsx
{/* Knowledge Block — personalized to user topics */}
<div
  className="rounded-card p-5"
  style={{
    backgroundColor: knowledgeBlock.type === 'word_of_the_day'
      ? 'rgba(74,144,217,0.06)'
      : knowledgeBlock.type === 'quote_of_the_day'
        ? 'rgba(147,51,234,0.06)'
        : 'rgba(244,162,97,0.06)',
    border: `1px solid ${knowledgeBlock.type === 'word_of_the_day'
      ? 'rgba(74,144,217,0.15)'
      : knowledgeBlock.type === 'quote_of_the_day'
        ? 'rgba(147,51,234,0.15)'
        : 'rgba(244,162,97,0.15)'}`,
  }}
>
  <div className="flex items-center gap-2 mb-2">
    {knowledgeBlock.type === 'word_of_the_day' ? (
      <BookOpen size={16} strokeWidth={1.5} style={{ color: 'var(--accent-blue)' }} />
    ) : knowledgeBlock.type === 'quote_of_the_day' ? (
      <MessageSquareQuote size={16} strokeWidth={1.5} style={{ color: '#9333EA' }} />
    ) : (
      <Lightbulb size={16} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
    )}
    <span
      className="caps-label text-[10px]"
      style={{
        color: knowledgeBlock.type === 'word_of_the_day'
          ? 'var(--accent-blue)'
          : knowledgeBlock.type === 'quote_of_the_day'
            ? '#9333EA'
            : 'var(--accent-peach)',
      }}
    >
      {knowledgeBlock.type === 'word_of_the_day'
        ? 'WORD OF THE DAY'
        : knowledgeBlock.type === 'quote_of_the_day'
          ? 'QUOTE OF THE DAY'
          : 'FACT OF THE DAY'}
    </span>
  </div>
  <h3 className="text-base font-bold text-white tracking-tight">
    {knowledgeBlock.title}
  </h3>
  <p className="text-xs leading-relaxed mt-1.5" style={{ color: 'var(--text-secondary)' }}>
    {knowledgeBlock.content}
  </p>
  {knowledgeBlock.source && (
    <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
      Source: {knowledgeBlock.source}
    </p>
  )}
</div>
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/components/views/Dashboard.tsx src/lib/__tests__/constants.test.ts
git commit -m "feat: personalized knowledge block at top of dashboard with topic filtering"
```

---

## Chunk 2: Player Animation Bug Fix + Enhanced Player Visuals

### Task 3: Fix Wave Bar Animation Not Loading

The wave bars in the MiniPlayer use CSS class `wave-bar` defined in `globals.css`. The animation works in the generation status but the "now playing" indicator (MiniPlayer lines 189-194) uses inline `style` overrides for `width` and `height` that may conflict with the CSS class defaults. Investigate and fix.

**Files:**
- Modify: `src/components/ui/MiniPlayer.tsx:189-194` (now-playing wave bars)
- Modify: `src/components/views/EpisodePreview.tsx:353-357` (same pattern)

- [ ] **Step 1: Diagnose the wave bar issue**

The wave bars at lines 189-194 of MiniPlayer set `width: 2` and `height: 12` via inline style, but the `.wave-bar` CSS class sets `width: 4px` and `height: 32px`. The inline `height` overrides the CSS `height`, which then conflicts with the `scaleY()` animation — the animation scales from 0.3 to 1.0, but when the base height is only 12px, the visual effect is minimal (3.6px to 12px). Also, the container `h-3` (12px) clips the bars.

Fix: increase the container height and let the CSS class handle sizing, or use `transform-origin: bottom` so bars animate from the base.

- [ ] **Step 2: Fix wave bars in MiniPlayer**

In `src/components/ui/MiniPlayer.tsx`, replace lines 189-194:

```tsx
{isPlaying && (
  <div className="flex items-end gap-0.5 h-4">
    <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '0.8s' }} />
    <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '1.0s', animationDelay: '0.1s' }} />
    <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '0.9s', animationDelay: '0.2s' }} />
  </div>
)}
```

- [ ] **Step 3: Fix wave bars in EpisodePreview**

In `src/components/views/EpisodePreview.tsx`, apply the same fix at lines 353-357:

```tsx
{isPlaying && (
  <div className="flex items-end gap-0.5 h-4">
    <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '0.8s' }} />
    <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '1.0s', animationDelay: '0.1s' }} />
    <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '0.9s', animationDelay: '0.2s' }} />
  </div>
)}
```

- [ ] **Step 4: Add transform-origin to wave-bar CSS for bottom-anchored animation**

In `src/styles/globals.css`, update the `.wave-bar` class (line 90-96):

```css
.wave-bar {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  background: var(--accent-pulse);
  animation: pulseWave 1.2s ease-in-out infinite;
  transform-origin: bottom;
}
```

- [ ] **Step 5: Verify visually**

Run: `npm run dev`
Check: Wave bars animate smoothly in both the MiniPlayer "NOW PLAYING" indicator and the EpisodePreview player bar.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/MiniPlayer.tsx src/components/views/EpisodePreview.tsx src/styles/globals.css
git commit -m "fix: wave bar animation not rendering by adding transform-origin and fixing container height"
```

---

### Task 4: Enhanced Player Visuals — Color Pulsing/Glow, Dynamic Background, Animated Progress

Add three visual enhancements to the MiniPlayer: (1) a color-pulsing glow effect on the play button and card border during playback, (2) a dynamic blurred background that shifts based on the current segment's voice color, and (3) an animated circular progress ring around the play button.

**Files:**
- Modify: `src/styles/globals.css` (add new keyframe animations)
- Modify: `src/components/ui/MiniPlayer.tsx` (apply visual enhancements)

- [ ] **Step 1: Add new CSS animations to globals.css**

Append before the `@media (prefers-reduced-motion)` rule:

```css
/* Playback Glow — pulsing border/shadow during playback */
@keyframes playbackGlow {
  0%   { box-shadow: 0 0 8px rgba(255,107,53,0.3), 0 0 20px rgba(255,107,53,0.1); }
  50%  { box-shadow: 0 0 16px rgba(255,107,53,0.5), 0 0 40px rgba(255,107,53,0.2); }
  100% { box-shadow: 0 0 8px rgba(255,107,53,0.3), 0 0 20px rgba(255,107,53,0.1); }
}

.playback-glow {
  animation: playbackGlow 2s ease-in-out infinite;
}

/* Play Button Pulse — subtle scale pulse on play button */
@keyframes buttonPulse {
  0%   { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); }
  70%  { box-shadow: 0 0 0 12px rgba(255,107,53,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,107,53,0); }
}

.play-button-pulse {
  animation: buttonPulse 2s ease-out infinite;
}
```

Also update the reduced-motion media query to include the new classes:

```css
@media (prefers-reduced-motion: reduce) {
  .wave-bar,
  .bounce-dot,
  .segment-reveal,
  .spin-ring,
  .playback-glow,
  .play-button-pulse {
    animation: none;
  }
}
```

- [ ] **Step 2: Add dynamic background and glow to MiniPlayer card**

In `src/components/ui/MiniPlayer.tsx`, update the outer card div (line 165-171) to apply the glow effect and a dynamic background based on the active segment's voice color:

Replace the outer div:
```tsx
<div
  className={`rounded-card overflow-hidden relative${isPlaying ? ' playback-glow' : ''}`}
  style={{
    background: isPlaying && voice
      ? `linear-gradient(135deg, ${voice.color}15 0%, #1E2433 40%, #0F1320 100%)`
      : 'linear-gradient(135deg, #0F1320 0%, #1E2433 100%)',
    border: isPlaying
      ? '1px solid rgba(255,107,53,0.25)'
      : '1px solid var(--border-subtle)',
    transition: 'background 0.8s ease, border-color 0.5s ease',
  }}
>
```

- [ ] **Step 3: Add animated progress ring around play button**

In MiniPlayer, update the play button (lines 311-321) to include a circular progress indicator and the pulse effect:

```tsx
<button
  onClick={togglePlay}
  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all-200 hover:scale-105 active:scale-95 relative${isPlaying ? ' play-button-pulse' : ''}`}
  style={{ backgroundColor: 'var(--accent-pulse)' }}
>
  {/* Progress ring */}
  {hasGeneratedAudio && (
    <svg
      className="absolute inset-0 w-full h-full -rotate-90"
      viewBox="0 0 56 56"
    >
      <circle
        cx="28"
        cy="28"
        r="26"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
      <circle
        cx="28"
        cy="28"
        r="26"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * 26}`}
        strokeDashoffset={`${2 * Math.PI * 26 * (1 - displayProgress / 100)}`}
        style={{ transition: 'stroke-dashoffset 0.3s linear' }}
      />
    </svg>
  )}
  {isPlaying ? (
    <Pause size={24} strokeWidth={1.5} fill="white" style={{ color: 'white' }} />
  ) : (
    <Play size={24} strokeWidth={1.5} fill="white" style={{ color: 'white', marginLeft: 2 }} />
  )}
</button>
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Check:
- When playing: card border glows with pulsing orange shadow
- Background shifts to tint of active segment's voice color
- Play button has a subtle expanding pulse ring
- SVG progress ring tracks playback progress around the play button
- All animations respect `prefers-reduced-motion`

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass (these are visual-only changes, no logic changes).

- [ ] **Step 6: Commit**

```bash
git add src/styles/globals.css src/components/ui/MiniPlayer.tsx
git commit -m "feat: enhanced player visuals with glow, dynamic background, and progress ring"
```

---

## Chunk 3: Episode Regenerate Button

### Task 5: Add Regenerate Episode Button

Add a "Regenerate" button to both the MiniPlayer (when audio is already generated) and the EpisodePreview view. This button calls `reset()` from `useGenerate` to clear existing audio, then re-triggers `generateEpisode()`.

**Files:**
- Modify: `src/hooks/useGenerate.ts` (expose `reset` — already done)
- Modify: `src/App.tsx` (pass `onRegenerate` callback to Dashboard and EpisodePreview)
- Modify: `src/components/ui/MiniPlayer.tsx` (add regenerate button + prop)
- Modify: `src/components/views/EpisodePreview.tsx` (add regenerate button + prop)
- Modify: `src/components/views/Dashboard.tsx` (pass through `onRegenerate` prop)

- [ ] **Step 1: Write failing test for useGenerate reset behavior**

Add to `src/lib/__tests__/constants.test.ts` (or create `src/hooks/__tests__/useGenerate.test.ts`):

```typescript
import { renderHook, act } from '@testing-library/react'
import { useGenerate } from '../../hooks/useGenerate'

describe('useGenerate reset', () => {
  it('resets progress to idle state', () => {
    const { result } = renderHook(() => useGenerate())

    // Verify initial state
    expect(result.current.progress.status).toBe('idle')
    expect(result.current.progress.audioUrls).toEqual([])

    // Call reset (should work even from idle)
    act(() => {
      result.current.reset()
    })

    expect(result.current.progress.status).toBe('idle')
    expect(result.current.progress.audioUrls).toEqual([])
    expect(result.current.progress.currentSegment).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it passes (reset already exists)**

Run: `npx vitest run`
Expected: PASS — `reset` is already implemented in `useGenerate`.

- [ ] **Step 3: Add `onRegenerate` prop to MiniPlayer**

In `src/components/ui/MiniPlayer.tsx`, update the interface:

```typescript
interface MiniPlayerProps {
  episode: Episode
  generatedAudioUrls?: string[]
  generationStatus?: 'idle' | 'generating' | 'complete' | 'error'
  onViewEpisode: () => void
  onGenerate?: () => void
  onRegenerate?: () => void
}
```

Update the destructured props:
```typescript
export default function MiniPlayer({ episode, generatedAudioUrls, generationStatus, onViewEpisode, onGenerate, onRegenerate }: MiniPlayerProps) {
```

- [ ] **Step 4: Add regenerate button to MiniPlayer transport controls**

In MiniPlayer, after the skip forward button (after line 328), add a regenerate button that only shows when audio has been generated:

```tsx
{onRegenerate && hasGeneratedAudio && (
  <button
    onClick={onRegenerate}
    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all-200 hover:bg-white/10"
    title="Regenerate episode"
  >
    <RefreshCw size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
  </button>
)}
```

The transport controls container needs `relative` positioning. Update the parent div (line 303):
```tsx
<div className="flex items-center justify-center gap-4 py-3 relative">
```

Add `RefreshCw` to the lucide-react import at line 2:
```typescript
import { Play, Pause, SkipForward, SkipBack, ChevronRight, RefreshCw } from 'lucide-react'
```

- [ ] **Step 5: Add `onRegenerate` prop to Dashboard and pass through**

In `src/components/views/Dashboard.tsx`, update the interface:

```typescript
interface DashboardProps {
  profile: UserProfile
  topics: UserTopic[]
  episode: Episode
  generatedAudioUrls?: string[]
  generationStatus?: 'idle' | 'generating' | 'complete' | 'error'
  onNavigate: (view: ViewName) => void
  onDeliveryTimeChange: (time: string) => void
  onToggleEmailDigest: (enabled: boolean) => void
  onPreviewEmail?: () => void
  onGenerate?: () => void
  onRegenerate?: () => void
}
```

Update the function signature:
```typescript
export default function Dashboard({ profile, topics, episode, generatedAudioUrls, generationStatus, onNavigate, onDeliveryTimeChange, onToggleEmailDigest, onPreviewEmail, onGenerate, onRegenerate }: DashboardProps) {
```

Pass `onRegenerate` to MiniPlayer:
```tsx
<MiniPlayer episode={episode} generatedAudioUrls={generatedAudioUrls} generationStatus={generationStatus} onViewEpisode={() => onNavigate('episode')} onGenerate={onGenerate} onRegenerate={onRegenerate} />
```

- [ ] **Step 6: Add regenerate button to EpisodePreview**

In `src/components/views/EpisodePreview.tsx`, add `onRegenerate` to the props interface:

```typescript
interface EpisodePreviewProps {
  episode: Episode
  pastEpisodes: Episode[]
  shareToken: string | null
  copied: boolean
  listenCount: number
  onGenerateShare: () => string
  getShareUrl: (token?: string) => string
  onCopy: () => void
  onShare: (title: string) => void
  generationProgress?: GenerationProgress
  generatedAudioUrls?: string[]
  onGenerate?: () => void
  onRegenerate?: () => void
}
```

Update the destructured props to include `onRegenerate`.

Add a regenerate button after the generate button section (after line 275), visible when audio is already generated:

```tsx
{/* Regenerate Button — shown when audio already exists */}
{onRegenerate && generatedAudioUrls && generatedAudioUrls.length > 0 && (
  <button
    onClick={onRegenerate}
    className="w-full flex items-center justify-center gap-2 py-3 rounded-card transition-all-200"
    style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'var(--border-hover)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border-subtle)'
    }}
  >
    <RefreshCw size={16} strokeWidth={1.5} style={{ color: 'var(--accent-pulse)' }} />
    <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Regenerate Episode</span>
  </button>
)}
```

Add `RefreshCw` to the lucide-react import at line 2:
```typescript
import { Play, Pause, SkipBack, SkipForward, Share2, ExternalLink, Clock, Radio, ChevronRight, Volume2, VolumeX, Zap, RefreshCw } from 'lucide-react'
```

- [ ] **Step 7: Wire up `onRegenerate` in App.tsx**

In `src/App.tsx`, destructure `reset` from `useGenerate` and create the regenerate handler.

Update the `useGenerate` destructure (line 39):
```typescript
const { progress: genProgress, generateEpisode, reset: resetGeneration } = useGenerate()
```

After line 39, add:
```typescript
const handleRegenerate = useCallback(() => {
  resetGeneration()
  generateEpisode(currentEpisode.segments)
}, [resetGeneration, generateEpisode, currentEpisode.segments])
```

Pass to Dashboard (line 88-89):
```tsx
onGenerate={() => generateEpisode(currentEpisode.segments)}
onRegenerate={handleRegenerate}
```

Pass to EpisodePreview (line 140-141):
```tsx
onGenerate={() => generateEpisode(currentEpisode.segments)}
onRegenerate={handleRegenerate}
```

- [ ] **Step 8: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 9: Verify end-to-end**

Run: `npm run dev`
Check:
- Generate episode audio, then see "Regenerate" button appear in MiniPlayer (icon) and EpisodePreview (full button)
- Clicking regenerate clears existing audio and starts fresh generation
- Generation progress UI shows correctly during regeneration

- [ ] **Step 10: Run build to ensure no type errors**

Run: `npm run build`
Expected: Build completes with no errors.

- [ ] **Step 11: Commit**

```bash
git add src/hooks/useGenerate.ts src/App.tsx src/components/ui/MiniPlayer.tsx src/components/views/Dashboard.tsx src/components/views/EpisodePreview.tsx
git commit -m "feat: add regenerate episode button to player and episode preview"
```

---

## Final: Push

- [ ] **Push all changes to the feature branch**

```bash
git push -u origin claude/setup-podme-project-tW2ya
```
