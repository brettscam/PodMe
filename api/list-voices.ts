import type { VercelRequest, VercelResponse } from '@vercel/node'

// Chatterbox uses a single default voice — our voice "names" are just labels
// for the user to choose a persona. The TTS output sounds the same regardless.
const VOICES = [
  { id: 'anchor', name: 'The Anchor', labels: { style: 'narrator', gender: 'male' } },
  { id: 'scottish-mentor', name: 'The Scottish Mentor', labels: { style: 'guide', gender: 'male' } },
  { id: 'southern-gentleman', name: 'The Southern Gentleman', labels: { style: 'warm', gender: 'male' } },
  { id: 'modern-brand-ambassador', name: 'The Brand Voice', labels: { style: 'casual', gender: 'male' } },
  { id: 'strategist', name: 'The Strategist', labels: { style: 'analytical', gender: 'male' } },
  { id: 'neighbor', name: 'The Neighbor', labels: { style: 'friendly', gender: 'male' } },
  { id: 'correspondent', name: 'The Correspondent', labels: { style: 'crisp', gender: 'female' } },
  { id: 'analyst', name: 'The Analyst', labels: { style: 'calm', gender: 'female' } },
  { id: 'host', name: 'The Host', labels: { style: 'strong', gender: 'female' } },
  { id: 'sportscaster', name: 'The Sportscaster', labels: { style: 'energetic', gender: 'male' } },
  { id: 'storyteller', name: 'The Storyteller', labels: { style: 'warm', gender: 'male' } },
  { id: 'insider', name: 'The Insider', labels: { style: 'expressive', gender: 'female' } },
  { id: 'professor', name: 'The Professor', labels: { style: 'thoughtful', gender: 'female' } },
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(200).json({ voices: VOICES })
}
