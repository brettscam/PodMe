/**
 * seed-voices.ts — Upload voice reference audio clips to Supabase Storage
 *
 * Usage:
 *   1. Place 5-15 second WAV files in public/voices/ named by voice ID:
 *      anchor.wav, correspondent.wav, neighbor.wav, analyst.wav, host.wav
 *
 *   2. Run: npx tsx scripts/seed-voices.ts
 *
 * Where to find voice reference clips:
 *   - Record your own (cleanest option — 10 seconds of clear speech)
 *   - LibriVox (public domain audiobooks): https://librivox.org
 *   - Freesound.org (filter by CC0 license, search "voice" or "speech")
 *   - Piper TTS samples: https://rhasspy.github.io/piper-samples/
 *
 * Tips for best results:
 *   - 5-15 seconds of clean speech, minimal background noise
 *   - WAV format, any sample rate (Chatterbox handles resampling)
 *   - Each clip should be a DIFFERENT speaker to get distinct voices
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const VOICE_IDS = ['anchor', 'correspondent', 'neighbor', 'analyst', 'host']
const VOICE_DIR = resolve(__dirname, '../public/voices')
const BUCKET = 'voice-references'

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  let uploaded = 0
  let skipped = 0

  for (const id of VOICE_IDS) {
    const filePath = resolve(VOICE_DIR, `${id}.wav`)
    if (!existsSync(filePath)) {
      console.log(`  skip  ${id}.wav — file not found in public/voices/`)
      skipped++
      continue
    }

    const buffer = readFileSync(filePath)
    const { error } = await supabase.storage.from(BUCKET).upload(`${id}.wav`, buffer, {
      contentType: 'audio/wav',
      upsert: true,
    })

    if (error) {
      console.error(`  fail  ${id}.wav — ${error.message}`)
    } else {
      console.log(`  done  ${id}.wav (${(buffer.length / 1024).toFixed(0)} KB)`)
      uploaded++
    }
  }

  console.log(`\n${uploaded} uploaded, ${skipped} skipped`)
  if (skipped > 0) {
    console.log(`\nTo add missing voices, place WAV files in:\n  ${VOICE_DIR}/`)
  }
}

main().catch(console.error)
