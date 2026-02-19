## ADDED Requirements

### Requirement: Create Job API
The system SHALL provide a POST /api/jobs endpoint to create a new automated Job.

#### Scenario: Successful Job creation
- **GIVEN** an authenticated user with valid Job configuration
- **WHEN** the user calls POST /api/jobs with name, sources, schedule, filterConfig, generationConfig, outputConfig
- **THEN** the system SHALL create a Job record with status='paused', calculate next_run_at based on schedule, and return the created Job with HTTP 201

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated user calls POST /api/jobs
- **THEN** the system SHALL return HTTP 401

#### Scenario: Invalid configuration
- **WHEN** the request body is missing required fields (name, sources, schedule, generationConfig)
- **THEN** the system SHALL return HTTP 400 with errorKey describing the validation failure

#### Scenario: No voice configured
- **WHEN** the user creates a Job but generationConfig.voiceId does not reference a voice owned by the user
- **THEN** the system SHALL return HTTP 400 with errorKey `jobs.invalidVoice`

### Requirement: List Jobs API
The system SHALL provide a GET /api/jobs endpoint to list the authenticated user's Jobs.

#### Scenario: List user's Jobs
- **WHEN** an authenticated user calls GET /api/jobs
- **THEN** the system SHALL return all Jobs owned by the user, ordered by created_at DESC, including id, name, status, lastRunAt, nextRunAt

#### Scenario: Empty Job list
- **GIVEN** a user with no Jobs
- **WHEN** the user calls GET /api/jobs
- **THEN** the system SHALL return an empty array

### Requirement: Get Job detail API
The system SHALL provide a GET /api/jobs/[id] endpoint to retrieve a single Job with its recent execution history.

#### Scenario: Get own Job
- **WHEN** an authenticated user calls GET /api/jobs/[id] for a Job they own
- **THEN** the system SHALL return the full Job configuration and the 10 most recent JobRun records

#### Scenario: Get another user's Job
- **WHEN** an authenticated user calls GET /api/jobs/[id] for a Job they do not own
- **THEN** the system SHALL return HTTP 404

### Requirement: Update Job API
The system SHALL provide a PUT /api/jobs/[id] endpoint to update a Job's configuration.

#### Scenario: Update Job configuration
- **GIVEN** an authenticated user who owns the Job
- **WHEN** the user calls PUT /api/jobs/[id] with updated fields
- **THEN** the system SHALL update the Job record, recalculate next_run_at if schedule changed, and return the updated Job

#### Scenario: Update non-owned Job
- **WHEN** an authenticated user calls PUT /api/jobs/[id] for a Job they do not own
- **THEN** the system SHALL return HTTP 404

### Requirement: Activate / Pause Job API
The system SHALL provide a PATCH /api/jobs/[id]/status endpoint to activate or pause a Job.

#### Scenario: Activate a paused Job
- **WHEN** the user calls PATCH /api/jobs/[id]/status with { status: 'active' }
- **THEN** the system SHALL set Job status to 'active', calculate next_run_at from current time, and return the updated Job

#### Scenario: Pause an active Job
- **WHEN** the user calls PATCH /api/jobs/[id]/status with { status: 'paused' }
- **THEN** the system SHALL set Job status to 'paused' and set next_run_at to null

#### Scenario: Activate Job when quota exhausted
- **GIVEN** a free user with generation_count >= 5 for the current month
- **WHEN** the user calls PATCH /api/jobs/[id]/status with { status: 'active' }
- **THEN** the system SHALL return HTTP 403 with errorKey `jobs.quotaExhausted`

### Requirement: Delete Job API
The system SHALL provide a DELETE /api/jobs/[id] endpoint to delete a Job and all associated records.

#### Scenario: Delete own Job
- **WHEN** an authenticated user calls DELETE /api/jobs/[id] for a Job they own
- **THEN** the system SHALL delete the Job, all associated JobRun records, and all associated JobArticle records

#### Scenario: Delete non-owned Job
- **WHEN** an authenticated user calls DELETE /api/jobs/[id] for a Job they do not own
- **THEN** the system SHALL return HTTP 404

### Requirement: Get Job Run detail API
The system SHALL provide a GET /api/jobs/[id]/runs/[runId] endpoint to retrieve a single execution record.

#### Scenario: Get Job Run detail
- **WHEN** the user calls GET /api/jobs/[id]/runs/[runId] for a run belonging to their Job
- **THEN** the system SHALL return the full JobRun record including selectedArticles (with title, url, reason) and linked podcastId

### Requirement: Job Dashboard page
The system SHALL provide a /jobs page displaying all of the user's Jobs in a list view.

#### Scenario: Dashboard displays Job list
- **WHEN** an authenticated user visits /jobs
- **THEN** the system SHALL display a list of Jobs showing name, status (active/paused/error), last run time, next run time, and action buttons (edit, activate/pause, delete)

#### Scenario: Empty state
- **WHEN** an authenticated user with no Jobs visits /jobs
- **THEN** the system SHALL display an empty state with a call-to-action to create a new Job

### Requirement: Create Job page
The system SHALL provide a /jobs/new page with a multi-step wizard to create a new Job.

#### Scenario: Step wizard flow
- **WHEN** a user visits /jobs/new
- **THEN** the system SHALL display a 5-step wizard: (1) Basic info + sources, (2) Schedule + filtering, (3) Script style + voice, (4) Output channels, (5) Review & confirm

#### Scenario: Step validation
- **WHEN** a user attempts to proceed to the next step with invalid or missing data
- **THEN** the system SHALL display inline validation errors and prevent navigation to the next step

#### Scenario: Confirm and create
- **WHEN** the user confirms on the final review step
- **THEN** the system SHALL call POST /api/jobs and redirect to /jobs/[id] on success

### Requirement: Job detail page
The system SHALL provide a /jobs/[id] page displaying Job configuration and execution history.

#### Scenario: Display Job detail
- **WHEN** a user visits /jobs/[id]
- **THEN** the system SHALL display the Job's full configuration (sources, schedule, filters, style, outputs) and a chronological list of recent execution runs with status

#### Scenario: Run entry links to detail
- **WHEN** the user clicks a run entry in the execution history
- **THEN** the system SHALL navigate to /jobs/[id]/runs/[runId]

### Requirement: Edit Job page
The system SHALL provide a /jobs/[id]/edit page to modify an existing Job's configuration.

#### Scenario: Pre-populated form
- **WHEN** a user visits /jobs/[id]/edit
- **THEN** the system SHALL display the same wizard form as /jobs/new, pre-populated with the Job's current configuration

#### Scenario: Save changes
- **WHEN** the user saves changes
- **THEN** the system SHALL call PUT /api/jobs/[id] and redirect to /jobs/[id] on success

### Requirement: Job Run detail page
The system SHALL provide a /jobs/[id]/runs/[runId] page displaying a single execution's details.

#### Scenario: Display run detail
- **WHEN** a user visits /jobs/[id]/runs/[runId]
- **THEN** the system SHALL display: run status, start/end time, articles found vs selected, the list of selected articles (title, URL, AI selection reason), and a link to the generated podcast (if completed)

#### Scenario: Skipped run
- **WHEN** the run has status 'skipped' (no articles passed filtering)
- **THEN** the system SHALL display a message explaining no new content was found

#### Scenario: Failed run
- **WHEN** the run has status 'failed'
- **THEN** the system SHALL display the error message
