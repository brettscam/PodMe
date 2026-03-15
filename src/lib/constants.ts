import {
  BarChart3, Cpu, Globe, MapPin, Briefcase, FlaskConical, Camera, Trophy,
  Plane, Clapperboard, Radio, Zap, TrendingUp, Users, Mic, Target, BookOpen,
  Eye, GraduationCap,
} from 'lucide-react'
import type { TopicDefinition, VoiceDefinition, Episode, SegmentSource, KnowledgeBlock } from './types'

export const TOPIC_CATALOG: TopicDefinition[] = [
  { id: 'earnings', label: 'Markets & Earnings', icon: BarChart3, color: '#4A90D9', subs: ['Earnings next week', 'S&P movers', 'IPO pipeline', 'Crypto', 'Sector rotation'] },
  { id: 'tech', label: 'Technology', icon: Cpu, color: '#7B68EE', subs: ['AI/ML', 'Consumer tech', 'Enterprise SaaS', 'Startups', 'Open source'] },
  { id: 'world', label: 'World News', icon: Globe, color: '#2D8A6E', subs: ['Geopolitics', 'Climate', 'Conflict', 'Diplomacy', 'Global health'] },
  { id: 'local', label: 'Local News', icon: MapPin, color: '#D4634A', subs: ['Bay Area', 'Marin County', 'School boards', 'Transit', 'Housing'] },
  { id: 'business', label: 'Business & Economy', icon: Briefcase, color: '#8E6B47', subs: ['Fed/Rates', 'Labor market', 'M&A', 'Venture capital', 'Real estate'] },
  { id: 'science', label: 'Science & Health', icon: FlaskConical, color: '#2D8A6E', subs: ['Research', 'Space', 'Medicine', 'Nutrition', 'Mental health'] },
  { id: 'creative', label: 'Creative & Culture', icon: Camera, color: '#9B59B6', subs: ['Photography', 'Design', 'Film', 'Music', 'Books'] },
  { id: 'sports', label: 'Sports', icon: Trophy, color: '#E74C3C', subs: ['NFL', 'NBA', 'MLB', 'F1', 'Golf', 'College'] },
  { id: 'travel', label: 'Travel', icon: Plane, color: '#F4A261', subs: ['Destinations', 'Points/Miles', 'Hotels', 'Flight deals'] },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard, color: '#E67E22', subs: ['Streaming', 'Box office', 'Gaming', 'Podcasts'] },
]

export const BASE_VOICES: VoiceDefinition[] = [
  { id: 'anchor', name: 'The Anchor', desc: 'Warm, authoritative, NPR-adjacent', color: '#4A90D9', icon: Radio, tier: 'free' },
  { id: 'correspondent', name: 'The Correspondent', desc: 'Crisp, energetic, faster pace', color: '#F4A261', icon: Zap, tier: 'pro' },
  { id: 'analyst', name: 'The Analyst', desc: 'Calm, measured, Bloomberg tone', color: '#2D8A6E', icon: TrendingUp, tier: 'pro' },
  { id: 'neighbor', name: 'The Neighbor', desc: 'Casual, community, conversational', color: '#D4634A', icon: Users, tier: 'pro' },
  { id: 'host', name: 'The Host', desc: 'Big personality, opinionated delivery', color: '#9B59B6', icon: Mic, tier: 'pro' },
]

export const PERSONALITY_PACKS: VoiceDefinition[] = [
  { id: 'sportscaster', name: 'The Sportscaster', desc: 'High-energy highlight reel delivery', color: '#E74C3C', icon: Trophy, tier: 'pro' },
  { id: 'strategist', name: 'The Strategist', desc: 'Hedge fund briefing, dry wit', color: '#1B3A5C', icon: Target, tier: 'pro' },
  { id: 'storyteller', name: 'The Storyteller', desc: 'Narrative-driven, warm pacing', color: '#8E6B47', icon: BookOpen, tier: 'pro' },
  { id: 'insider', name: 'The Insider', desc: 'Gossipy, knowing, rumor-mill tone', color: '#E67E22', icon: Eye, tier: 'pro' },
  { id: 'professor', name: 'The Professor', desc: 'Thoughtful, connects dots across fields', color: '#2C3E50', icon: GraduationCap, tier: 'pro' },
]

export const ALL_VOICES: VoiceDefinition[] = [...BASE_VOICES, ...PERSONALITY_PACKS]

export function getVoice(id: string): VoiceDefinition {
  return ALL_VOICES.find(v => v.id === id) || BASE_VOICES[0]
}

export function getTopic(id: string): TopicDefinition | undefined {
  return TOPIC_CATALOG.find(t => t.id === id)
}

export function estimateMinutes(length: string): number {
  switch (length) {
    case 'quick': return 10
    case 'standard': return 25
    case 'deep': return 42
    default: return 25
  }
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const MOCK_SOURCES: Record<string, SegmentSource[]> = {
  earnings: [
    { outlet: 'Wall Street Journal', domain: 'wsj.com', tier: 1, title: 'NVIDIA Reports Record Data Center Revenue', url: 'https://wsj.com/articles/nvidia-earnings', published_at: '2026-03-13T22:00:00Z', cited_claims: ['data center revenue hit $18.4B', 'exceeded analyst estimates by 4%'] },
    { outlet: 'Bloomberg', domain: 'bloomberg.com', tier: 2, title: "NVIDIA's AI Dominance Extends With Blowout Quarter", url: 'https://bloomberg.com/news/nvidia', published_at: '2026-03-13T22:30:00Z', cited_claims: ['inference revenue approaching training revenue'] },
    { outlet: 'TechCrunch', domain: 'techcrunch.com', tier: 2, title: 'Jensen Huang on Inference Scaling', url: 'https://techcrunch.com/nvidia-earnings', published_at: '2026-03-13T23:00:00Z', cited_claims: ['next-gen Blackwell chips shipping Q2'] },
  ],
  tech: [
    { outlet: 'Reuters', domain: 'reuters.com', tier: 1, title: "Apple's Spring Event Recap: New iPad Pro and AR Glasses", url: 'https://reuters.com/apple-event', published_at: '2026-03-13T20:00:00Z', cited_claims: ['M4 Ultra chip announced', 'AR glasses ship June'] },
    { outlet: 'The Verge', domain: 'theverge.com', tier: 2, title: 'Anthropic Releases Claude 4.5 Opus', url: 'https://theverge.com/anthropic-claude', published_at: '2026-03-13T18:00:00Z', cited_claims: ['new model announcement'] },
  ],
  world: [
    { outlet: 'AP News', domain: 'apnews.com', tier: 1, title: 'Ukraine-Russia Ceasefire Talks Resume in Geneva', url: 'https://apnews.com/ukraine-ceasefire', published_at: '2026-03-13T16:00:00Z', cited_claims: ['ceasefire talks resume', 'new framework proposed'] },
    { outlet: 'Financial Times', domain: 'ft.com', tier: 1, title: "China Announces $500B Economic Stimulus", url: 'https://ft.com/china-stimulus', published_at: '2026-03-13T14:00:00Z', cited_claims: ['stimulus package details'] },
  ],
  local: [
    { outlet: 'SF Chronicle', domain: 'sfchronicle.com', tier: 2, title: 'BART Extension Timeline Pushed to 2028', url: 'https://sfchronicle.com/bart', published_at: '2026-03-13T12:00:00Z', cited_claims: ['BART extension delayed', 'cost overruns cited'] },
    { outlet: 'Marin Independent Journal', domain: 'marinij.com', tier: 2, title: 'Marin Supervisors to Vote on Housing Element Tonight', url: 'https://marinij.com/housing-vote', published_at: '2026-03-13T10:00:00Z', cited_claims: ['housing element vote preview'] },
  ],
  creative: [
    { outlet: 'DPReview', domain: 'dpreview.com', tier: 2, title: 'Fujifilm Acquisition Rumors Swirl', url: 'https://dpreview.com/fuji-hasselblad', published_at: '2026-03-13T08:00:00Z', cited_claims: ['Fujifilm/Hasselblad acquisition rumors'] },
  ],
  entertainment: [
    { outlet: 'Variety', domain: 'variety.com', tier: 2, title: 'Oscar Nominations Preview: Frontrunners Emerge', url: 'https://variety.com/oscars', published_at: '2026-03-13T06:00:00Z', cited_claims: ['Oscar nominations preview'] },
    { outlet: 'Hollywood Reporter', domain: 'hollywoodreporter.com', tier: 2, title: 'The Bear Season 4 Drops Friday on Hulu', url: 'https://hollywoodreporter.com/the-bear', published_at: '2026-03-13T07:00:00Z', cited_claims: ['The Bear new season drops Friday'] },
  ],
}

export const SAMPLE_EPISODE: Episode = {
  title: 'Tuesday, March 14 — Morning Brief',
  date: '2026-03-14',
  cadence: 'daily',
  tone: 'mixed',
  estimated_minutes: 25,
  status: 'ready',
  show_notes: {
    segments: [
      { title: 'Earnings Next Week', sources: MOCK_SOURCES.earnings },
      { title: 'Tech News', sources: MOCK_SOURCES.tech },
      { title: 'World News', sources: MOCK_SOURCES.world },
      { title: 'Bay Area News', sources: MOCK_SOURCES.local },
      { title: 'Marin Local', sources: MOCK_SOURCES.local },
      { title: 'Photography', sources: MOCK_SOURCES.creative },
      { title: 'Entertainment', sources: MOCK_SOURCES.entertainment },
    ],
    correction_notes: [],
    source_summary: {
      total_articles: 14,
      total_outlets: 9,
      tier_1_count: 8,
      tier_2_count: 5,
      tier_3_count: 1,
    },
  },
  segments: [
    { topic_id: null, segment_type: 'cold_open', title: 'Cold Open', voice: 'anchor', start_time_seconds: 0, duration_seconds: 45, script: 'Good morning. It\'s Tuesday, March fourteenth, twenty twenty-six. I\'m your anchor, and this is MyPod. Big earnings week ahead. NVIDIA reports tomorrow after the bell, and analysts are calling it the most important tech print of the quarter. Apple just wrapped a surprise spring event with some major hardware announcements. On the world stage, ceasefire talks between Ukraine and Russia are back on in Geneva with a new framework on the table. And closer to home, Marin County supervisors vote tonight on a housing element that\'s been months in the making. It\'s a packed morning. Let\'s get into it.', sources: [], sort_order: 0 },
    { topic_id: 'earnings', segment_type: 'topic', title: 'Markets & Earnings', voice: 'strategist', start_time_seconds: 45, duration_seconds: 300, script: 'Let\'s talk markets. The S&P closed Monday at fifty-three twelve, up six tenths of a percent, largely on positioning ahead of NVIDIA\'s print tomorrow. NVIDIA is the main event this week. The street is looking for data center revenue of twenty point two billion, which would be another record. But the real signal isn\'t the top line — it\'s the inference-to-training revenue ratio. Last quarter, Jensen Huang said inference workloads were approaching fifty percent of data center compute. If that crosses the threshold tomorrow, it fundamentally changes the NVIDIA thesis. Beyond NVIDIA, Adobe reports Thursday. And Oracle\'s earnings Monday showed cloud infrastructure revenue jumping forty-six percent year-over-year. Fed funds futures are now pricing in a seventy-two percent probability of a June rate cut.', sources: MOCK_SOURCES.earnings, sort_order: 1 },
    { topic_id: 'tech', segment_type: 'topic', title: 'Technology', voice: 'anchor', start_time_seconds: 345, duration_seconds: 240, script: 'In tech news, Apple held an unannounced spring event yesterday. The headline is the new iPad Pro with the M4 Ultra chip. But the real surprise was Apple Glass — lightweight AR glasses that pair with your iPhone. Ship date is June. In AI news, Anthropic released Claude four point five Opus last week, scoring ninety-two percent on the SWE-bench full benchmark. And the EU\'s AI Act enforcement officially begins this week.', sources: MOCK_SOURCES.tech, sort_order: 2 },
    { topic_id: 'world', segment_type: 'topic', title: 'World News', voice: 'anchor', start_time_seconds: 585, duration_seconds: 270, script: 'Turning to world news. Ceasefire talks between Ukraine and Russia resumed in Geneva yesterday, and there\'s cautious optimism for the first time in months. A new framework proposed by Turkish and Brazilian mediators separates the territorial question from the security guarantee question. In Asia, China announced a five hundred billion dollar economic stimulus package focused on domestic consumption. And India\'s space agency ISRO successfully tested its reusable launch vehicle over the weekend.', sources: MOCK_SOURCES.world, sort_order: 3 },
    { topic_id: 'local', segment_type: 'topic', title: 'Bay Area News', voice: 'anchor', start_time_seconds: 855, duration_seconds: 180, script: 'In Bay Area news, the BART Silicon Valley extension timeline has been pushed back again, this time to twenty twenty-eight. The total project cost has ballooned from six point nine billion to an estimated eight point two billion. On a brighter note, San Francisco office vacancy rates actually declined for the first time in four years, dropping from thirty-four percent to thirty-one point eight percent — driven largely by AI companies snapping up space in SoMa and the Financial District.', sources: MOCK_SOURCES.local, sort_order: 4 },
    { topic_id: 'local', segment_type: 'topic', title: 'Marin Local', voice: 'neighbor', start_time_seconds: 1035, duration_seconds: 270, script: 'Alright, let\'s talk about what\'s happening right here in Marin. Tonight is a big one — the Board of Supervisors votes on the updated Housing Element at six PM. Expect a packed house at the Civic Center tonight. Good news for the weekend crowd — the San Rafael farmer\'s market is going year-round starting this week. Sundays, eight AM to one PM. And for the hikers — there\'s a new trail opening on Mount Tamalpais this Saturday. The Azalea Hill Loop, a two point three mile moderate trail. Dedication ceremony Saturday at ten AM at Rock Spring trailhead.', sources: MOCK_SOURCES.local, sort_order: 5 },
    { topic_id: 'creative', segment_type: 'topic', title: 'Photography & Creative', voice: 'anchor', start_time_seconds: 1305, duration_seconds: 90, script: 'Quick creative segment. The photography world is buzzing about a potential Fujifilm and Hasselblad tie-up. According to DPReview sources, Fujifilm has been in advanced talks to acquire Hasselblad\'s medium format division. Also, the new Sigma fifty millimeter f-one-point-two Art lens is getting rave early reviews — optically stunning, but at one point four kilograms, you might want to hit the gym before your next portrait session.', sources: MOCK_SOURCES.creative, sort_order: 6 },
    { topic_id: 'entertainment', segment_type: 'topic', title: 'Entertainment', voice: 'anchor', start_time_seconds: 1395, duration_seconds: 120, script: 'In entertainment, Oscar nomination voting closes today, with the ceremony set for March thirtieth. The frontrunners for Best Picture are "The Return" and "Meridian" from Denis Villeneuve. And streaming news — The Bear Season Four drops Friday on Hulu. Early reviews are calling it the best season yet. If you\'re planning a weekend binge, clear your Friday evening.', sources: MOCK_SOURCES.entertainment, sort_order: 7 },
    { topic_id: null, segment_type: 'wrap_up', title: 'Wrap & Look-Ahead', voice: 'anchor', start_time_seconds: 1515, duration_seconds: 60, script: 'That\'s your Tuesday briefing. Today — watch the Marin County housing vote at six PM. Tomorrow — NVIDIA reports after the bell. Thursday — Adobe reports and Fed Chair Powell speaks. This weekend — hit the new Azalea Hill Loop on Mount Tam, check out the year-round farmer\'s market Sunday, and clear your Friday night for The Bear Season Four. I\'m your anchor. Have a great Tuesday. This has been MyPod.', sources: [], sort_order: 8 },
  ],
}

export const DEFAULT_PROFILE = {
  id: 'local-user',
  display_name: 'You',
  timezone: 'America/Los_Angeles',
  delivery_time: '06:00',
  tone: 'mixed' as const,
  length: 'standard' as const,
  cadence: 'daily' as const,
  default_voice: 'anchor',
  discovery_enabled: true,
  email_digest: false,
}

export const DEFAULT_USER_TOPICS = [
  { id: '1', user_id: 'local-user', topic_id: 'earnings', weight: 'featured' as const, pinned: true, voice_override: 'strategist', sort_order: 0, custom_tags: ['NVIDIA earnings', 'Fed meeting'] },
  { id: '2', user_id: 'local-user', topic_id: 'tech', weight: 'standard' as const, pinned: false, voice_override: null, sort_order: 1, custom_tags: ['Claude updates', 'Apple'] },
  { id: '3', user_id: 'local-user', topic_id: 'world', weight: 'standard' as const, pinned: false, voice_override: null, sort_order: 2, custom_tags: [] },
  { id: '4', user_id: 'local-user', topic_id: 'local', weight: 'standard' as const, pinned: true, voice_override: 'neighbor', sort_order: 3, custom_tags: ['Marin housing', 'BART'] },
  { id: '5', user_id: 'local-user', topic_id: 'creative', weight: 'brief' as const, pinned: false, voice_override: null, sort_order: 4, custom_tags: [] },
  { id: '6', user_id: 'local-user', topic_id: 'entertainment', weight: 'brief' as const, pinned: false, voice_override: null, sort_order: 5, custom_tags: ['The Bear'] },
]

export const PAST_EPISODES: Episode[] = [
  {
    ...SAMPLE_EPISODE,
    title: 'Monday, March 13 — Morning Brief',
    date: '2026-03-13',
    estimated_minutes: 22,
    status: 'ready',
    segments: SAMPLE_EPISODE.segments.slice(0, 7),
  },
  {
    ...SAMPLE_EPISODE,
    title: 'Sunday, March 12 — Weekend Digest',
    date: '2026-03-12',
    cadence: 'weekly',
    estimated_minutes: 38,
    status: 'ready',
  },
  {
    ...SAMPLE_EPISODE,
    title: 'Saturday, March 11 — Morning Brief',
    date: '2026-03-11',
    estimated_minutes: 18,
    status: 'ready',
    segments: SAMPLE_EPISODE.segments.slice(0, 5),
  },
  {
    ...SAMPLE_EPISODE,
    title: 'Friday, March 10 — Morning Brief',
    date: '2026-03-10',
    estimated_minutes: 27,
    status: 'ready',
  },
  {
    ...SAMPLE_EPISODE,
    title: 'Thursday, March 9 — Morning Brief',
    date: '2026-03-09',
    estimated_minutes: 24,
    status: 'ready',
  },
]

export const KNOWLEDGE_BLOCKS: KnowledgeBlock[] = [
  {
    type: 'word_of_the_day',
    title: 'Sonder',
    content: 'The realization that each passerby has a life as vivid and complex as your own, with their own ambitions, friends, routines, worries — an epic story that continues invisibly around you.',
    source: 'The Dictionary of Obscure Sorrows',
  },
  {
    type: 'fact_of_the_day',
    title: 'The Overview Effect',
    content: 'Astronauts who see Earth from space often experience a profound cognitive shift called the "Overview Effect" — a sense of awe and interconnectedness that permanently changes how they think about borders, conflict, and the environment.',
    source: 'NASA Behavioral Health',
  },
  {
    type: 'word_of_the_day',
    title: 'Petrichor',
    content: 'The pleasant, earthy smell produced when rain falls on dry soil. It comes from an oil released by certain plants during dry periods, absorbed by clay-based soils, then released into the air when rain arrives.',
    source: 'Nature, 1964',
  },
  {
    type: 'fact_of_the_day',
    title: 'Octopus Intelligence',
    content: 'Octopuses have three hearts, blue blood, and two-thirds of their neurons are in their arms — meaning each arm can taste, touch, and make decisions independently of the brain.',
    source: 'Scientific American',
  },
]

export const MOCK_SOURCE_CATALOG: Array<{ domain: string; name: string; tier: 1 | 2 | 3; categories: string[] }> = [
  { domain: 'reuters.com', name: 'Reuters', tier: 1, categories: ['world', 'business', 'tech'] },
  { domain: 'apnews.com', name: 'AP News', tier: 1, categories: ['world', 'local'] },
  { domain: 'wsj.com', name: 'Wall Street Journal', tier: 1, categories: ['earnings', 'business'] },
  { domain: 'nytimes.com', name: 'New York Times', tier: 1, categories: ['world', 'business', 'tech'] },
  { domain: 'ft.com', name: 'Financial Times', tier: 1, categories: ['earnings', 'business', 'world'] },
  { domain: 'bloomberg.com', name: 'Bloomberg', tier: 2, categories: ['earnings', 'business', 'tech'] },
  { domain: 'npr.org', name: 'NPR', tier: 2, categories: ['world', 'science', 'creative'] },
  { domain: 'bbc.com', name: 'BBC', tier: 2, categories: ['world', 'science', 'entertainment'] },
  { domain: 'cnbc.com', name: 'CNBC', tier: 2, categories: ['earnings', 'business'] },
  { domain: 'techcrunch.com', name: 'TechCrunch', tier: 2, categories: ['tech'] },
  { domain: 'theverge.com', name: 'The Verge', tier: 2, categories: ['tech', 'entertainment'] },
  { domain: 'arstechnica.com', name: 'Ars Technica', tier: 2, categories: ['tech', 'science'] },
  { domain: 'sfchronicle.com', name: 'SF Chronicle', tier: 2, categories: ['local'] },
  { domain: 'marinij.com', name: 'Marin Independent Journal', tier: 2, categories: ['local'] },
  { domain: 'kqed.org', name: 'KQED', tier: 2, categories: ['local', 'science'] },
  { domain: 'espn.com', name: 'ESPN', tier: 2, categories: ['sports'] },
  { domain: 'theathletic.com', name: 'The Athletic', tier: 2, categories: ['sports'] },
  { domain: 'variety.com', name: 'Variety', tier: 2, categories: ['entertainment'] },
  { domain: 'hollywoodreporter.com', name: 'Hollywood Reporter', tier: 2, categories: ['entertainment'] },
  { domain: 'dpreview.com', name: 'DPReview', tier: 2, categories: ['creative'] },
  { domain: 'news.ycombinator.com', name: 'Hacker News', tier: 3, categories: ['tech'] },
  { domain: 'reddit.com', name: 'Reddit', tier: 3, categories: ['tech', 'entertainment', 'sports'] },
  { domain: 'stratechery.com', name: 'Stratechery', tier: 3, categories: ['tech', 'business'] },
]
