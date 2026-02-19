## ADDED Requirements

### Requirement: R2 bucket configuration
The system SHALL use a Cloudflare R2 bucket named `purcast-audio` for storing all generated podcast audio files and voice clone samples.

#### Scenario: Bucket accessible via S3-compatible API
- **WHEN** the application connects to R2
- **THEN** it SHALL use S3-compatible SDK (`@aws-sdk/client-s3`) with R2 endpoint, access key, and secret key from environment variables

#### Scenario: Required environment variables
- **WHEN** the application initializes the R2 client
- **THEN** it SHALL read `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` from environment variables

### Requirement: Audio file upload utility
The system SHALL provide a utility function to upload audio files to R2 and return a public URL.

#### Scenario: Upload podcast audio
- **WHEN** a completed podcast audio file (MP3) is ready for storage
- **THEN** the system SHALL upload the file to R2 under the path `podcasts/{podcast_id}.mp3` and return the public access URL

#### Scenario: Upload voice sample
- **WHEN** a user uploads a voice sample for cloning
- **THEN** the system SHALL upload the file to R2 under the path `voice-samples/{user_id}/{filename}` and return the public access URL

### Requirement: Audio file download/streaming URL
The system SHALL provide a utility function to generate accessible URLs for stored audio files.

#### Scenario: Generate public URL for podcast playback
- **WHEN** the application needs to serve a podcast audio file to the user
- **THEN** it SHALL generate a public URL via the R2 bucket's public access domain

### Requirement: File deletion utility
The system SHALL provide a utility function to delete files from R2.

#### Scenario: Delete audio file when podcast is deleted
- **WHEN** a user deletes a podcast or a voice sample
- **THEN** the corresponding file in R2 SHALL be deleted to free storage space

#### Scenario: Handle deletion of non-existent file
- **WHEN** a deletion is requested for a file that does not exist in R2
- **THEN** the system SHALL handle the error gracefully without throwing an exception
