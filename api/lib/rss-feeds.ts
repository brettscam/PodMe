export interface RssFeed {
  url: string
  name: string
  tier: 1 | 2 | 3
}

const FEED_REGISTRY: Record<string, RssFeed[]> = {
  earnings: [
    { url: 'https://rss.app/feeds/v1.1/tgmedia-apnews-markets.xml', name: 'AP Markets', tier: 1 },
    { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', name: 'MarketWatch', tier: 2 },
    { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', name: 'CNBC Finance', tier: 2 },
  ],
  tech: [
    { url: 'https://feeds.reuters.com/reuters/technologyNews', name: 'Reuters Tech', tier: 1 },
    { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', name: 'Ars Technica', tier: 2 },
    { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', tier: 2 },
    { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', tier: 2 },
  ],
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', tier: 1 },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', tier: 1 },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', tier: 2 },
  ],
  local: [
    { url: 'https://www.sfchronicle.com/bayarea/feed/Bay-Area-Local-News-702702.php', name: 'SF Chronicle', tier: 2 },
    { url: 'https://www.marinij.com/feed/', name: 'Marin IJ', tier: 3 },
  ],
  business: [
    { url: 'https://rss.app/feeds/v1.1/tgmedia-apnews-business.xml', name: 'AP Business', tier: 1 },
    { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg', tier: 1 },
    { url: 'https://www.reuters.com/rssFeed/businessNews', name: 'Reuters Business', tier: 1 },
  ],
  science: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', name: 'NYT Science', tier: 1 },
    { url: 'https://www.newscientist.com/section/news/feed/', name: 'New Scientist', tier: 2 },
    { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'ScienceDaily', tier: 2 },
  ],
  creative: [
    { url: 'https://www.creativebloq.com/feed', name: 'Creative Bloq', tier: 3 },
    { url: 'https://www.designboom.com/feed/', name: 'Designboom', tier: 3 },
  ],
  sports: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', name: 'NYT Sports', tier: 1 },
    { url: 'https://feeds.bbci.co.uk/sport/rss.xml', name: 'BBC Sport', tier: 1 },
    { url: 'https://www.espn.com/espn/rss/news', name: 'ESPN', tier: 2 },
    { url: 'https://www.cbssports.com/rss/headlines/', name: 'CBS Sports', tier: 2 },
    { url: 'https://www.theguardian.com/football/rss', name: 'Guardian Football', tier: 1 },
  ],
  travel: [
    { url: 'https://www.lonelyplanet.com/news/feed/atom', name: 'Lonely Planet', tier: 2 },
    { url: 'https://thepointsguy.com/feed/', name: 'The Points Guy', tier: 3 },
  ],
  entertainment: [
    { url: 'https://variety.com/feed/', name: 'Variety', tier: 2 },
    { url: 'https://www.hollywoodreporter.com/feed/', name: 'Hollywood Reporter', tier: 2 },
    { url: 'https://kotaku.com/rss', name: 'Kotaku', tier: 3 },
  ],
}

export const ALL_FEEDS: RssFeed[] = Object.values(FEED_REGISTRY).flat()

export function getFeedsForTopic(topicId: string): RssFeed[] {
  return FEED_REGISTRY[topicId] || []
}
