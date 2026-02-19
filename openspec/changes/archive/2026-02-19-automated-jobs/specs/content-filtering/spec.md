## ADDED Requirements

### Requirement: Keyword-based filtering
The system SHALL filter articles using keyword rules without consuming LLM quota.

#### Scenario: Include keywords match
- **GIVEN** a Job with filterConfig.includeKeywords = ['AI', 'LLM']
- **WHEN** filtering articles
- **THEN** the system SHALL only keep articles whose title or content contains at least one of the include keywords (case-insensitive)

#### Scenario: Exclude keywords match
- **GIVEN** a Job with filterConfig.excludeKeywords = ['廣告', 'sponsored']
- **WHEN** filtering articles
- **THEN** the system SHALL remove articles whose title or content contains any of the exclude keywords (case-insensitive)

#### Scenario: No keywords configured
- **GIVEN** a Job with empty includeKeywords and excludeKeywords
- **WHEN** filtering articles
- **THEN** the system SHALL pass all articles through without keyword filtering

#### Scenario: Include and exclude both configured
- **WHEN** both includeKeywords and excludeKeywords are set
- **THEN** the system SHALL first apply include filter, then apply exclude filter on the remaining articles

### Requirement: Article deduplication
The system SHALL prevent the same article from being processed twice by the same Job.

#### Scenario: Previously processed article
- **GIVEN** a Job that has already processed an article with URL 'https://example.com/post-1'
- **WHEN** the same URL appears in a new fetch
- **THEN** the system SHALL exclude it from the current run's article list

#### Scenario: Deduplication by URL
- **WHEN** checking for duplicates
- **THEN** the system SHALL match articles by their canonical URL against the job_articles table for that Job

#### Scenario: Same article from different sources
- **GIVEN** a Job with two sources that both return the same article URL
- **WHEN** merging results from multiple sources
- **THEN** the system SHALL deduplicate by URL and keep only one copy

### Requirement: AI-powered article filtering and ranking
The system SHALL use LLM to filter and rank articles based on the user's interest description, consuming quota.

#### Scenario: AI filtering with prompt
- **GIVEN** a Job with filterConfig.aiPrompt = '我關注 AI 產品落地應用，不關心純學術論文'
- **WHEN** the system has articles remaining after keyword filtering and deduplication
- **THEN** the system SHALL send article titles and summaries (first 200 chars) to the LLM, along with the aiPrompt, and receive a ranked list with selection reasons

#### Scenario: AI selects top N articles
- **GIVEN** a Job with generationConfig.maxArticles = 5
- **WHEN** AI filtering returns ranked results
- **THEN** the system SHALL select the top N articles (where N = maxArticles) and record the AI's reason for each selection

#### Scenario: No AI prompt configured
- **GIVEN** a Job with filterConfig.aiPrompt = null or empty
- **WHEN** filtering articles
- **THEN** the system SHALL skip AI filtering and pass keyword-filtered articles directly, limited to maxArticles by most recent publishedAt

#### Scenario: AI filtering quota consumption
- **WHEN** AI filtering is performed
- **THEN** the system SHALL count it as part of the Job run's quota consumption (included in the single generation count for the run)

### Requirement: Filtering pipeline order
The system SHALL execute filtering in a fixed order: keyword filter → deduplication → AI filter.

#### Scenario: Pipeline execution order
- **WHEN** a Job run processes fetched articles
- **THEN** the system SHALL first apply keyword filtering, then deduplicate against job_articles, then (if configured) apply AI filtering on the remaining articles

#### Scenario: No articles after filtering
- **WHEN** zero articles remain after the full filtering pipeline
- **THEN** the system SHALL create a JobRun with status='skipped' and not proceed to script generation
