# Get PodMe to a Testable State

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get PodMe running locally end-to-end so you can generate and listen to a podcast episode.

**Architecture:** Vite frontend (React 19) + Vercel serverless API functions + Supabase (auth + DB + storage) + Claude API (story curation + script) + TTS (audio generation).

**Tech Stack:** React, TypeScript, Vite, Supabase, Anthropic Claude API, Vercel Functions, Replicate Piper TTS (ElevenLabs key present but unused)

---

## Current State

| Area | Status | Notes |
|------|--------|-------|
| Frontend UI | **Ready** | 3-tab app, auth, episode display, audio player all built |
| Build | **Ready** | `npm run build` succeeds, dist/ exists |
| Supabase DB | **Ready** | 15 migrations, schema complete |
| Auth (Google OAuth) | **Ready** | Supabase Auth configured, `VITE_SUPABASE_URL` + anon key present |
| API endpoints | **Code ready** | 10+ endpoints in `api/`, but can't run without missing env vars |
| Claude integration | **Blocked** | `ANTHROPIC_API_KEY` missing from `.env.local` |
| Service DB access | **Blocked** | `SUPABASE_SERVICE_ROLE_KEY` missing from `.env.local` |
| TTS audio | **Mismatch** | Code uses Replicate Piper TTS, but `.env.local` has `ELEVENLABS_API_KEY` (unused by code) |
| Deployment | **Not needed yet** | Test locally first |

## What You Need Before Starting

You need **3 API keys** added to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API → service_role key>
ANTHROPIC_API_KEY=<from console.anthropic.com → API Keys>
REPLICATE_API_TOKEN=<from replicate.com → Account → API Tokens>  # OR fix audio.ts to use ElevenLabs
```

**Do NOT publish these.** The `.gitignore` already excludes `.env.local`.

> **Note:** The existing `ELEVENLABS_API_KEY` in `.env.local` is unused by current code. You can leave it in place or remove it.

---

## Chunk 1: Environment Setup & Local Dev Server

### Task 1: Add Missing Environment Variables

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Get your Supabase service role key**

Go to your Supabase dashboard → Project Settings → API → Copy the `service_role` key (the secret one, NOT the anon key).

- [ ] **Step 2: Get your Anthropic API key**

Go to https://console.anthropic.com → API Keys → Create or copy an existing key.

- [ ] **Step 3: Decide on TTS provider**

Your code in `api/generate/audio.ts` currently uses **Replicate Piper TTS** (not ElevenLabs). You have two options:

**Option A: Get a Replicate token** (matches current code)
- Go to https://replicate.com → Account → API Tokens → Copy token

**Option B: Rewrite audio.ts to use ElevenLabs** (matches the key you already have)
- This requires code changes (covered in Task 5 as an optional task)

- [ ] **Step 4: Add keys to `.env.local`**

```bash
# Add these lines to .env.local:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
REPLICATE_API_TOKEN=r8_your-token-here   # Only if choosing Option A
```

- [ ] **Step 5: Verify `.env.local` is gitignored**

Run: `git status`
Expected: `.env.local` should NOT appear as a tracked or modified file

---

### Task 2: Install Vercel CLI for Local API Testing

**Why:** Your API routes are Vercel serverless functions (`api/*.ts`). `npm run dev` only starts the Vite frontend. To test the full stack locally, you need `vercel dev` which runs both the frontend AND the API functions.

- [ ] **Step 1: Install Vercel CLI**

```bash
npm i -g vercel
```

- [ ] **Step 2: Link to your Vercel project (if deployed) or skip**

```bash
vercel link
# Follow prompts, or press Ctrl+C if you haven't deployed yet
```

> If you skip linking, `vercel dev` will still work for local development but may prompt you on first run. Requires Node.js 18+.

- [ ] **Step 3: Start the local dev server**

```bash
vercel dev
```

Expected: Server starts on http://localhost:3000 with both frontend and API routes working.

- [ ] **Step 4: Test the health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"ok":true,"timestamp":"..."}`

If this fails, the API function runtime isn't working. Check Vercel CLI output for errors.

- [ ] **Step 5: Commit nothing** (no code changes in this task)

---

## Chunk 2: Smoke Test the Full Generation Pipeline

### Task 3: Test Authentication

- [ ] **Step 1: Open the app in a browser**

Navigate to http://localhost:3000

Expected: Login screen with Google sign-in button

- [ ] **Step 2: Sign in with Google**

Click the sign-in button. Complete the Google OAuth flow.

Expected: Redirected back to app, TodayView loads (may show empty state)

- [ ] **Step 3: Verify auth reaches the API**

Open browser DevTools → Network tab. Look for requests to `/api/topics` or `/api/preferences`.

Expected: 200 responses (not 401 Unauthorized)

If you get 401s, the `SUPABASE_SERVICE_ROLE_KEY` is wrong or the auth header isn't being sent.

---

### Task 4: Test Episode Generation (End-to-End)

- [ ] **Step 1: Configure at least one topic**

Go to Settings tab → Enable at least one topic (e.g., "Technology")

- [ ] **Step 2: Trigger generation**

Go to Today tab → Click "Generate Now"

- [ ] **Step 3: Watch the generation progress**

**Important:** The **frontend drives the entire pipeline.** The browser polls for status and triggers each next stage. **Keep the browser tab open** throughout -- closing it will halt the pipeline.

Expected stages in order:
1. **Gathering** - Starting; RSS feeds being fetched (set at the start of `/api/generate`)
2. **Building** - Claude curating and fact-checking stories (two Claude API calls; this is the longest stage, expect 30-60s)
3. **Scripting** - Claude writing podcast script (frontend triggers `POST /api/generate/script` after detecting title in status)
4. **Voicing** - TTS generating audio segments (frontend triggers `POST /api/generate/audio` after detecting transcript in status)
5. **Ready** - Complete

Monitor DevTools Network tab for:
- `POST /api/generate` → should return `{ episode_id: "..." }`
- `GET /api/generate/status/{id}` → frontend polls every 3s
- `POST /api/generate/script` → frontend triggers this when status shows title exists
- `POST /api/generate/audio` → frontend triggers this when status shows transcript exists

> **Bug fix already applied:** The status endpoint was missing `title` and `transcript` fields, which would have caused the pipeline to get stuck at "building" forever. This has been fixed in `api/generate/status/[id].ts`.

- [ ] **Step 4: Note where it fails**

Common failure points:
- `/api/generate` returns 500 → Check Vercel CLI logs for missing env var errors
- Status stuck on "gathering" → RSS feeds not loading, check `rss-fetcher.ts` logs
- Status stuck on "building" → Claude API call failing, check `ANTHROPIC_API_KEY`
- Script generation fails → Check Claude response format
- Audio generation fails → Check `REPLICATE_API_TOKEN` or TTS provider
- Audio uploads fail silently → Verify `audio` storage bucket exists in Supabase dashboard
- Web search fails in researcher agent → Claude's `web_search` tool may need API access enabled

- [ ] **Step 5: If it reaches "ready", test playback**

Click play on the audio player. Verify:
- Audio loads and plays
- Transcript displays
- Sources list shows cited articles

---

### Task 5 (Optional): Switch Audio to ElevenLabs

**Only if you chose NOT to get a Replicate token and want to use ElevenLabs instead.**

**Files:**
- Modify: `api/generate/audio.ts`

- [ ] **Step 1: Review current audio.ts implementation**

The current code calls Replicate's Piper TTS. It needs to be rewritten to use ElevenLabs Text-to-Speech API.

- [ ] **Step 2: Write the ElevenLabs integration**

Replace the Replicate calls with ElevenLabs API:
- Use `ELEVENLABS_API_KEY` from `.env.local`
- POST to `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- Choose two distinct voice IDs for ALEX and JAMIE
- Concatenate audio chunks

- [ ] **Step 3: Test audio generation**

Trigger a new episode generation and verify audio plays.

- [ ] **Step 4: Commit**

```bash
git add api/generate/audio.ts
git commit -m "feat: switch TTS from Replicate Piper to ElevenLabs"
```

---

## Chunk 3: Fix Issues & Deploy

### Task 6: Fix Any Issues Found During Smoke Test

This task is reactive - fix whatever broke during Task 4. Common fixes:

- [ ] **Step 1: Fix any API 500 errors** (check Vercel CLI logs for stack traces)
- [ ] **Step 2: Fix any auth issues** (check token passing in headers)
- [ ] **Step 3: Fix any RSS feed issues** (some feeds may be broken or rate-limited)
- [ ] **Step 4: Commit fixes**

```bash
git status  # Review staged files -- ensure no secrets (.env, credentials) are included
git add <specific-files>
git commit -m "fix: resolve issues found during local smoke test"
```

---

### Task 7: Deploy to Vercel (When Ready)

**Only do this after local testing works end-to-end.**

- [ ] **Step 1: Add environment variables to Vercel**

In Vercel dashboard → Project → Settings → Environment Variables, add:
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `REPLICATE_API_TOKEN` (or `ELEVENLABS_API_KEY`)
- `VITE_SUPABASE_URL` (should already be there)
- `VITE_SUPABASE_ANON_KEY` (should already be there)

- [ ] **Step 2: Deploy**

```bash
vercel --prod
```

Or push to your connected Git branch and let Vercel auto-deploy.

- [ ] **Step 3: Test the production deployment**

Visit your Vercel URL, sign in, generate an episode.

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `npm run dev` | Frontend only (no API) |
| `vercel dev` | Frontend + API (full local stack) |
| `npm run build` | Type-check + production build |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `vercel --prod` | Deploy to production |
