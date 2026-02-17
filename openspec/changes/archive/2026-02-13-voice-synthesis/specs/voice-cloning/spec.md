## ADDED Requirements

### Requirement: Voice clone upload
The system SHALL allow Pro users to upload an audio file (1-3 minutes) for voice cloning.

#### Scenario: Successful voice upload
- **WHEN** a Pro user uploads an audio file (MP3, WAV, or M4A, 1-3 minutes, max 10MB)
- **THEN** the system SHALL upload the file to R2, call ElevenLabs clone API, and store the returned voice_id in the `voices` table

#### Scenario: Audio file too short
- **WHEN** a user uploads an audio file shorter than 30 seconds
- **THEN** the system SHALL reject the upload with message: "音檔至少需要 30 秒"

#### Scenario: Audio file too large
- **WHEN** a user uploads a file exceeding 10MB
- **THEN** the system SHALL reject the upload with message: "檔案大小不可超過 10MB"

#### Scenario: Unsupported format
- **WHEN** a user uploads a non-audio file
- **THEN** the system SHALL reject with message: "僅支援 MP3、WAV、M4A 格式"

### Requirement: Voice clone API integration
The system SHALL integrate with ElevenLabs Add Voice API for voice cloning.

#### Scenario: Clone request sent to ElevenLabs
- **WHEN** voice cloning is initiated
- **THEN** the system SHALL POST to ElevenLabs `/v1/voices/add` with the audio file and voice name

#### Scenario: Clone successful
- **WHEN** ElevenLabs returns a voice_id
- **THEN** the system SHALL save the voice_id, name, and sample_url to the `voices` table

#### Scenario: Clone fails
- **WHEN** ElevenLabs returns an error
- **THEN** the system SHALL display the error to the user and clean up the uploaded file from R2

### Requirement: Voice deletion
The system SHALL allow users to delete their cloned voices.

#### Scenario: Delete voice
- **WHEN** a user deletes a cloned voice
- **THEN** the system SHALL delete the voice from ElevenLabs API, remove the record from `voices` table, and delete the sample file from R2

#### Scenario: Delete non-existent voice on ElevenLabs
- **WHEN** the ElevenLabs deletion fails (voice already removed)
- **THEN** the system SHALL still remove the local record and R2 file without error
