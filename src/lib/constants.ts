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
  { id: 'southern-gentleman', name: 'The Southern Gentleman', desc: 'Warm, charming, authoritative drawl', color: '#FF6B35', icon: Radio, tier: 'free' },
  { id: 'scottish-mentor', name: 'The Scottish Mentor', desc: 'Wise, steady, measured guidance', color: '#2563EB', icon: GraduationCap, tier: 'free' },
  { id: 'modern-brand-ambassador', name: 'The Brand Voice', desc: 'Polished, confident, contemporary', color: '#10B981', icon: Zap, tier: 'free' },
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
    { topic_id: null, segment_type: 'cold_open', title: 'Cold Open', voice: 'anchor', start_time_seconds: 0, duration_seconds: 45, script: 'Good morning. It\'s Tuesday, March fourteenth, twenty twenty-six. I\'m your anchor, and this is PuckPuck. Big earnings week ahead. NVIDIA reports tomorrow after the bell, and analysts are calling it the most important tech print of the quarter. Apple just wrapped a surprise spring event with some major hardware announcements. On the world stage, ceasefire talks between Ukraine and Russia are back on in Geneva with a new framework on the table. And closer to home, Marin County supervisors vote tonight on a housing element that\'s been months in the making. It\'s a packed morning. Let\'s get into it.', sources: [], sort_order: 0 },
    { topic_id: 'earnings', segment_type: 'topic', title: 'Markets & Earnings', voice: 'strategist', start_time_seconds: 45, duration_seconds: 300, script: 'Let\'s talk markets. The S&P closed Monday at fifty-three twelve, up six tenths of a percent, largely on positioning ahead of NVIDIA\'s print tomorrow. NVIDIA is the main event this week. The street is looking for data center revenue of twenty point two billion, which would be another record. But the real signal isn\'t the top line — it\'s the inference-to-training revenue ratio. Last quarter, Jensen Huang said inference workloads were approaching fifty percent of data center compute. If that crosses the threshold tomorrow, it fundamentally changes the NVIDIA thesis. Beyond NVIDIA, Adobe reports Thursday. And Oracle\'s earnings Monday showed cloud infrastructure revenue jumping forty-six percent year-over-year. Fed funds futures are now pricing in a seventy-two percent probability of a June rate cut.', sources: MOCK_SOURCES.earnings, sort_order: 1 },
    { topic_id: 'tech', segment_type: 'topic', title: 'Technology', voice: 'anchor', start_time_seconds: 345, duration_seconds: 240, script: 'In tech news, Apple held an unannounced spring event yesterday. The headline is the new iPad Pro with the M4 Ultra chip. But the real surprise was Apple Glass — lightweight AR glasses that pair with your iPhone. Ship date is June. In AI news, Anthropic released Claude four point five Opus last week, scoring ninety-two percent on the SWE-bench full benchmark. And the EU\'s AI Act enforcement officially begins this week.', sources: MOCK_SOURCES.tech, sort_order: 2 },
    { topic_id: 'world', segment_type: 'topic', title: 'World News', voice: 'anchor', start_time_seconds: 585, duration_seconds: 270, script: 'Turning to world news. Ceasefire talks between Ukraine and Russia resumed in Geneva yesterday, and there\'s cautious optimism for the first time in months. A new framework proposed by Turkish and Brazilian mediators separates the territorial question from the security guarantee question. In Asia, China announced a five hundred billion dollar economic stimulus package focused on domestic consumption. And India\'s space agency ISRO successfully tested its reusable launch vehicle over the weekend.', sources: MOCK_SOURCES.world, sort_order: 3 },
    { topic_id: 'local', segment_type: 'topic', title: 'Bay Area News', voice: 'anchor', start_time_seconds: 855, duration_seconds: 180, script: 'In Bay Area news, the BART Silicon Valley extension timeline has been pushed back again, this time to twenty twenty-eight. The total project cost has ballooned from six point nine billion to an estimated eight point two billion. On a brighter note, San Francisco office vacancy rates actually declined for the first time in four years, dropping from thirty-four percent to thirty-one point eight percent — driven largely by AI companies snapping up space in SoMa and the Financial District.', sources: MOCK_SOURCES.local, sort_order: 4 },
    { topic_id: 'local', segment_type: 'topic', title: 'Marin Local', voice: 'neighbor', start_time_seconds: 1035, duration_seconds: 270, script: 'Alright, let\'s talk about what\'s happening right here in Marin. Tonight is a big one — the Board of Supervisors votes on the updated Housing Element at six PM. Expect a packed house at the Civic Center tonight. Good news for the weekend crowd — the San Rafael farmer\'s market is going year-round starting this week. Sundays, eight AM to one PM. And for the hikers — there\'s a new trail opening on Mount Tamalpais this Saturday. The Azalea Hill Loop, a two point three mile moderate trail. Dedication ceremony Saturday at ten AM at Rock Spring trailhead.', sources: MOCK_SOURCES.local, sort_order: 5 },
    { topic_id: 'creative', segment_type: 'topic', title: 'Photography & Creative', voice: 'anchor', start_time_seconds: 1305, duration_seconds: 90, script: 'Quick creative segment. The photography world is buzzing about a potential Fujifilm and Hasselblad tie-up. According to DPReview sources, Fujifilm has been in advanced talks to acquire Hasselblad\'s medium format division. Also, the new Sigma fifty millimeter f-one-point-two Art lens is getting rave early reviews — optically stunning, but at one point four kilograms, you might want to hit the gym before your next portrait session.', sources: MOCK_SOURCES.creative, sort_order: 6 },
    { topic_id: 'entertainment', segment_type: 'topic', title: 'Entertainment', voice: 'anchor', start_time_seconds: 1395, duration_seconds: 120, script: 'In entertainment, Oscar nomination voting closes today, with the ceremony set for March thirtieth. The frontrunners for Best Picture are "The Return" and "Meridian" from Denis Villeneuve. And streaming news — The Bear Season Four drops Friday on Hulu. Early reviews are calling it the best season yet. If you\'re planning a weekend binge, clear your Friday evening.', sources: MOCK_SOURCES.entertainment, sort_order: 7 },
    { topic_id: null, segment_type: 'wrap_up', title: 'Wrap & Look-Ahead', voice: 'anchor', start_time_seconds: 1515, duration_seconds: 60, script: 'That\'s your Tuesday briefing. Today — watch the Marin County housing vote at six PM. Tomorrow — NVIDIA reports after the bell. Thursday — Adobe reports and Fed Chair Powell speaks. This weekend — hit the new Azalea Hill Loop on Mount Tam, check out the year-round farmer\'s market Sunday, and clear your Friday night for The Bear Season Four. I\'m your anchor. Have a great Tuesday. This has been PuckPuck.', sources: [], sort_order: 8 },
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
  { id: '1', user_id: 'local-user', topic_id: 'earnings', weight: 'featured' as const, pinned: true, voice_override: 'strategist', sort_order: 0, custom_tags: ['NVIDIA earnings', 'Fed meeting', 'Micron', 'Energy', 'S&P 500', 'Housing', 'Software', 'Tech'] },
  { id: '2', user_id: 'local-user', topic_id: 'tech', weight: 'standard' as const, pinned: false, voice_override: null, sort_order: 1, custom_tags: ['Claude updates', 'Apple'] },
  { id: '3', user_id: 'local-user', topic_id: 'world', weight: 'standard' as const, pinned: false, voice_override: null, sort_order: 2, custom_tags: [] },
  { id: '4', user_id: 'local-user', topic_id: 'local', weight: 'standard' as const, pinned: true, voice_override: 'neighbor', sort_order: 3, custom_tags: ['Marin housing', 'BART'] },
  { id: '5', user_id: 'local-user', topic_id: 'creative', weight: 'brief' as const, pinned: false, voice_override: null, sort_order: 4, custom_tags: [] },
  { id: '6', user_id: 'local-user', topic_id: 'entertainment', weight: 'brief' as const, pinned: false, voice_override: null, sort_order: 5, custom_tags: ['The Bear'] },
]

export const PAST_EPISODES: Episode[] = [
  // Monday, March 13 — Lead: Oracle earnings beat, Apple spring event tease
  {
    title: 'Monday, March 13 — Morning Brief',
    date: '2026-03-13',
    cadence: 'daily',
    tone: 'mixed',
    estimated_minutes: 22,
    status: 'ready',
    show_notes: {
      segments: [
        { title: 'Oracle Earnings Beat', sources: MOCK_SOURCES.earnings },
        { title: 'Apple Spring Event Preview', sources: MOCK_SOURCES.tech },
        { title: 'Geneva Ceasefire Talks', sources: MOCK_SOURCES.world },
        { title: 'Bay Area Transit Update', sources: MOCK_SOURCES.local },
        { title: 'Oscar Predictions', sources: MOCK_SOURCES.entertainment },
      ],
      correction_notes: [],
      source_summary: { total_articles: 11, total_outlets: 8, tier_1_count: 6, tier_2_count: 4, tier_3_count: 1 },
    },
    segments: [
      { topic_id: null, segment_type: 'cold_open', title: 'Cold Open', voice: 'southern-gentleman', start_time_seconds: 0, duration_seconds: 40, script: 'Well good mornin\', folks. It\'s Monday, March thirteenth, and we have got a full plate today. Oracle just dropped a blowout earnings report that has cloud investors buzzing, Apple is teasing something big for later this week, and the Geneva ceasefire talks are picking up real momentum. Let\'s get to it.', sources: [], sort_order: 0 },
      { topic_id: 'earnings', segment_type: 'topic', title: 'Oracle Earnings Beat', voice: 'strategist', start_time_seconds: 40, duration_seconds: 240, script: 'Oracle reported after the bell Friday and the numbers are impressive. Cloud infrastructure revenue jumped forty-six percent year-over-year to five point nine billion, handily beating the street\'s estimate of five point four billion. The stock is up eight percent in pre-market trading. What\'s driving it is the backlog — Oracle\'s remaining performance obligations hit ninety-seven billion, up over fifty percent. Larry Ellison called out multi-cloud AI training deals with four hyperscalers as the catalyst.', sources: MOCK_SOURCES.earnings, sort_order: 1 },
      { topic_id: 'tech', segment_type: 'topic', title: 'Apple Spring Event Preview', voice: 'modern-brand-ambassador', start_time_seconds: 280, duration_seconds: 200, script: 'Apple has sent invitations for what it\'s calling a "special event" tomorrow, and the rumor mill is running hot. Bloomberg\'s Gurman reports a new iPad Pro with the M4 Ultra chip is the headliner, but the real wildcard is AR glasses. Supply chain sources say Apple has been shipping display components from a facility in Chengdu that doesn\'t match any known product line.', sources: MOCK_SOURCES.tech, sort_order: 2 },
      { topic_id: 'world', segment_type: 'topic', title: 'Geneva Ceasefire Talks', voice: 'anchor', start_time_seconds: 480, duration_seconds: 220, script: 'Ceasefire negotiations between Ukraine and Russia resume today in Geneva, and diplomats say the mood is cautiously different this time. A joint Turkish-Brazilian mediation team has proposed a new framework that decouples the territorial question from security guarantees. Both sides have agreed to discuss it, which alone marks a shift from previous rounds.', sources: MOCK_SOURCES.world, sort_order: 3 },
      { topic_id: 'local', segment_type: 'topic', title: 'Bay Area Transit', voice: 'neighbor', start_time_seconds: 700, duration_seconds: 180, script: 'BART riders, heads up — the Silicon Valley extension just got pushed back again, this time to twenty twenty-eight. Cost overruns have ballooned the project from six point nine billion to an estimated eight point two billion. On a brighter note, Caltrain electrification is on schedule, and the new electric trains are already running test laps between San Jose and San Francisco.', sources: MOCK_SOURCES.local, sort_order: 4 },
      { topic_id: 'entertainment', segment_type: 'topic', title: 'Oscar Season Heats Up', voice: 'anchor', start_time_seconds: 880, duration_seconds: 140, script: 'Oscar nomination voting opens today, and the Best Picture race is shaping up to be a real contest. Denis Villeneuve\'s "Meridian" and Brady Corbet\'s "The Return" are the frontrunners, but don\'t sleep on the Sundance darling "Small Hours" which has been surging in guild voting.', sources: MOCK_SOURCES.entertainment, sort_order: 5 },
      { topic_id: null, segment_type: 'wrap_up', title: 'Wrap & Look-Ahead', voice: 'southern-gentleman', start_time_seconds: 1020, duration_seconds: 50, script: 'That\'s your Monday, folks. Keep an eye on Apple\'s event tomorrow — we\'ll have full coverage Wednesday morning. NVIDIA earnings drop Wednesday after the bell. And the Marin County housing vote is Tuesday evening at six. Y\'all have a great start to the week.', sources: [], sort_order: 6 },
    ],
  },
  // Sunday, March 12 — Weekend Digest: deeper format, more segments, weekly cadence
  {
    title: 'Sunday, March 12 — Weekend Digest',
    date: '2026-03-12',
    cadence: 'weekly',
    tone: 'commentary',
    estimated_minutes: 35,
    status: 'ready',
    show_notes: {
      segments: [
        { title: 'Week in Markets', sources: MOCK_SOURCES.earnings },
        { title: 'AI Race Heats Up', sources: MOCK_SOURCES.tech },
        { title: 'China Stimulus Deep Dive', sources: MOCK_SOURCES.world },
        { title: 'Marin Weekend Guide', sources: MOCK_SOURCES.local },
        { title: 'Science Roundup', sources: [{ outlet: 'Nature', domain: 'nature.com', tier: 1, title: 'CRISPR Gene Therapy Milestone', url: 'https://nature.com/crispr-milestone', published_at: '2026-03-11T10:00:00Z', cited_claims: ['first in-vivo CRISPR therapy approved in EU'] }] },
        { title: 'Weekend Streaming Picks', sources: MOCK_SOURCES.entertainment },
        { title: 'Photography Corner', sources: MOCK_SOURCES.creative },
      ],
      correction_notes: [],
      source_summary: { total_articles: 18, total_outlets: 12, tier_1_count: 9, tier_2_count: 7, tier_3_count: 2 },
    },
    segments: [
      { topic_id: null, segment_type: 'cold_open', title: 'Cold Open', voice: 'scottish-mentor', start_time_seconds: 0, duration_seconds: 50, script: 'Good morning, and welcome to your weekend digest. I\'m glad you\'re taking a moment to catch up. It was a big week — markets rallied on Oracle\'s cloud surge, the AI arms race added a new chapter with Anthropic and Google trading blows, and China unveiled the largest stimulus package in a decade. Let\'s walk through what matters and what to watch next week.', sources: [], sort_order: 0 },
      { topic_id: 'earnings', segment_type: 'topic', title: 'Week in Markets', voice: 'strategist', start_time_seconds: 50, duration_seconds: 300, script: 'The S&P five hundred gained one point eight percent on the week, closing at fifty-two ninety-six. The Nasdaq outperformed, up two point three percent, led by semis and cloud names. Oracle was the star, gapping up nine percent on that earnings beat. The real story of the week was the rotation back into growth — value underperformed by the widest margin since January. Looking ahead, NVIDIA on Wednesday is the main event, followed by Adobe Thursday. Fed funds futures shifted meaningfully this week, now pricing seventy-two percent odds of a June cut.', sources: MOCK_SOURCES.earnings, sort_order: 1 },
      { topic_id: 'tech', segment_type: 'topic', title: 'The AI Race This Week', voice: 'modern-brand-ambassador', start_time_seconds: 350, duration_seconds: 280, script: 'It was a landmark week in AI. Anthropic released Claude four point five Opus, which scored ninety-two percent on the SWE-bench full benchmark — a new record. Google responded by announcing Gemini two point five for enterprise, emphasizing its million-token context window. Meanwhile, the EU AI Act enforcement officially begins Monday, and companies have been scrambling to file compliance reports. The big question now is whether regulation slows the pace of deployment or just shifts it to friendlier jurisdictions.', sources: MOCK_SOURCES.tech, sort_order: 2 },
      { topic_id: 'world', segment_type: 'topic', title: 'China Stimulus Deep Dive', voice: 'anchor', start_time_seconds: 630, duration_seconds: 260, script: 'China\'s five hundred billion dollar stimulus package announced Thursday deserves a closer look. Unlike previous rounds focused on infrastructure, this one targets domestic consumption directly — tax rebates for households, subsidies for EV purchases, and a new child-care allowance. The Financial Times reports it\'s Beijing\'s clearest admission yet that the property-led growth model is finished. Emerging market currencies rallied on the news, with the yuan strengthening to six point nine two against the dollar.', sources: MOCK_SOURCES.world, sort_order: 3 },
      { topic_id: 'local', segment_type: 'topic', title: 'Marin Weekend Guide', voice: 'neighbor', start_time_seconds: 890, duration_seconds: 200, script: 'If you\'re looking for something to do this weekend, the San Rafael farmers market kicks off its new year-round schedule — Sundays, eight AM to one PM, starting today. The Marin Art and Garden Center has its spring plant sale all weekend, and the Point Reyes National Seashore is running free ranger-led tide pool walks at Palomarin Beach at low tide this afternoon. Nice way to spend a Sunday.', sources: MOCK_SOURCES.local, sort_order: 4 },
      { topic_id: 'science', segment_type: 'topic', title: 'Science Roundup', voice: 'scottish-mentor', start_time_seconds: 1090, duration_seconds: 220, script: 'Two big science stories this week. The European Medicines Agency approved the first in-vivo CRISPR gene therapy — a one-time treatment for sickle cell disease that edits stem cells inside the patient\'s body, no extraction required. And NASA\'s Artemis three crew selection was finalized. Four astronauts will head to the lunar south pole in late twenty twenty-seven, including the first non-American on a US moon mission — a Canadian Space Agency flight engineer.', sources: [{ outlet: 'Nature', domain: 'nature.com', tier: 1, title: 'CRISPR Gene Therapy Milestone', url: 'https://nature.com/crispr-milestone', published_at: '2026-03-11T10:00:00Z', cited_claims: ['first in-vivo CRISPR therapy approved in EU'] }], sort_order: 5 },
      { topic_id: 'entertainment', segment_type: 'topic', title: 'Weekend Streaming Picks', voice: 'anchor', start_time_seconds: 1310, duration_seconds: 150, script: 'If you\'re settling in for some weekend viewing, "The Bear" Season Four arrives Friday on Hulu — early buzz says it\'s the best yet. Netflix dropped a surprise documentary about the making of Kendrick Lamar\'s latest album that\'s already trending number one. And if you want something lighter, the new season of "Poker Face" on Peacock is pure fun.', sources: MOCK_SOURCES.entertainment, sort_order: 6 },
      { topic_id: 'creative', segment_type: 'topic', title: 'Photography Corner', voice: 'modern-brand-ambassador', start_time_seconds: 1460, duration_seconds: 120, script: 'In the photography world, the Fujifilm-Hasselblad acquisition rumors got louder this week. DPReview sources say a deal for the medium format division could close by summer. And if you\'re shooting this weekend, the spring wildflower bloom on Mount Tam is peaking early thanks to all that February rain. Golden hour up on Ridgecrest Boulevard has been spectacular.', sources: MOCK_SOURCES.creative, sort_order: 7 },
      { topic_id: null, segment_type: 'wrap_up', title: 'Wrap & Look-Ahead', voice: 'scottish-mentor', start_time_seconds: 1580, duration_seconds: 60, script: 'That\'s your weekend digest. The week ahead is packed — Apple\'s rumored event, NVIDIA and Adobe earnings, the start of EU AI Act enforcement, and the Marin housing vote Tuesday evening. Take a breath, enjoy the farmers market, and we\'ll see you Monday morning. Have a wonderful Sunday.', sources: [], sort_order: 8 },
    ],
  },
  // Saturday, March 11 — Lighter weekend edition, sports + travel focus
  {
    title: 'Saturday, March 11 — Morning Brief',
    date: '2026-03-11',
    cadence: 'daily',
    tone: 'mixed',
    estimated_minutes: 18,
    status: 'ready',
    show_notes: {
      segments: [
        { title: 'Sports Roundup', sources: [{ outlet: 'ESPN', domain: 'espn.com', tier: 2, title: 'March Madness Bracket Preview', url: 'https://espn.com/march-madness-preview', published_at: '2026-03-10T20:00:00Z', cited_claims: ['Selection Sunday tomorrow', 'Duke favored for top overall seed'] }] },
        { title: 'Travel Deals', sources: [{ outlet: 'The Points Guy', domain: 'thepointsguy.com', tier: 3, title: 'Spring Break Flight Deals From SFO', url: 'https://thepointsguy.com/sfo-deals', published_at: '2026-03-10T14:00:00Z', cited_claims: ['SFO to Honolulu roundtrip under $250'] }] },
        { title: 'Weekend Weather', sources: MOCK_SOURCES.local },
        { title: 'Science Brief', sources: [{ outlet: 'Nature', domain: 'nature.com', tier: 1, title: 'CRISPR Gene Therapy Milestone', url: 'https://nature.com/crispr-milestone', published_at: '2026-03-11T10:00:00Z', cited_claims: ['first in-vivo CRISPR therapy approved in EU'] }] },
      ],
      correction_notes: [],
      source_summary: { total_articles: 7, total_outlets: 5, tier_1_count: 2, tier_2_count: 3, tier_3_count: 2 },
    },
    segments: [
      { topic_id: null, segment_type: 'cold_open', title: 'Cold Open', voice: 'anchor', start_time_seconds: 0, duration_seconds: 35, script: 'Good morning, it\'s Saturday, March eleventh. A lighter show today — March Madness brackets are almost set, there are some great spring travel deals out of SFO, and a quick look at the science story everyone will be talking about next week. Let\'s ease into the weekend.', sources: [], sort_order: 0 },
      { topic_id: 'sports', segment_type: 'topic', title: 'March Madness Preview', voice: 'southern-gentleman', start_time_seconds: 35, duration_seconds: 240, script: 'Selection Sunday is tomorrow and the bracket is coming into focus. Duke is the favorite for the top overall seed after winning the ACC tournament last night with a seventy-eight to sixty-five rout of North Carolina. Houston, Auburn, and Florida round out the projected one seeds. The real drama is on the bubble — Stanford needs one more win in the Pac-12 tournament to feel safe, and Cal is squarely on the cut line. If you\'re filling out brackets, the stat to know is that no sixteen seed has beaten a one seed since UMBC shocked Virginia back in twenty eighteen.', sources: [{ outlet: 'ESPN', domain: 'espn.com', tier: 2, title: 'March Madness Bracket Preview', url: 'https://espn.com/march-madness-preview', published_at: '2026-03-10T20:00:00Z', cited_claims: ['Selection Sunday tomorrow', 'Duke favored for top overall seed'] }], sort_order: 1 },
      { topic_id: 'travel', segment_type: 'topic', title: 'Spring Travel Deals', voice: 'modern-brand-ambassador', start_time_seconds: 275, duration_seconds: 180, script: 'If you\'re thinking about a spring getaway, some great fares just dropped from SFO. United has roundtrips to Honolulu for two forty-nine through April — that\'s nearly forty percent below average. Alaska Airlines is running a flash sale to Cabo for one ninety-nine roundtrip, bookable through Monday. And for points travelers, Hyatt just opened award availability at the new Andaz Maui for fifteen thousand points a night in May.', sources: [{ outlet: 'The Points Guy', domain: 'thepointsguy.com', tier: 3, title: 'Spring Break Flight Deals From SFO', url: 'https://thepointsguy.com/sfo-deals', published_at: '2026-03-10T14:00:00Z', cited_claims: ['SFO to Honolulu roundtrip under $250'] }], sort_order: 2 },
      { topic_id: 'local', segment_type: 'topic', title: 'Weekend Weather & Local', voice: 'neighbor', start_time_seconds: 455, duration_seconds: 150, script: 'Weekend weather looks gorgeous for Marin — sunny skies, highs in the mid-sixties today and low seventies tomorrow. The wildflower bloom on Mount Tam is peaking, so if you\'ve been meaning to hike the Cataract Falls trail, this is the weekend. Heads up that the Richmond-San Rafael Bridge will have lane closures eastbound Saturday night for maintenance, nine PM to five AM.', sources: MOCK_SOURCES.local, sort_order: 3 },
      { topic_id: 'science', segment_type: 'topic', title: 'CRISPR Breakthrough', voice: 'scottish-mentor', start_time_seconds: 605, duration_seconds: 180, script: 'A science story worth knowing about — the European Medicines Agency approved the first CRISPR gene therapy that works inside the body. Previous CRISPR treatments required extracting cells, editing them in a lab, and putting them back. This new therapy from Vertex Pharmaceuticals targets sickle cell disease with a single intravenous infusion that edits bone marrow stem cells in place. Clinical trials showed ninety-four percent of patients were crisis-free at eighteen months.', sources: [{ outlet: 'Nature', domain: 'nature.com', tier: 1, title: 'CRISPR Gene Therapy Milestone', url: 'https://nature.com/crispr-milestone', published_at: '2026-03-11T10:00:00Z', cited_claims: ['first in-vivo CRISPR therapy approved in EU'] }], sort_order: 4 },
      { topic_id: null, segment_type: 'wrap_up', title: 'Wrap', voice: 'anchor', start_time_seconds: 785, duration_seconds: 40, script: 'That\'s your Saturday morning. Enjoy the sunshine, watch Selection Sunday tomorrow, and we\'ll be back with the full weekend digest. Have a great day.', sources: [], sort_order: 5 },
    ],
  },
  // Friday, March 10 — Lead: Fed rate signal, China stimulus, Warriors
  {
    title: 'Friday, March 10 — Morning Brief',
    date: '2026-03-10',
    cadence: 'daily',
    tone: 'factual',
    estimated_minutes: 27,
    status: 'ready',
    show_notes: {
      segments: [
        { title: 'Fed Rate Signal', sources: [{ outlet: 'Wall Street Journal', domain: 'wsj.com', tier: 1, title: 'Fed Officials Signal June Rate Cut Likely', url: 'https://wsj.com/articles/fed-rate-signal', published_at: '2026-03-09T21:00:00Z', cited_claims: ['Waller says data supports June cut', 'futures shift to 72% probability'] }] },
        { title: 'China Stimulus Package', sources: MOCK_SOURCES.world },
        { title: 'Enterprise AI Adoption', sources: MOCK_SOURCES.tech },
        { title: 'Warriors Trade Deadline', sources: [{ outlet: 'The Athletic', domain: 'theathletic.com', tier: 2, title: 'Warriors Acquire Wing Defender in Three-Team Deal', url: 'https://theathletic.com/warriors-trade', published_at: '2026-03-09T19:00:00Z', cited_claims: ['Warriors add defensive wing', 'gave up two second-round picks'] }] },
        { title: 'Marin County Schools', sources: MOCK_SOURCES.local },
        { title: 'Streaming Wars Update', sources: MOCK_SOURCES.entertainment },
      ],
      correction_notes: [],
      source_summary: { total_articles: 13, total_outlets: 9, tier_1_count: 7, tier_2_count: 5, tier_3_count: 1 },
    },
    segments: [
      { topic_id: null, segment_type: 'cold_open', title: 'Cold Open', voice: 'anchor', start_time_seconds: 0, duration_seconds: 45, script: 'Good morning, it\'s Friday, March tenth. The Fed just gave its clearest signal yet that a June rate cut is on the table. China dropped a half-trillion-dollar stimulus bombshell overnight. Enterprise AI spending is surging according to a new Gartner report. And the Warriors made a late trade deadline move. Let\'s break it all down to send you into the weekend informed.', sources: [], sort_order: 0 },
      { topic_id: 'business', segment_type: 'topic', title: 'Fed Rate Signal', voice: 'strategist', start_time_seconds: 45, duration_seconds: 280, script: 'Fed Governor Christopher Waller gave a speech last night that markets are treating as a green light for June. He said, and I quote, "the totality of the data is moving in the right direction." Translation — inflation is cooling enough that the Fed is ready to act. The February CPI print came in at two point six percent, down from two point eight in January. Core PCE is trending at two point four. Fed funds futures immediately repriced, now showing seventy-two percent odds of a June cut, up from fifty-eight percent a week ago. The two-year Treasury yield dropped nine basis points overnight to four point twelve percent.', sources: [{ outlet: 'Wall Street Journal', domain: 'wsj.com', tier: 1, title: 'Fed Officials Signal June Rate Cut Likely', url: 'https://wsj.com/articles/fed-rate-signal', published_at: '2026-03-09T21:00:00Z', cited_claims: ['Waller says data supports June cut', 'futures shift to 72% probability'] }], sort_order: 1 },
      { topic_id: 'world', segment_type: 'topic', title: 'China Stimulus Package', voice: 'anchor', start_time_seconds: 325, duration_seconds: 240, script: 'China\'s State Council announced a five hundred billion dollar stimulus package overnight, and this one is different from previous rounds. Instead of pouring money into infrastructure and real estate, Beijing is targeting household consumption directly — income tax rebates, EV purchase subsidies, and a new monthly child-care stipend. The FT calls it the clearest signal yet that the property-led growth model is over. Asian markets rallied across the board, with the Hang Seng up three point two percent.', sources: MOCK_SOURCES.world, sort_order: 2 },
      { topic_id: 'tech', segment_type: 'topic', title: 'Enterprise AI Spending Surge', voice: 'modern-brand-ambassador', start_time_seconds: 565, duration_seconds: 200, script: 'Gartner\'s latest report shows enterprise AI spending hit one hundred forty billion dollars in twenty twenty-five, up sixty-two percent year-over-year. The fastest-growing category is AI-powered code generation tools, now used by forty-three percent of Fortune five hundred engineering teams. Customer service automation is second. The report also flags a talent gap — demand for ML engineers is outpacing supply by three to one.', sources: MOCK_SOURCES.tech, sort_order: 3 },
      { topic_id: 'sports', segment_type: 'topic', title: 'Warriors Trade Deadline', voice: 'southern-gentleman', start_time_seconds: 765, duration_seconds: 180, script: 'The Warriors snuck in a trade deadline deal last night, picking up wing defender Jalen Williams Jr. in a three-team deal with Charlotte and Detroit. They gave up two second-round picks and a trade exception. Williams is a six-foot-seven switchable defender who shoots thirty-seven percent from three — exactly the profile Golden State needed alongside Curry for the playoff push. The Dubs are currently the seven seed at thirty-four and thirty.', sources: [{ outlet: 'The Athletic', domain: 'theathletic.com', tier: 2, title: 'Warriors Acquire Wing Defender in Three-Team Deal', url: 'https://theathletic.com/warriors-trade', published_at: '2026-03-09T19:00:00Z', cited_claims: ['Warriors add defensive wing', 'gave up two second-round picks'] }], sort_order: 4 },
      { topic_id: 'local', segment_type: 'topic', title: 'Marin Schools Budget', voice: 'neighbor', start_time_seconds: 945, duration_seconds: 160, script: 'The Tamalpais Union High School District board met last night and approved a preliminary budget that includes hiring twelve new teachers for next year, funded by the parcel tax that passed in November. Mill Valley Middle School also announced a new partnership with the Marine Mammal Center for a hands-on marine biology curriculum starting in the fall.', sources: MOCK_SOURCES.local, sort_order: 5 },
      { topic_id: 'entertainment', segment_type: 'topic', title: 'Streaming Wars', voice: 'anchor', start_time_seconds: 1105, duration_seconds: 140, script: 'Netflix reported that it now has three hundred twelve million subscribers globally after adding thirteen million last quarter. Disney Plus is countering by bundling Hulu content directly into the Disney Plus app starting next month. And HBO\'s "The Last of Us" Season Two premiere date was confirmed for April twentieth — expect the hype machine to start revving up this weekend.', sources: MOCK_SOURCES.entertainment, sort_order: 6 },
      { topic_id: null, segment_type: 'wrap_up', title: 'Wrap & Weekend Preview', voice: 'anchor', start_time_seconds: 1245, duration_seconds: 55, script: 'That wraps your Friday briefing. This weekend — Selection Sunday for March Madness, the San Rafael farmers market goes year-round starting Sunday, and the wildflower bloom on Mount Tam is peaking. Next week is huge — Apple\'s expected event, NVIDIA and Adobe earnings, and the Marin housing vote Tuesday night. Enjoy the weekend, and we\'ll see you Saturday morning.', sources: [], sort_order: 7 },
    ],
  },
  // Thursday, March 9 — Lead: Anthropic Claude 4.5, EU AI Act, ISRO launch
  {
    title: 'Thursday, March 9 — Morning Brief',
    date: '2026-03-09',
    cadence: 'daily',
    tone: 'mixed',
    estimated_minutes: 24,
    status: 'ready',
    show_notes: {
      segments: [
        { title: 'Claude 4.5 Opus Launch', sources: MOCK_SOURCES.tech },
        { title: 'EU AI Act Enforcement', sources: [{ outlet: 'Financial Times', domain: 'ft.com', tier: 1, title: 'EU AI Act Enforcement Begins Next Week', url: 'https://ft.com/eu-ai-act', published_at: '2026-03-08T15:00:00Z', cited_claims: ['compliance deadline March 15', 'fines up to 7% of global revenue'] }] },
        { title: 'India Space Program', sources: [{ outlet: 'Reuters', domain: 'reuters.com', tier: 1, title: 'ISRO Reusable Launch Vehicle Test Succeeds', url: 'https://reuters.com/isro-rlv-test', published_at: '2026-03-08T12:00:00Z', cited_claims: ['successful autonomous landing', 'commercial flights targeted for 2028'] }] },
        { title: 'Markets Recap', sources: MOCK_SOURCES.earnings },
        { title: 'Marin Trail Opening', sources: MOCK_SOURCES.local },
      ],
      correction_notes: [],
      source_summary: { total_articles: 10, total_outlets: 7, tier_1_count: 5, tier_2_count: 4, tier_3_count: 1 },
    },
    segments: [
      { topic_id: null, segment_type: 'cold_open', title: 'Cold Open', voice: 'scottish-mentor', start_time_seconds: 0, duration_seconds: 45, script: 'Good morning. Thursday, March ninth. Today we lead with a major AI release — Anthropic just launched Claude four point five Opus, and the benchmarks are turning heads. The EU is gearing up to enforce its AI Act starting next week, which will reshape how tech companies operate in Europe. India\'s space program hit a milestone overnight. And we\'ve got a trail update for the weekend hikers. Let\'s get into it.', sources: [], sort_order: 0 },
      { topic_id: 'tech', segment_type: 'topic', title: 'Claude 4.5 Opus Launch', voice: 'modern-brand-ambassador', start_time_seconds: 45, duration_seconds: 280, script: 'Anthropic released Claude four point five Opus yesterday and the AI community is buzzing. The headline number is a ninety-two percent score on the SWE-bench full coding benchmark, which measures the ability to solve real-world software engineering problems from GitHub issues. That\'s a meaningful jump from the previous best of eighty-four percent. What\'s more interesting is the qualitative feedback from early testers — they\'re reporting significantly better performance on long, multi-step reasoning tasks and a much lower hallucination rate on factual queries.', sources: MOCK_SOURCES.tech, sort_order: 1 },
      { topic_id: 'tech', segment_type: 'topic', title: 'EU AI Act Enforcement', voice: 'anchor', start_time_seconds: 325, duration_seconds: 220, script: 'The EU AI Act enters its enforcement phase next Monday, March fifteenth. Companies deploying high-risk AI systems in Europe will need to have compliance documentation filed by that date or face fines of up to seven percent of global revenue. The Financial Times reports that several major US tech companies have been scrambling — Microsoft and Google filed their compliance reports last week, but at least three others are expected to miss the deadline and apply for extensions.', sources: [{ outlet: 'Financial Times', domain: 'ft.com', tier: 1, title: 'EU AI Act Enforcement Begins Next Week', url: 'https://ft.com/eu-ai-act', published_at: '2026-03-08T15:00:00Z', cited_claims: ['compliance deadline March 15', 'fines up to 7% of global revenue'] }], sort_order: 2 },
      { topic_id: 'science', segment_type: 'topic', title: 'ISRO Reusable Launch Vehicle', voice: 'scottish-mentor', start_time_seconds: 545, duration_seconds: 200, script: 'India\'s space agency ISRO successfully tested its reusable launch vehicle overnight — the RLV-TD completed an autonomous runway landing after a suborbital flight, making India the third country to demonstrate this capability after the US and China. ISRO chairman Somanath said commercial flights using the reusable system are targeted for twenty twenty-eight. The cost reduction could make Indian launches forty percent cheaper than current PSLV missions.', sources: [{ outlet: 'Reuters', domain: 'reuters.com', tier: 1, title: 'ISRO Reusable Launch Vehicle Test Succeeds', url: 'https://reuters.com/isro-rlv-test', published_at: '2026-03-08T12:00:00Z', cited_claims: ['successful autonomous landing', 'commercial flights targeted for 2028'] }], sort_order: 3 },
      { topic_id: 'earnings', segment_type: 'topic', title: 'Markets Check', voice: 'strategist', start_time_seconds: 745, duration_seconds: 180, script: 'Quick markets check. The S&P closed Wednesday at fifty-two forty, up three tenths of a percent. It\'s been a slow grind higher all week ahead of the Oracle earnings print tomorrow. Semiconductor stocks are catching a bid — the SOXX index is up four percent on the week on NVIDIA positioning. Bond yields are steady with the ten-year at four point twenty-eight. Oil ticked up to seventy-eight dollars on the China stimulus chatter.', sources: MOCK_SOURCES.earnings, sort_order: 4 },
      { topic_id: 'local', segment_type: 'topic', title: 'Mount Tam Trail News', voice: 'neighbor', start_time_seconds: 925, duration_seconds: 150, script: 'Good news for the hiking crowd — Marin County Parks announced a new trail opening on Mount Tamalpais this Saturday. The Azalea Hill Loop is a two point three mile moderate trail with panoramic views of the Pacific. There\'s a dedication ceremony Saturday at ten AM at the Rock Spring trailhead. Also, the Muir Woods shuttle service resumes this weekend for the season, running every thirty minutes from the Pohono Park and Ride.', sources: MOCK_SOURCES.local, sort_order: 5 },
      { topic_id: null, segment_type: 'wrap_up', title: 'Wrap & Look-Ahead', voice: 'scottish-mentor', start_time_seconds: 1075, duration_seconds: 50, script: 'That\'s your Thursday. Oracle reports after the bell tomorrow — we\'ll have the numbers and analysis in Friday\'s episode. The new Azalea Hill trail opens Saturday if you\'re looking for a weekend hike. And start thinking about your March Madness brackets — Selection Sunday is this weekend. Take care, and we\'ll see you tomorrow morning.', sources: [], sort_order: 6 },
    ],
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
