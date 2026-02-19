## ADDED Requirements

### Requirement: Worker process with periodic DB scan
The system SHALL run a separate worker process (managed by PM2) that scans the database every minute for due Jobs.

#### Scenario: Worker startup
- **WHEN** the worker process starts
- **THEN** it SHALL register a node-cron job that runs every minute (`* * * * *`) to call checkDueJobs()

#### Scenario: Check due Jobs
- **WHEN** checkDueJobs() executes
- **THEN** the system SHALL query for Jobs WHERE status = 'active' AND next_run_at <= NOW()

#### Scenario: No due Jobs
- **WHEN** checkDueJobs() finds no Jobs matching the criteria
- **THEN** the system SHALL do nothing and wait for the next tick

#### Scenario: Worker restart recovery
- **WHEN** the worker process restarts after a crash
- **THEN** it SHALL immediately pick up any overdue Jobs (next_run_at in the past) on the first scan

### Requirement: Job execution pipeline
The system SHALL execute each due Job through a sequential pipeline: fetch → filter → generate script → synthesize audio → upload → publish → record.

#### Scenario: Successful full pipeline
- **WHEN** a Job is due for execution
- **THEN** the system SHALL create a JobRun with status='pending', then progress through: fetching → filtering → generating_script → generating_audio → publishing → completed, updating the JobRun status at each step

#### Scenario: Pipeline failure
- **WHEN** any step in the pipeline throws an error
- **THEN** the system SHALL set the JobRun status to 'failed', record the error message, and still update next_run_at so the Job runs again at the next scheduled time

#### Scenario: Skipped run (no content)
- **WHEN** the filtering step returns zero articles
- **THEN** the system SHALL set the JobRun status to 'skipped' and update next_run_at

### Requirement: Schedule configuration
The system SHALL support daily and weekly schedule modes with timezone-aware execution.

#### Scenario: Daily schedule
- **GIVEN** a Job with schedule = { mode: 'daily', time: '08:00', timezone: 'Asia/Taipei' }
- **WHEN** calculating next_run_at
- **THEN** the system SHALL set next_run_at to the next occurrence of 08:00 in the Asia/Taipei timezone

#### Scenario: Weekly schedule
- **GIVEN** a Job with schedule = { mode: 'weekly', time: '09:00', timezone: 'Asia/Taipei', weekday: 1 }
- **WHEN** calculating next_run_at
- **THEN** the system SHALL set next_run_at to the next Monday at 09:00 in the Asia/Taipei timezone

#### Scenario: next_run_at after execution
- **WHEN** a Job run completes (regardless of success, failure, or skip)
- **THEN** the system SHALL calculate and update next_run_at based on the Job's schedule configuration

### Requirement: Aggregated script generation
The system SHALL generate a single podcast script from multiple articles using the LLM module.

#### Scenario: Generate aggregated script
- **GIVEN** selected articles and generationConfig with stylePreset and optional customPrompt
- **WHEN** the pipeline reaches the script generation step
- **THEN** the system SHALL call the LLM with all selected articles' content, the style preset prompt, and any custom prompt to produce a single DialogueScript with transitions between topics

#### Scenario: Style preset applied
- **GIVEN** generationConfig.stylePreset = 'casual_chat'
- **WHEN** generating the aggregated script
- **THEN** the system SHALL include the corresponding style system prompt (e.g., conversational tone, informal language, humor)

#### Scenario: Custom prompt appended
- **GIVEN** generationConfig.customPrompt = '每集開頭用一句話總結今天的主題'
- **WHEN** generating the aggregated script
- **THEN** the system SHALL append the custom prompt to the style prompt as additional instructions

#### Scenario: Target duration
- **GIVEN** generationConfig.targetMinutes = 15
- **WHEN** generating the script
- **THEN** the system SHALL instruct the LLM to produce approximately 15 minutes of dialogue content (roughly 2000-2500 words for 15 minutes)

### Requirement: Audio synthesis and upload
The system SHALL synthesize the generated script to audio and upload to R2, reusing the existing TTS and storage modules.

#### Scenario: Synthesize and upload
- **WHEN** the pipeline reaches the audio synthesis step
- **THEN** the system SHALL call synthesizeScript() with the dialogue and voice IDs, concatenate audio segments with ffmpeg, upload the final MP3 to R2, and create a Podcast record with source_type='job'

### Requirement: Concurrent Job execution guard
The system SHALL prevent a Job from running concurrently with itself.

#### Scenario: Job already running
- **GIVEN** a Job that is currently being executed (has an in-progress JobRun)
- **WHEN** checkDueJobs() finds this Job is due
- **THEN** the system SHALL skip this Job for the current tick and not create a new JobRun

### Requirement: Quota check before Job execution
The system SHALL verify the user has sufficient quota before executing a Job.

#### Scenario: Sufficient quota
- **GIVEN** a user with remaining quota
- **WHEN** a Job owned by that user is due
- **THEN** the system SHALL proceed with execution

#### Scenario: Quota exhausted
- **GIVEN** a free user with generation_count >= 5 for the current month
- **WHEN** a Job owned by that user is due
- **THEN** the system SHALL set the Job status to 'paused', create a JobRun with status='failed' and errorMessage='quota_exhausted', and NOT execute the pipeline

#### Scenario: Pro user unlimited
- **GIVEN** a user with plan='pro'
- **WHEN** a Job is due
- **THEN** the system SHALL proceed with execution regardless of generation_count

### Requirement: Record processed articles
The system SHALL record all articles that were selected and processed in a Job run for deduplication.

#### Scenario: Record after successful pipeline
- **WHEN** a Job run completes with status='completed'
- **THEN** the system SHALL insert records into job_articles for each selected article (jobId, url, title, fetchedAt)

#### Scenario: Record after skipped pipeline
- **WHEN** a Job run completes with status='skipped'
- **THEN** the system SHALL NOT insert any job_articles records
