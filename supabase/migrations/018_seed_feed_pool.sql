-- Seed the feed_pool with curated top sources.
-- These give the discovery pipeline a strong starting corpus so most
-- custom topics match something immediately, without a Claude call.
--
-- Tagging strategy:
--   - categories: broad built-in topic ids (tech, world, business, etc.)
--     so a custom topic in that parent_category can match on them.
--   - tags: free-form keywords (ai, climate, startups, premier-league...)
--     for finer-grained matching.
--   - region: for local news feeds, the metro area ("portland-or",
--     "bay-area", "nyc", "london")
--
-- Reddit entries use kind='reddit' and the feed URL is the subreddit's
-- .rss endpoint — the fetcher treats them like RSS but with a Reddit
-- User-Agent.

insert into feed_pool (url, name, kind, tier, categories, tags, region, description) values

-- ============================================================
-- TIER 1 — General news (world)
-- ============================================================
('https://feeds.bbci.co.uk/news/world/rss.xml',                 'BBC World',          'rss', 1, '{world}',               '{breaking,international}',       null, 'BBC international news'),
('https://rss.nytimes.com/services/xml/rss/nyt/World.xml',      'NYT World',          'rss', 1, '{world}',               '{international,politics}',       null, 'New York Times world coverage'),
('https://www.reuters.com/rssFeed/worldNews',                   'Reuters World',      'rss', 1, '{world}',               '{wire,breaking}',                null, 'Reuters world desk'),
('https://feeds.apnews.com/apnews/topnews',                     'AP Top News',        'rss', 1, '{world,business}',      '{wire,breaking}',                null, 'Associated Press top headlines'),
('https://www.theguardian.com/world/rss',                       'Guardian World',     'rss', 1, '{world}',               '{international,politics}',       null, 'The Guardian world desk'),
('https://feeds.washingtonpost.com/rss/world',                  'WaPo World',         'rss', 1, '{world}',               '{international}',                null, 'Washington Post world'),

-- Business & finance
('https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',   'NYT Business',       'rss', 1, '{business,earnings}',   '{markets,economy}',              null, 'NYT business desk'),
('https://www.ft.com/?format=rss',                              'Financial Times',    'rss', 1, '{business,earnings,world}', '{markets,finance}',          null, 'FT top stories'),
('https://feeds.bloomberg.com/markets/news.rss',                'Bloomberg Markets',  'rss', 1, '{earnings,business}',   '{markets,finance}',              null, 'Bloomberg markets wire'),
('https://www.wsj.com/xml/rss/3_7085.xml',                      'WSJ Business',       'rss', 1, '{business,earnings}',   '{markets,finance,wsj}',          null, 'Wall Street Journal business'),

-- Science
('https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',    'NYT Science',        'rss', 1, '{science}',             '{research}',                     null, 'NYT science desk'),
('https://www.nature.com/nature.rss',                           'Nature',             'rss', 1, '{science}',             '{research,peer-reviewed}',       null, 'Nature research highlights'),
('https://www.sciencemag.org/rss/current.xml',                  'Science Magazine',   'rss', 1, '{science}',             '{research,peer-reviewed}',       null, 'Science Magazine'),

-- Sports
('https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',     'NYT Sports',         'rss', 1, '{sports}',              '{columnists}',                   null, 'NYT sports desk'),
('https://feeds.bbci.co.uk/sport/rss.xml',                      'BBC Sport',          'rss', 1, '{sports}',              '{international,soccer}',         null, 'BBC Sport general'),
('https://www.theguardian.com/football/rss',                    'Guardian Football',  'rss', 1, '{sports}',              '{soccer,premier-league,football}', null, 'Guardian football coverage'),

-- ============================================================
-- TIER 2 — Mainstream coverage
-- ============================================================
('https://feeds.arstechnica.com/arstechnica/technology-lab',    'Ars Technica',       'rss', 2, '{tech,science}',        '{deep-dive,enterprise}',         null, 'Ars Technica tech & science'),
('https://www.theverge.com/rss/index.xml',                      'The Verge',          'rss', 2, '{tech}',                '{consumer,gadgets}',             null, 'The Verge'),
('https://techcrunch.com/feed/',                                'TechCrunch',         'rss', 2, '{tech,business}',       '{startups,venture,funding}',     null, 'TechCrunch startups & funding'),
('https://www.wired.com/feed/rss',                              'Wired',              'rss', 2, '{tech,science,culture}', '{features,longform}',           null, 'Wired magazine'),
('https://www.cnbc.com/id/10001147/device/rss/rss.html',        'CNBC Business',      'rss', 2, '{business,earnings}',   '{markets}',                      null, 'CNBC business headlines'),
('https://variety.com/feed/',                                   'Variety',            'rss', 2, '{entertainment}',       '{film,tv,hollywood}',            null, 'Variety entertainment'),
('https://www.hollywoodreporter.com/feed/',                     'Hollywood Reporter', 'rss', 2, '{entertainment}',       '{film,tv,hollywood}',            null, 'The Hollywood Reporter'),
('https://www.espn.com/espn/rss/news',                          'ESPN',               'rss', 2, '{sports}',              '{usa,columnists}',               null, 'ESPN top stories'),

-- ============================================================
-- TIER 2 — Topic-specialist
-- ============================================================
('https://techcrunch.com/category/artificial-intelligence/feed/','TechCrunch AI',     'rss', 2, '{tech}',                '{ai,artificial-intelligence,machine-learning,llm}', null, 'TC AI vertical'),
('https://techcrunch.com/category/startups/feed/',              'TechCrunch Startups','rss', 2, '{tech,business}',       '{startups,venture,funding}',     null, 'TC startups vertical'),
('https://9to5mac.com/feed/',                                   '9to5Mac',            'rss', 2, '{tech}',                '{apple,ios,mac,iphone}',         null, 'Apple ecosystem news'),
('https://9to5google.com/feed/',                                '9to5Google',         'rss', 2, '{tech}',                '{google,android,pixel}',         null, 'Google/Android news'),
('https://cointelegraph.com/rss',                               'CoinTelegraph',      'rss', 2, '{tech,business,earnings}', '{crypto,bitcoin,ethereum,blockchain}', null, 'Cryptocurrency news'),
('https://www.coindesk.com/arc/outboundfeeds/rss/',             'CoinDesk',           'rss', 2, '{tech,business,earnings}', '{crypto,bitcoin,ethereum,blockchain}', null, 'CoinDesk crypto wire'),
('https://feeds.feedburner.com/TheHackersNews',                 'The Hacker News',    'rss', 2, '{tech}',                '{cybersecurity,infosec,vulnerabilities}', null, 'Infosec news'),
('https://www.space.com/feeds/all',                             'Space.com',          'rss', 2, '{science}',             '{space,nasa,astronomy,rockets}', null, 'Space news'),
('https://www.nasa.gov/rss/dyn/breaking_news.rss',              'NASA',               'rss', 1, '{science}',             '{space,nasa,astronomy}',         null, 'NASA breaking news'),
('https://www.theguardian.com/environment/climate-crisis/rss',  'Guardian Climate',   'rss', 2, '{science,world}',       '{climate,environment,crisis}',   null, 'Guardian climate crisis'),

-- Sports specialists
('https://www.motorsport.com/rss/f1/news/',                     'Motorsport F1',      'rss', 2, '{sports}',              '{f1,formula-1,racing}',          null, 'F1 news'),
('https://www.espn.com/espn/rss/nba/news',                      'ESPN NBA',           'rss', 2, '{sports}',              '{nba,basketball}',               null, 'ESPN NBA'),
('https://www.espn.com/espn/rss/nfl/news',                      'ESPN NFL',           'rss', 2, '{sports}',              '{nfl,football,american-football}', null, 'ESPN NFL'),
('https://www.espn.com/espn/rss/mlb/news',                      'ESPN MLB',           'rss', 2, '{sports}',              '{mlb,baseball}',                 null, 'ESPN MLB'),

-- ============================================================
-- REGIONAL / LOCAL — US metros
-- ============================================================
('https://www.sfchronicle.com/bayarea/feed/Bay-Area-Local-News-702702.php', 'SF Chronicle', 'rss', 2, '{local,world,business}', '{bay-area,san-francisco,oakland}', 'bay-area', 'San Francisco Chronicle'),
('https://www.latimes.com/local/rss2.0.xml',                    'LA Times Local',     'rss', 2, '{local}',               '{los-angeles,california,southern-california}', 'los-angeles', 'LA Times local news'),
('https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/nyregion/rss.xml', 'NYT Metro', 'rss', 1, '{local}', '{new-york,nyc,manhattan,brooklyn}', 'nyc', 'NYT metro region'),
('https://www.bostonglobe.com/rss/bostonglobe/local',           'Boston Globe',       'rss', 2, '{local}',               '{boston,massachusetts,new-england}', 'boston', 'Boston Globe local'),
('https://www.chicagotribune.com/arcio/rss/category/news/',     'Chicago Tribune',    'rss', 2, '{local}',               '{chicago,illinois,midwest}',     'chicago', 'Chicago Tribune'),
('https://www.oregonlive.com/arc/outboundfeeds/rss/',           'Oregonian',          'rss', 2, '{local}',               '{portland,oregon,pacific-northwest}', 'portland-or', 'The Oregonian'),

-- ============================================================
-- CULTURE / LIFESTYLE
-- ============================================================
('https://www.theatlantic.com/feed/all/',                       'The Atlantic',       'rss', 1, '{culture,world,creative}', '{longform,essays,ideas}',     null, 'The Atlantic'),
('https://www.newyorker.com/feed/everything',                   'The New Yorker',     'rss', 1, '{culture,creative}',    '{longform,essays,fiction}',      null, 'The New Yorker'),
('https://www.rollingstone.com/feed/',                          'Rolling Stone',      'rss', 2, '{entertainment,culture}', '{music,politics,culture}',     null, 'Rolling Stone'),
('https://pitchfork.com/rss/news',                              'Pitchfork',          'rss', 2, '{entertainment,creative}', '{music,reviews,indie}',       null, 'Pitchfork music news'),
('https://www.cntraveler.com/feed/rss',                         'Conde Nast Traveler','rss', 2, '{travel,creative}',     '{travel,hotels,destinations}',   null, 'Conde Nast Traveler'),
('https://www.lonelyplanet.com/news/feed/atom',                 'Lonely Planet',     'atom', 2, '{travel}',              '{travel,backpacking,budget}',    null, 'Lonely Planet news'),

-- ============================================================
-- REDDIT — Popular community feeds (as RSS)
-- Reddit supports /.rss on any subreddit URL.
-- ============================================================
('https://www.reddit.com/r/worldnews/.rss',                     'r/worldnews',        'reddit', 3, '{world}',              '{reddit,community}',             null, 'Reddit world news community'),
('https://www.reddit.com/r/technology/.rss',                    'r/technology',       'reddit', 3, '{tech}',               '{reddit,community}',             null, 'Reddit technology community'),
('https://www.reddit.com/r/MachineLearning/.rss',               'r/MachineLearning',  'reddit', 3, '{tech,science}',       '{reddit,ai,ml,machine-learning,research}', null, 'ML research subreddit'),
('https://www.reddit.com/r/apple/.rss',                         'r/apple',            'reddit', 3, '{tech}',               '{reddit,apple,ios,mac}',         null, 'Reddit Apple community'),
('https://www.reddit.com/r/Android/.rss',                       'r/Android',          'reddit', 3, '{tech}',               '{reddit,android,google}',        null, 'Reddit Android community'),
('https://www.reddit.com/r/space/.rss',                         'r/space',            'reddit', 3, '{science}',            '{reddit,space,nasa,astronomy}',  null, 'Reddit space community'),
('https://www.reddit.com/r/science/.rss',                       'r/science',          'reddit', 3, '{science}',            '{reddit,research}',              null, 'Reddit science community'),
('https://www.reddit.com/r/nba/.rss',                           'r/nba',              'reddit', 3, '{sports}',             '{reddit,nba,basketball}',        null, 'Reddit NBA community'),
('https://www.reddit.com/r/soccer/.rss',                        'r/soccer',           'reddit', 3, '{sports}',             '{reddit,soccer,football,premier-league}', null, 'Reddit soccer community'),
('https://www.reddit.com/r/formula1/.rss',                      'r/formula1',         'reddit', 3, '{sports}',             '{reddit,f1,formula-1,racing}',   null, 'Reddit F1 community'),
('https://www.reddit.com/r/cryptocurrency/.rss',                'r/cryptocurrency',   'reddit', 3, '{tech,business,earnings}', '{reddit,crypto,bitcoin,ethereum}', null, 'Reddit crypto community'),
('https://www.reddit.com/r/stocks/.rss',                        'r/stocks',           'reddit', 3, '{business,earnings}',  '{reddit,stocks,investing,markets}', null, 'Reddit stocks community'),
('https://www.reddit.com/r/movies/.rss',                        'r/movies',           'reddit', 3, '{entertainment,culture}', '{reddit,film,movies,hollywood}', null, 'Reddit movies community'),
('https://www.reddit.com/r/television/.rss',                    'r/television',       'reddit', 3, '{entertainment,culture}', '{reddit,tv,streaming}',       null, 'Reddit television community'),
('https://www.reddit.com/r/sanfrancisco/.rss',                  'r/sanfrancisco',     'reddit', 3, '{local}',              '{reddit,san-francisco,bay-area}', 'bay-area', 'Reddit SF community'),
('https://www.reddit.com/r/nyc/.rss',                           'r/nyc',              'reddit', 3, '{local}',              '{reddit,new-york,nyc}',          'nyc', 'Reddit NYC community'),
('https://www.reddit.com/r/Portland/.rss',                      'r/Portland',         'reddit', 3, '{local}',              '{reddit,portland,oregon}',       'portland-or', 'Reddit Portland community'),
('https://www.reddit.com/r/LosAngeles/.rss',                    'r/LosAngeles',       'reddit', 3, '{local}',              '{reddit,los-angeles,california}', 'los-angeles', 'Reddit LA community')

on conflict (url) do update set
  name = excluded.name,
  kind = excluded.kind,
  tier = excluded.tier,
  categories = excluded.categories,
  tags = excluded.tags,
  region = excluded.region,
  description = excluded.description;
