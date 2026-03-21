# Audio Caching Design

## Problem

Every time a user plays an episode, PodMe calls Replicate's Chatterbox TTS for each segment. Audio lives only as blob URLs in browser memory and is discarded when the session ends. Replaying an episode means regenerating all audio — costing money and adding latency.

## Goals

- Eliminate redundant Replicate API calls for identical scripts
- Enable instant replay of previously generated audio
- Zero frontend changes — caching is invisible to the client

## Approach: Server-side cache in `generate-segment.ts`

### Cache key

SHA-256 hash of `script` only. Chatterbox currently produces identical audio regardless of the `voice` parameter (voice ID is accepted but no speaker reference audio is passed to Replicate). Hashing only the script avoids duplicate cache entries for different voice values that produce the same audio. When voice differentiation is wired up, the cache key will be updated to include the voice.

### Storage

Supabase Storage **private** bucket called `audio-cache`. Files stored as `{cacheKey}.wav`. Chatterbox outputs WAV; we standardize on `.wav` to avoid extension ambiguity in cache lookups. Content-Type metadata (`audio/wav`) is set on upload.

### Flow

```
Request: POST /api/generate-segment { script, voice, segmentId }

1. Compute cacheKey = sha256(script)
2. Try downloading audio-cache/{cacheKey}.wav from Supabase Storage
3. HIT:  Convert to base64, return { segmentId, audio, contentType: "audio/wav", cached: true }
4. MISS: Call Replicate Chatterbox as before
        → Upsert audio buffer to audio-cache/{cacheKey}.wav (contentType: "audio/wav")
        → Return { segmentId, audio, contentType, cached: false }
```

The response shape is identical to today. The frontend sees no difference.

### Concurrency

Concurrent requests for the same cache key (e.g., two users generating the same segment simultaneously) will both miss and both call Replicate. Last write wins on upload via `upsert`. Duplicate generation is harmless and self-resolving — subsequent requests will hit the cache.

### Error handling

- **Storage lookup failure:** Treat as cache miss. Generate via Replicate. Log warning.
- **Upload failure after generation:** Return audio anyway. Log warning. Next request will retry.
- **Replicate failure:** Same error handling as today — no change.

Caching is best-effort. Storage problems never block audio generation.

### Observability

Log cache hit/miss for each request: `console.log('audio-cache', { cacheKey, hit: true/false })`. This allows validating cache effectiveness post-launch.

### Cache invalidation

Daily by nature: scripts change daily because topic content changes daily. The content hash in the cache key ensures stale scripts produce different keys.

Optional future enhancement: a Supabase cron job to purge files older than 48 hours to reclaim storage. Not required for v1. Rough estimate: ~1.3 MB per segment at 44.1kHz/16-bit WAV, so 10 segments/day ≈ 13 MB/day, well within Supabase free tier (1 GB).

## Files changed

### 1. `api/generate-segment.ts`

Add cache check before Replicate call. Add upsert after successful generation. Use `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` for storage access.

### 2. `supabase/migrations/012_audio_cache_bucket.sql`

Create private `audio-cache` storage bucket. Add policy allowing service role to read/write.

## Out of scope

- Frontend changes
- Per-episode stitched audio files
- Direct-from-storage URL passthrough (possible future optimization)
- Automatic cleanup cron (can add later)
