## ADDED Requirements

### Requirement: Voice Clone restricted to Pro users
The system SHALL restrict Voice Clone functionality to users with plan='pro'.

#### Scenario: Free user attempts to clone voice
- **GIVEN** a user with plan='free'
- **WHEN** the user calls POST /api/voices
- **THEN** the system SHALL return HTTP 403 with errorKey `feature.proOnly`

#### Scenario: Free user attempts to delete voice
- **GIVEN** a user with plan='free'
- **WHEN** the user calls DELETE /api/voices/[id]
- **THEN** the system SHALL return HTTP 403 with errorKey `feature.proOnly`

#### Scenario: Pro user can clone voice
- **GIVEN** a user with plan='pro'
- **WHEN** the user calls POST /api/voices
- **THEN** the system SHALL allow the operation

### Requirement: Voice Clone UI gating
The system SHALL show a locked state for Voice Clone when the user is on the Free plan.

#### Scenario: Free user visits Voices page
- **WHEN** a Free user visits the Voices page
- **THEN** the system SHALL display a locked message with upgrade prompt instead of the voice management UI

#### Scenario: Pro user visits Voices page
- **WHEN** a Pro user visits the Voices page
- **THEN** the system SHALL display the normal voice management UI
