## ADDED Requirements

### Requirement: Check usage limit before podcast creation
The system SHALL check the user's monthly usage before allowing podcast creation.

#### Scenario: Free user within limit
- **GIVEN** a user with plan='free' and current month generation_count < 5
- **WHEN** the user creates a podcast
- **THEN** the system SHALL allow creation

#### Scenario: Free user at limit
- **GIVEN** a user with plan='free' and current month generation_count >= 5
- **WHEN** the user attempts to create a podcast
- **THEN** the system SHALL reject with HTTP 403 and errorKey `usage.limitReached`

#### Scenario: Pro user (no limit)
- **GIVEN** a user with plan='pro'
- **WHEN** the user creates a podcast
- **THEN** the system SHALL allow creation regardless of generation_count

#### Scenario: First generation of the month
- **GIVEN** no usage record exists for the current month
- **WHEN** the system checks usage
- **THEN** it SHALL treat generation_count as 0

### Requirement: Increment usage on podcast creation
The system SHALL atomically increment the usage count when a podcast is successfully created.

#### Scenario: Increment existing usage record
- **GIVEN** a usage record exists for (userId, current month)
- **WHEN** a podcast is created
- **THEN** the generation_count SHALL be incremented by 1 within the same transaction

#### Scenario: Create usage record on first generation
- **GIVEN** no usage record exists for (userId, current month)
- **WHEN** a podcast is created
- **THEN** a new usage record SHALL be created with generation_count=1

### Requirement: Usage query API
The system SHALL provide an API to query the current user's usage.

#### Scenario: GET /api/usage returns current usage
- **WHEN** an authenticated user calls GET /api/usage
- **THEN** the system SHALL return `{ used: number, limit: number, plan: string }`

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated user calls GET /api/usage
- **THEN** the system SHALL return HTTP 401

### Requirement: Usage display in UI
The system SHALL display the user's remaining quota in the dashboard.

#### Scenario: Usage shown on create page
- **WHEN** a user visits the create page
- **THEN** the system SHALL display "本月已使用 X / 5 集" (or English equivalent)

#### Scenario: Limit reached prompt
- **WHEN** a user has reached their monthly limit
- **THEN** the create form SHALL be disabled with an upgrade prompt
