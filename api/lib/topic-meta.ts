// Topic metadata for web search prompts (derived from TOPIC_CATALOG, no icons)
export const TOPIC_META: Record<string, { label: string; subs: string[] }> = {
  earnings: { label: 'Markets & Earnings', subs: ['Earnings next week', 'S&P movers', 'IPO pipeline', 'Crypto', 'Sector rotation'] },
  tech: { label: 'Technology', subs: ['AI/ML', 'Consumer tech', 'Enterprise SaaS', 'Startups', 'Open source'] },
  world: { label: 'World News', subs: ['Geopolitics', 'Climate', 'Conflict', 'Diplomacy', 'Global health'] },
  local: { label: 'Bay Area & Marin County', subs: ['Bay Area', 'Marin County', 'School boards', 'Transit', 'Housing'] },
  business: { label: 'Business & Economy', subs: ['Fed/Rates', 'Labor market', 'M&A', 'Venture capital', 'Real estate'] },
  science: { label: 'Science & Health', subs: ['Research', 'Space', 'Medicine', 'Nutrition', 'Mental health'] },
  creative: { label: 'Creative & Culture', subs: ['Photography', 'Design', 'Film', 'Music', 'Books'] },
  sports: { label: 'Sports', subs: ['NFL', 'NBA', 'MLB', 'F1', 'Golf', 'College'] },
  travel: { label: 'Travel', subs: ['Destinations', 'Points/Miles', 'Hotels', 'Flight deals'] },
  entertainment: { label: 'Entertainment', subs: ['Streaming', 'Box office', 'Gaming', 'Podcasts'] },
}
