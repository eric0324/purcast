## ADDED Requirements

### Requirement: Script generation API endpoint
The system SHALL provide an API route at `/api/generate-script` that accepts a podcast ID and generates a dual-host dialogue script.

#### Scenario: Successful script generation
- **WHEN** the API receives a POST request with a valid podcast ID
- **THEN** it SHALL fetch the source content from the podcasts table, generate a dialogue script via Claude API, and save the script to the `script` column

#### Scenario: Podcast not found
- **WHEN** the API receives a podcast ID that does not exist or belongs to another user
- **THEN** the API SHALL return a 404 error

#### Scenario: Podcast already has a script
- **WHEN** the API receives a podcast ID that already has a completed script
- **THEN** the API SHALL return the existing script without regenerating

#### Scenario: Language auto-detection
- **WHEN** a script is generated
- **THEN** the system SHALL automatically detect the content language and generate dialogue in the same language (Chinese/English)

### Requirement: Dual-host dialogue format
The system SHALL generate scripts in a structured JSON format with two speakers (A and B).

#### Scenario: Script output structure
- **WHEN** a script is generated
- **THEN** it SHALL be a JSON array where each element contains `speaker` ("A" or "B") and `text` (the dialogue line)

#### Scenario: Dialogue characteristics
- **WHEN** a script is generated
- **THEN** Host A SHALL act as the lead host (introducing topics, asking questions) and Host B SHALL act as the co-host (responding, adding insights, providing different perspectives)

#### Scenario: Natural conversation flow
- **WHEN** a script is generated
- **THEN** the dialogue SHALL include natural elements: greetings, transitions, follow-up questions, agreements/disagreements, and a closing summary

### Requirement: Script length control
The system SHALL control the generated script length to target 8-12 minutes of spoken content.

#### Scenario: Target length achieved
- **WHEN** a script is generated with default settings
- **THEN** the script SHALL contain 25-35 dialogue turns, targeting approximately 1,500-2,200 characters of spoken text

#### Scenario: Script too short
- **WHEN** the source content is very short (under 500 characters)
- **THEN** the system SHALL still generate a minimum of 15 dialogue turns, expanding on the topic with relevant discussion

### Requirement: Script status tracking
The system SHALL update the podcast status during script generation.

#### Scenario: Status updated to generating
- **WHEN** script generation begins
- **THEN** the podcast status SHALL be updated to 'generating_script'

#### Scenario: Status updated on completion
- **WHEN** script generation completes successfully
- **THEN** the podcast status SHALL be updated to 'script_ready' (ready for user preview/edit) and the script SHALL be saved

#### Scenario: Status updated on failure
- **WHEN** script generation fails
- **THEN** the podcast status SHALL be updated to 'failed' with the error message

### Requirement: Script preview and edit
The system SHALL allow users to preview and edit the generated script before synthesizing audio.

#### Scenario: Preview page displays script
- **WHEN** a user navigates to `/create/[id]/edit` and the podcast status is 'script_ready'
- **THEN** the system SHALL display all dialogue lines in order with speaker labels (A/B) and editable text fields

#### Scenario: User edits dialogue text
- **WHEN** a user modifies dialogue text and clicks "確認並生成語音"
- **THEN** the system SHALL save the updated script to the database and update status to 'generating_audio'

#### Scenario: Character limit per dialogue
- **WHEN** a user edits a dialogue line
- **THEN** the system SHALL enforce a maximum of 500 characters per line to prevent TTS issues

### Requirement: Retry logic
The system SHALL retry script generation on transient failures.

#### Scenario: JSON parse failure triggers retry
- **WHEN** the LLM returns invalid JSON
- **THEN** the system SHALL retry up to 2 times before failing

#### Scenario: API timeout triggers retry
- **WHEN** the Claude API request times out (> 60 seconds)
- **THEN** the system SHALL retry once before failing
