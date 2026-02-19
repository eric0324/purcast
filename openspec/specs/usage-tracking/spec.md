## MODIFIED Requirements

### Requirement: Check usage limit before podcast creation
The system SHALL check the user's monthly usage before allowing podcast creation, including automated Job executions.

#### Scenario: Free user within limit
- **GIVEN** a user with plan='free' and current month generation_count < 5
- **WHEN** the user creates a podcast (manually or via Job)
- **THEN** the system SHALL allow creation

#### Scenario: Free user at limit
- **GIVEN** a user with plan='free' and current month generation_count >= 5
- **WHEN** the user attempts to create a podcast (manually or via Job)
- **THEN** the system SHALL reject with HTTP 403 and errorKey `usage.limitReached`

#### Scenario: Pro user (no limit)
- **GIVEN** a user with plan='pro'
- **WHEN** the user creates a podcast (manually or via Job)
- **THEN** the system SHALL allow creation regardless of generation_count

#### Scenario: First generation of the month
- **GIVEN** no usage record exists for the current month
- **WHEN** the system checks usage
- **THEN** it SHALL treat generation_count as 0

### Requirement: Increment usage on podcast creation
The system SHALL atomically increment the usage count when a podcast is successfully created, whether manually or via automated Job.

#### Scenario: Increment existing usage record
- **GIVEN** a usage record exists for (userId, current month)
- **WHEN** a podcast is created (manually or via Job)
- **THEN** the generation_count SHALL be incremented by 1 within the same transaction

#### Scenario: Create usage record on first generation
- **GIVEN** no usage record exists for (userId, current month)
- **WHEN** a podcast is created (manually or via Job)
- **THEN** a new usage record SHALL be created with generation_count=1

## ADDED Requirements

### Requirement: Auto-pause Jobs on quota exhaustion
The system SHALL automatically pause all active Jobs for a user when their monthly quota is exhausted.

#### Scenario: Quota exhausted during Job run
- **GIVEN** a free user whose generation_count reaches 5 after a Job run completes
- **WHEN** the same user has other active Jobs
- **THEN** the system SHALL set those Jobs' status to 'paused' (they will be checked at next execution time anyway, but proactive pause provides better UX)

#### Scenario: Job encounters quota limit
- **GIVEN** a free user with generation_count >= 5
- **WHEN** the worker attempts to execute a Job for that user
- **THEN** the system SHALL skip execution, create a JobRun with status='failed' and errorMessage='quota_exhausted', and set the Job status to 'paused'

### Requirement: Usage display includes Job consumption
The system SHALL indicate Job-generated usage in the usage display.

#### Scenario: Usage shown with Job breakdown
- **WHEN** a user visits the usage display (create page or Jobs dashboard)
- **THEN** the system SHALL display total usage including both manual and Job-generated podcasts (e.g., "本月已使用 3 / 5 集（手動 1 + 自動 2）")
