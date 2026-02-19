## ADDED Requirements

### Requirement: Audio segment concatenation
The system SHALL concatenate multiple audio segments into a single podcast MP3 file using ffmpeg.

#### Scenario: Concatenate all segments in order
- **WHEN** all TTS segments have been synthesized
- **THEN** the system SHALL concatenate them in dialogue order (preserving A/B alternation) into a single MP3 file

#### Scenario: Insert silence between segments
- **WHEN** concatenating segments
- **THEN** the system SHALL insert 300-500ms of silence between each segment for natural pacing

#### Scenario: Output format
- **WHEN** the final audio is produced
- **THEN** it SHALL be MP3 format at 128kbps, mono or stereo

#### Scenario: Use VPS /tmp for temporary storage
- **WHEN** processing audio segments
- **THEN** temporary files SHALL be stored in `/tmp/purcast-audio-{podcastId}/` on the VPS

### Requirement: Audio upload to R2
The system SHALL upload the completed podcast audio to Cloudflare R2.

#### Scenario: Upload completed podcast
- **WHEN** audio concatenation is complete
- **THEN** the system SHALL upload the file to R2 at path `podcasts/{podcast_id}.mp3` and update the podcast record with audio_url and duration

#### Scenario: Calculate audio duration
- **WHEN** the audio file is ready
- **THEN** the system SHALL calculate the duration in seconds using ffmpeg probe and store it in the podcasts table

### Requirement: Temporary file cleanup
The system SHALL clean up temporary audio segments after concatenation.

#### Scenario: Clean up temp files
- **WHEN** concatenation completes (success or failure)
- **THEN** all temporary segment files SHALL be deleted from `/tmp/purcast-audio-{podcastId}/`

### Requirement: Audio processing error handling
The system SHALL handle ffmpeg processing errors gracefully.

#### Scenario: ffmpeg available on VPS
- **WHEN** the audio processing module initializes
- **THEN** it SHALL assume system ffmpeg is installed at `/usr/bin/ffmpeg` (installed via `apt install ffmpeg`)

#### Scenario: Concatenation fails
- **WHEN** ffmpeg concatenation fails
- **THEN** the podcast status SHALL be set to 'failed' and temp files SHALL still be cleaned up

### Requirement: VPS synchronous processing
The system SHALL process audio synthesis synchronously on the VPS without timeout limits.

#### Scenario: Long-running synthesis
- **WHEN** a podcast synthesis takes 1-3 minutes
- **THEN** the VPS SHALL process it completely without timeout errors

#### Scenario: Status updates during processing
- **WHEN** synthesis is in progress
- **THEN** the podcast status SHALL be 'generating_audio' and the frontend SHALL poll this status every 3 seconds
