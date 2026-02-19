## ADDED Requirements

### Requirement: Jobs table
The system SHALL maintain a `jobs` table storing automated Job configurations with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `user_id` (UUID, not null, foreign key → users.id, on delete cascade)
- `name` (text, not null)
- `status` (text, not null, default 'paused', enum: 'active' | 'paused' | 'error')
- `sources` (jsonb, not null) — array of source configs
- `schedule` (jsonb, not null) — schedule configuration
- `filter_config` (jsonb, not null, default '{}') — keyword and AI filter settings
- `generation_config` (jsonb, not null) — style, voice, max articles, target duration
- `output_config` (jsonb, not null) — array of output channel configs
- `next_run_at` (timestamptz, nullable)
- `last_run_at` (timestamptz, nullable)
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

#### Scenario: Job record created
- **WHEN** a user creates a new automated Job
- **THEN** a row SHALL be inserted into `jobs` with status='paused' and next_run_at calculated from the schedule

#### Scenario: Job records cascade on user deletion
- **WHEN** a user account is deleted
- **THEN** all associated Job records SHALL be automatically deleted

### Requirement: Job runs table
The system SHALL maintain a `job_runs` table tracking each execution of an automated Job with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `job_id` (UUID, not null, foreign key → jobs.id, on delete cascade)
- `status` (text, not null, default 'pending', enum: 'pending' | 'fetching' | 'filtering' | 'generating_script' | 'generating_audio' | 'publishing' | 'completed' | 'failed' | 'skipped')
- `articles_found` (integer, not null, default 0)
- `articles_selected` (integer, not null, default 0)
- `selected_articles` (jsonb, nullable) — array of { title, url, reason }
- `podcast_id` (UUID, nullable, foreign key → podcasts.id, on delete set null)
- `error_message` (text, nullable)
- `started_at` (timestamptz, not null, default now())
- `completed_at` (timestamptz, nullable)

#### Scenario: Job run record created on execution start
- **WHEN** the worker begins executing a Job
- **THEN** a row SHALL be inserted into `job_runs` with status='pending' and started_at=now()

#### Scenario: Job run records cascade on Job deletion
- **WHEN** a Job is deleted
- **THEN** all associated JobRun records SHALL be automatically deleted

### Requirement: Job articles table
The system SHALL maintain a `job_articles` table for deduplication tracking with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `job_id` (UUID, not null, foreign key → jobs.id, on delete cascade)
- `url` (text, not null)
- `title` (text, not null)
- `fetched_at` (timestamptz, not null, default now())
- Unique constraint on (job_id, url)

#### Scenario: Article recorded after processing
- **WHEN** a Job run successfully processes articles
- **THEN** records SHALL be inserted into `job_articles` for each selected article

#### Scenario: Duplicate article prevented
- **WHEN** an article with the same URL has already been recorded for the same Job
- **THEN** the unique constraint SHALL prevent duplicate insertion

#### Scenario: Job articles cascade on Job deletion
- **WHEN** a Job is deleted
- **THEN** all associated JobArticle records SHALL be automatically deleted

## MODIFIED Requirements

### Requirement: Podcasts table
The system SHALL maintain a `podcasts` table storing generated podcast records with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `user_id` (UUID, not null, foreign key → users.id, on delete cascade)
- `title` (text, not null)
- `source_type` (text, not null, enum: 'text' | 'url' | 'job')
- `source_content` (text, not null)
- `source_url` (text, nullable)
- `script` (jsonb, nullable)
- `audio_url` (text, nullable)
- `duration` (integer, nullable, in seconds)
- `status` (text, not null, default 'pending', enum: 'pending' | 'generating_script' | 'script_ready' | 'generating_audio' | 'completed' | 'failed')
- `error_message` (text, nullable)
- `job_run_id` (UUID, nullable, foreign key → job_runs.id, on delete set null)
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

#### Scenario: Podcast record created on generation start
- **WHEN** a user submits content for podcast generation
- **THEN** a row SHALL be inserted with status='pending'

#### Scenario: Podcast created by Job
- **WHEN** a Job run generates a podcast
- **THEN** a row SHALL be inserted with source_type='job', source_content containing aggregated article summaries, and job_run_id referencing the JobRun

#### Scenario: Podcast status progression with script preview
- **WHEN** the generation pipeline progresses
- **THEN** the status SHALL be updated: pending → generating_script → script_ready (user can preview/edit) → generating_audio → completed

#### Scenario: Podcast failure recorded
- **WHEN** any step fails
- **THEN** the status SHALL be set to 'failed' and error_message SHALL contain the failure reason

### Requirement: Updated_at auto-update trigger
The system SHALL automatically update the `updated_at` column whenever a row in `users`, `podcasts`, or `jobs` is modified.

#### Scenario: Timestamp updated on row modification
- **WHEN** any column in a `users`, `podcasts`, or `jobs` row is updated
- **THEN** the `updated_at` column SHALL be set to the current timestamp automatically via database trigger
