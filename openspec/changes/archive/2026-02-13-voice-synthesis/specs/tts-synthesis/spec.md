## ADDED Requirements

### Requirement: TTS Provider interface
The system SHALL define a provider-agnostic interface for TTS operations.

#### Scenario: Interface contract
- **WHEN** any module needs TTS synthesis
- **THEN** it SHALL use the `TTSProvider` interface with `synthesize(text, voiceId): Promise<Buffer>` and `cloneVoice(audioFile, name): Promise<string>`

#### Scenario: Provider factory
- **WHEN** the application initializes a TTS provider
- **THEN** it SHALL use `createTTSProvider()` factory function, defaulting to ElevenLabs

### Requirement: ElevenLabs TTS synthesis
The system SHALL use ElevenLabs Flash API for text-to-speech conversion.

#### Scenario: Synthesize single segment
- **WHEN** `synthesize(text, voiceId)` is called
- **THEN** the system SHALL POST to ElevenLabs `/v1/text-to-speech/{voiceId}` and return the audio buffer in MP3 format

#### Scenario: Host A uses cloned voice (Pro user)
- **WHEN** synthesizing Host A segments for a Pro user with a cloned voice
- **THEN** the system SHALL use the user's cloned voice_id from the `voices` table

#### Scenario: Host A uses default voice (Free user)
- **WHEN** synthesizing Host A segments for a Free user
- **THEN** the system SHALL use a pre-configured default voice_id for Host A

#### Scenario: Host B always uses default voice
- **WHEN** synthesizing Host B segments
- **THEN** the system SHALL always use a pre-configured default voice_id for Host B

### Requirement: Batch segment synthesis
The system SHALL synthesize all dialogue segments with controlled concurrency.

#### Scenario: Parallel synthesis with concurrency limit
- **WHEN** a script with N segments needs to be synthesized
- **THEN** the system SHALL process segments in parallel with a maximum concurrency of 3

#### Scenario: Segment synthesis failure
- **WHEN** a single segment fails to synthesize after 2 retries
- **THEN** the entire podcast generation SHALL be marked as failed with the error details

### Requirement: Required environment variables
The system SHALL require ElevenLabs configuration via environment variables.

#### Scenario: Environment variable check
- **WHEN** the TTS provider initializes
- **THEN** it SHALL read `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_A`, and `ELEVENLABS_DEFAULT_VOICE_B` from environment variables
