## ADDED Requirements

### Requirement: URL extraction API endpoint
The system SHALL provide an API route at `/api/extract` accepting POST requests with a URL parameter.

#### Scenario: Successful URL extraction
- **WHEN** the API receives a POST request with a valid URL
- **THEN** it SHALL fetch the HTML, parse with @mozilla/readability, and return `{ title, content, url, truncated }`

#### Scenario: URL extraction timeout
- **WHEN** fetching the URL takes longer than 10 seconds
- **THEN** the API SHALL abort and return a 408 error

#### Scenario: URL returns non-2xx status
- **WHEN** the URL returns 404, 403, or 500
- **THEN** the API SHALL return a 400 error with the HTTP status code in the message

### Requirement: Readability parsing
The system SHALL use @mozilla/readability to extract the main content from HTML.

#### Scenario: Readability successfully parses article
- **WHEN** the HTML contains a valid article structure
- **THEN** Readability SHALL extract title, byline, and text content, excluding navigation, ads, and sidebars

#### Scenario: Readability fails to parse
- **WHEN** the HTML does not contain a recognizable article structure
- **THEN** the API SHALL return a 422 error

#### Scenario: Extracted content exceeds limit
- **WHEN** extracted content exceeds 50,000 characters
- **THEN** the content SHALL be truncated and the response SHALL include `truncated: true`

### Requirement: HTML content cleaning
The system SHALL clean extracted HTML content.

#### Scenario: Remove all HTML tags
- **WHEN** Readability returns content with HTML tags
- **THEN** all tags SHALL be stripped, retaining only plain text

#### Scenario: Decode HTML entities
- **WHEN** content contains HTML entities (e.g., &amp;, &quot;)
- **THEN** all entities SHALL be decoded to corresponding characters

### Requirement: Error handling
The system SHALL provide clear error messages for all failure scenarios.

#### Scenario: Network error
- **WHEN** the URL cannot be reached
- **THEN** the API SHALL return a 500 error with a network error message

#### Scenario: HTML size exceeds limit
- **WHEN** the fetched HTML exceeds 2MB
- **THEN** the API SHALL return a 413 error
