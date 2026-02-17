## ADDED Requirements

### Requirement: LLM Provider interface
The system SHALL define a provider-agnostic interface for LLM interactions.

#### Scenario: Interface contract
- **WHEN** any module needs to call an LLM
- **THEN** it SHALL use the `LLMProvider` interface with method `generateScript(content: string, options: ScriptOptions): Promise<DialogueScript>`

#### Scenario: Provider factory
- **WHEN** the application initializes an LLM provider
- **THEN** it SHALL use a factory function `createLLMProvider(type: string)` that returns the appropriate provider implementation

### Requirement: Claude provider implementation
The system SHALL implement the `LLMProvider` interface for Claude API.

#### Scenario: Claude API call
- **WHEN** `generateScript` is called on the Claude provider
- **THEN** it SHALL call the Claude API using `@anthropic-ai/sdk` with model `claude-sonnet-4-5-20250929` and JSON mode enabled

#### Scenario: Required environment variable
- **WHEN** the Claude provider initializes
- **THEN** it SHALL read `ANTHROPIC_API_KEY` from environment variables

#### Scenario: API error handling
- **WHEN** the Claude API returns an error (rate limit, server error)
- **THEN** the provider SHALL throw a typed error with the error category and message

### Requirement: Script generation prompt
The system SHALL use a well-structured prompt for dialogue generation.

#### Scenario: System prompt defines format
- **WHEN** calling the Claude API
- **THEN** the system prompt SHALL define the two-host podcast format, JSON output structure, and dialogue style requirements

#### Scenario: User prompt includes content
- **WHEN** calling the Claude API
- **THEN** the user prompt SHALL include the source content and any user-specified options (target length)

#### Scenario: Chinese and English content support
- **WHEN** the source content is in Chinese
- **THEN** the generated dialogue SHALL be in Chinese
- **WHEN** the source content is in English
- **THEN** the generated dialogue SHALL be in English
