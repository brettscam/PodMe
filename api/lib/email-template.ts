/**
 * Server-safe email template for digest emails.
 * This is a server-side copy of src/lib/emailTemplate.ts that does NOT import
 * from src/ (which pulls in Lucide icon components that require a browser).
 * Voice/topic color data is inlined here instead.
 */

// Inline voice data (no Lucide imports)
const VOICES: Record<string, { name: string; color: string }> = {
  'southern-gentleman': { name: 'The Southern Gentleman', color: '#FF6B35' },
  'scottish-mentor': { name: 'The Scottish Mentor', color: '#2563EB' },
  'modern-brand-ambassador': { name: 'The Brand Voice', color: '#10B981' },
  'anchor': { name: 'The Anchor', color: '#4A90D9' },
  'correspondent': { name: 'The Correspondent', color: '#F4A261' },
  'analyst': { name: 'The Analyst', color: '#2D8A6E' },
  'neighbor': { name: 'The Neighbor', color: '#D4634A' },
  'host': { name: 'The Host', color: '#9B59B6' },
  'sportscaster': { name: 'The Sportscaster', color: '#E74C3C' },
  'strategist': { name: 'The Strategist', color: '#1B3A5C' },
  'storyteller': { name: 'The Storyteller', color: '#8E6B47' },
  'insider': { name: 'The Insider', color: '#E67E22' },
  'professor': { name: 'The Professor', color: '#2C3E50' },
}

const TOPIC_COLORS: Record<string, string> = {
  'earnings': '#4A90D9',
  'tech': '#7B68EE',
  'world': '#2D8A6E',
  'local': '#D4634A',
  'business': '#8E6B47',
  'science': '#2D8A6E',
  'creative': '#9B59B6',
  'sports': '#E74C3C',
  'travel': '#F4A261',
  'entertainment': '#E67E22',
}

function getVoice(id: string): { name: string; color: string } {
  return VOICES[id] || { name: id, color: '#94A3B8' }
}

function getTopicColor(id: string): string {
  return TOPIC_COLORS[id] || '#94A3B8'
}

interface SegmentSource {
  outlet: string
  domain: string
  tier: number
  title: string
  url: string
  published_at: string
  cited_claims: string[]
}

interface EpisodeSegment {
  id?: string
  episode_id?: string
  topic_id: string | null
  segment_type: 'cold_open' | 'topic' | 'wild_card' | 'wrap_up'
  title: string
  voice: string
  start_time_seconds: number
  duration_seconds: number
  script?: string
  sources?: SegmentSource[]
  sort_order: number
}

interface SourceSummary {
  total_articles: number
  total_outlets: number
  tier_1_count: number
  tier_2_count: number
  tier_3_count: number
}

interface Episode {
  id?: string
  user_id?: string
  title: string
  date: string
  cadence: string
  tone: string
  estimated_minutes: number
  audio_url?: string | null
  transcript?: string | null
  show_notes?: {
    segments: { title: string; sources: SegmentSource[] }[]
    correction_notes: string[]
    source_summary: SourceSummary
  } | null
  share_token?: string | null
  share_enabled?: boolean
  status: string
  segments: EpisodeSegment[]
}

function sourceTierColor(tier: number): string {
  if (tier === 1) return '#2563EB'
  if (tier === 2) return '#10B981'
  return '#94A3B8'
}

function segmentHtml(segment: EpisodeSegment, index: number): string {
  const voice = getVoice(segment.voice)
  const topicColor = segment.topic_id ? getTopicColor(segment.topic_id) : '#94A3B8'

  const sourcesHtml = (segment.sources || []).map((s: SegmentSource) => `
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${sourceTierColor(s.tier)}; margin-right: 8px; vertical-align: middle;"></span>
      </td>
      <td style="padding: 4px 0;">
        <a href="${s.url}" style="color: #FAF8F5; text-decoration: none; font-size: 13px; font-weight: 600;">${s.outlet}</a>
        <span style="color: #64748B; font-size: 12px; margin-left: 6px;">${s.title}</span>
      </td>
    </tr>
  `).join('')

  const scriptPreview = segment.script
    ? segment.script.substring(0, 280) + (segment.script.length > 280 ? '...' : '')
    : ''

  return `
    <!-- Segment ${index + 1} -->
    <tr>
      <td style="padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px 24px; background: #1E2433; border-radius: 12px; border: 1px solid rgba(148,163,184,0.12);">
              <!-- Segment Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${topicColor}; margin-right: 8px; vertical-align: middle;"></span>
                    <span style="font-size: 16px; font-weight: 700; color: #FAF8F5; letter-spacing: -0.3px;">${segment.title}</span>
                  </td>
                  <td style="text-align: right;">
                    <span style="font-size: 11px; font-weight: 600; color: ${voice.color}; letter-spacing: 1px; text-transform: uppercase;">${voice.name.replace('The ', '')}</span>
                  </td>
                </tr>
              </table>

              <!-- Script Preview -->
              ${scriptPreview ? `
              <p style="font-size: 14px; line-height: 1.7; color: #94A3B8; margin: 12px 0 0 0;">
                ${scriptPreview}
              </p>
              ` : ''}

              <!-- Sources -->
              ${sourcesHtml ? `
              <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px; border-top: 1px solid rgba(148,163,184,0.1); padding-top: 12px; width: 100%;">
                <tr>
                  <td colspan="2" style="padding-bottom: 6px;">
                    <span style="font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #64748B;">SOURCES</span>
                  </td>
                </tr>
                ${sourcesHtml}
              </table>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

export function generateEmailHtml(episode: Episode, userName: string = 'there'): string {
  const dateStr = new Date(episode.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const topicSegments = (episode.segments || []).filter(s => s.segment_type === 'topic')
  const sourceSummary = episode.show_notes?.source_summary
  const segmentsHtml = (episode.segments || []).map((seg, i) => segmentHtml(seg, i)).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PodMe — ${episode.title}</title>
  <!--[if mso]>
  <style>body { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F1A; font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0B0F1A;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 28px; font-weight: 700; letter-spacing: -1px;">
                <span style="color: #FAF8F5;">Pod</span><span style="color: #FF6B35;">Me</span>
              </span>
            </td>
          </tr>

          <!-- Episode Card -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #1A4BC2 0%, rgba(37,99,235,0.3) 100%); border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 24px;">
                    <span style="font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,255,255,0.6);">YOUR DAILY PULSE</span>
                    <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #FAF8F5; letter-spacing: -0.5px; line-height: 1.3;">
                      ${dateStr}
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.5);">
                      ${episode.estimated_minutes} min &middot; ${episode.tone.charAt(0).toUpperCase() + episode.tone.slice(1)} &middot; ${topicSegments.length} topics
                      ${sourceSummary ? ` &middot; ${sourceSummary.total_articles} sources` : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 28px 0 8px 0;">
              <p style="font-size: 15px; line-height: 1.7; color: #94A3B8; margin: 0;">
                Good morning, ${userName}. Here's your episode summary.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 16px 0;">
              <div style="height: 1px; background: rgba(148,163,184,0.12);"></div>
            </td>
          </tr>

          <!-- Segments -->
          ${segmentsHtml}

          <!-- Source Summary -->
          ${sourceSummary ? `
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #0F1320; border-radius: 12px; border: 1px solid rgba(148,163,184,0.12); margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <span style="font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #64748B;">SOURCE SUMMARY</span>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 12px;">
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 24px; font-weight: 700; color: #FAF8F5;">${sourceSummary.total_articles}</span>
                          <span style="font-size: 13px; color: #64748B; margin-left: 8px;">articles across ${sourceSummary.total_outlets} outlets</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 0 0;">
                          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2563EB; margin-right: 6px; vertical-align: middle;"></span>
                          <span style="font-size: 12px; color: #94A3B8; margin-right: 16px;">${sourceSummary.tier_1_count} Tier 1</span>
                          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981; margin-right: 6px; vertical-align: middle;"></span>
                          <span style="font-size: 12px; color: #94A3B8; margin-right: 16px;">${sourceSummary.tier_2_count} Tier 2</span>
                          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #94A3B8; margin-right: 6px; vertical-align: middle;"></span>
                          <span style="font-size: 12px; color: #94A3B8;">${sourceSummary.tier_3_count} Tier 3</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 8px 0 32px 0;">
              <a href="https://podme.ai" style="display: inline-block; background: #FF6B35; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px;">
                Listen to Full Episode
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <div style="height: 1px; background: rgba(148,163,184,0.12);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 0 0 40px 0;">
              <span style="font-size: 20px; font-weight: 700; letter-spacing: -1px;">
                <span style="color: #FAF8F5;">Pod</span><span style="color: #FF6B35;">Me</span>
              </span>
              <p style="font-size: 12px; color: #64748B; margin: 8px 0 0 0;">
                Your daily pulse. AI-generated just for you.
              </p>
              <p style="font-size: 11px; color: #64748B; margin: 16px 0 0 0;">
                You're receiving this because you enabled Email Digest in your PodMe settings.
                <br>
                <a href="https://podme.ai" style="color: #94A3B8; text-decoration: underline;">Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim()
}
