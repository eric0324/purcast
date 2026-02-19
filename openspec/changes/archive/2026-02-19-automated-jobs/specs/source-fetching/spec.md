## ADDED Requirements

### Requirement: RSS feed source fetching
The system SHALL fetch and parse RSS/Atom feeds to extract article entries.

#### Scenario: Valid RSS feed
- **WHEN** the system fetches a source with type='rss'
- **THEN** it SHALL parse the feed using rss-parser and return a list of articles with title, url (link), content or summary, and publishedAt (pubDate)

#### Scenario: Invalid or unreachable RSS URL
- **WHEN** the RSS feed URL returns a non-200 status or invalid XML
- **THEN** the system SHALL log the error and return an empty article list without failing the entire Job run

#### Scenario: Feed with no new entries
- **WHEN** all entries in the feed have already been processed (exist in job_articles)
- **THEN** the system SHALL return an empty article list

### Requirement: URL homepage monitoring
The system SHALL monitor a URL (typically a blog homepage) to detect new article links.

#### Scenario: Detect new links on homepage
- **WHEN** the system fetches a source with type='url'
- **THEN** it SHALL fetch the page HTML, parse it with cheerio, extract article-like links (same domain, path patterns suggesting articles), and return newly discovered URLs not present in job_articles

#### Scenario: Article link heuristic filtering
- **WHEN** extracting links from a homepage
- **THEN** the system SHALL filter out navigation, footer, category, and tag links using heuristic rules (e.g., path contains date segments, slug-like paths, links within `<article>` or `<main>` elements)

#### Scenario: Unreachable URL
- **WHEN** the monitored URL returns a non-200 status or times out (30s)
- **THEN** the system SHALL log the error and return an empty article list without failing the entire Job run

### Requirement: Article content extraction
The system SHALL extract the full text content from an article URL for use in script generation.

#### Scenario: Extract article body
- **WHEN** a new article URL is discovered (from RSS or URL monitoring)
- **THEN** the system SHALL fetch the article page, extract the main content from `<article>`, `<main>`, or the largest text block, and strip HTML tags to produce plain text

#### Scenario: RSS entry with inline content
- **WHEN** an RSS entry includes full content in the `content:encoded` or `content` field
- **THEN** the system SHALL use that content directly instead of fetching the article URL

#### Scenario: Content extraction failure
- **WHEN** the system cannot extract meaningful content from an article URL (empty body, paywall, etc.)
- **THEN** the system SHALL skip that article and log a warning, but continue processing other articles

### Requirement: Multiple sources per Job
The system SHALL support multiple sources in a single Job and aggregate results from all sources.

#### Scenario: Job with multiple RSS feeds
- **GIVEN** a Job with sources: [{ type: 'rss', url: 'feed1' }, { type: 'rss', url: 'feed2' }]
- **WHEN** the Job executes
- **THEN** the system SHALL fetch all sources concurrently and merge the resulting article lists before filtering

#### Scenario: Mixed source types
- **GIVEN** a Job with sources: [{ type: 'rss', url: '...' }, { type: 'url', url: '...' }]
- **WHEN** the Job executes
- **THEN** the system SHALL handle each source by its type and merge all results

### Requirement: Source fetch timeout
The system SHALL enforce a timeout on all HTTP requests during source fetching.

#### Scenario: Request timeout
- **WHEN** a source fetch or article content fetch exceeds 30 seconds
- **THEN** the system SHALL abort the request and treat it as a fetch failure
