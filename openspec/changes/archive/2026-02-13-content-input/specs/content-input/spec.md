## ADDED Requirements

### Requirement: Content input form
The system SHALL provide a UI form allowing users to choose between text paste and URL extraction modes.

#### Scenario: User pastes text content
- **WHEN** a user selects "Paste Text" mode and enters text into the textarea
- **THEN** the form SHALL accept text content up to 50,000 characters and display a real-time character count

#### Scenario: User inputs URL
- **WHEN** a user selects "URL" mode and enters a URL
- **THEN** the form SHALL validate the URL format (http:// or https://) and enable the "Extract" button only when valid

#### Scenario: User switches between input modes
- **WHEN** a user switches modes and existing content is not empty
- **THEN** a confirmation dialog SHALL appear before clearing the content

### Requirement: Content validation
The system SHALL validate content before proceeding to the next step.

#### Scenario: Text content exceeds character limit
- **WHEN** a user pastes text exceeding 50,000 characters
- **THEN** the content SHALL be automatically truncated and a warning message SHALL be displayed

#### Scenario: Text content too short
- **WHEN** the user attempts to proceed with fewer than 100 characters
- **THEN** the "Next" button SHALL remain disabled with a hint message

#### Scenario: URL format is invalid
- **WHEN** the user enters a URL not starting with http:// or https://
- **THEN** the "Extract" button SHALL remain disabled with an error message

### Requirement: Content preprocessing
The system SHALL clean and normalize content before saving.

#### Scenario: HTML tags stripped from pasted text
- **WHEN** a user pastes text containing HTML tags
- **THEN** all HTML tags SHALL be stripped, leaving only plain text

#### Scenario: Whitespace normalized
- **WHEN** content contains multiple consecutive newlines or spaces
- **THEN** consecutive newlines SHALL be reduced to maximum 2, and consecutive spaces to 1

### Requirement: Content saved to database
The system SHALL save validated content to the `podcasts` table.

#### Scenario: Text content saved
- **WHEN** a user proceeds with pasted text
- **THEN** a row SHALL be inserted with source_type='text', source_content=cleaned_text, source_url=null

#### Scenario: URL content saved
- **WHEN** a user proceeds with extracted URL content
- **THEN** a row SHALL be inserted with source_type='url', source_content=extracted_text, source_url=original_url
