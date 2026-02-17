## ADDED Requirements

### Requirement: Users table
The system SHALL maintain a `users` table storing user account information with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `email` (text, not null, unique)
- `password_hash` (text, nullable — null for OAuth-only users)
- `google_id` (text, nullable, unique — for Google OAuth users)
- `name` (text, nullable)
- `plan` (text, not null, default 'free', enum: 'free' | 'pro')
- `newebpay_customer_id` (text, nullable)
- `subscription_end_date` (timestamptz, nullable — for tracking when Pro expires after cancellation)
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

#### Scenario: User record created on signup
- **WHEN** a new user registers via email/password or Google OAuth
- **THEN** a corresponding row SHALL be inserted into the `users` table with plan='free'

#### Scenario: OAuth user has no password
- **WHEN** a user registers via Google OAuth
- **THEN** the password_hash SHALL be null and google_id SHALL contain the Google user ID

### Requirement: Voices table
The system SHALL maintain a `voices` table storing cloned voice information with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `user_id` (UUID, not null, foreign key → users.id, on delete cascade)
- `elevenlabs_voice_id` (text, not null)
- `name` (text, not null)
- `sample_url` (text, nullable)
- `created_at` (timestamptz, not null, default now())

#### Scenario: Voice record created after cloning
- **WHEN** a user successfully clones their voice via ElevenLabs API
- **THEN** a row SHALL be inserted into `voices` with the returned voice_id, user-provided name, and optional sample audio URL

#### Scenario: Voice records cascade on user deletion
- **WHEN** a user account is deleted
- **THEN** all associated voice records SHALL be automatically deleted

### Requirement: Podcasts table
The system SHALL maintain a `podcasts` table storing generated podcast records with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `user_id` (UUID, not null, foreign key → users.id, on delete cascade)
- `title` (text, not null)
- `source_type` (text, not null, enum: 'text' | 'url')
- `source_content` (text, not null)
- `source_url` (text, nullable)
- `script` (jsonb, nullable)
- `audio_url` (text, nullable)
- `duration` (integer, nullable, in seconds)
- `status` (text, not null, default 'pending', enum: 'pending' | 'generating_script' | 'script_ready' | 'generating_audio' | 'completed' | 'failed')
- `error_message` (text, nullable)
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

#### Scenario: Podcast record created on generation start
- **WHEN** a user submits content for podcast generation
- **THEN** a row SHALL be inserted with status='pending'

#### Scenario: Podcast status progression with script preview
- **WHEN** the generation pipeline progresses
- **THEN** the status SHALL be updated: pending → generating_script → script_ready (user can preview/edit) → generating_audio → completed

#### Scenario: Podcast failure recorded
- **WHEN** any step fails
- **THEN** the status SHALL be set to 'failed' and error_message SHALL contain the failure reason

### Requirement: Usage table
The system SHALL maintain a `usage` table tracking monthly generation counts with the following columns:
- `id` (UUID, primary key, default gen_random_uuid())
- `user_id` (UUID, not null, foreign key → users.id, on delete cascade)
- `month` (text, not null, format: 'YYYY-MM')
- `generation_count` (integer, not null, default 0)
- Unique constraint on (user_id, month)

#### Scenario: Usage record created on first generation of the month
- **WHEN** a user generates their first podcast in a given month
- **THEN** a usage row SHALL be created with generation_count=1

#### Scenario: Usage count incremented on generation
- **WHEN** a user generates a podcast and a usage row already exists
- **THEN** the generation_count SHALL be incremented by 1

### Requirement: Updated_at auto-update trigger
The system SHALL automatically update the `updated_at` column whenever a row in `users` or `podcasts` is modified.

#### Scenario: Timestamp updated on row modification
- **WHEN** any column in a `users` or `podcasts` row is updated
- **THEN** the `updated_at` column SHALL be set to the current timestamp automatically via database trigger
