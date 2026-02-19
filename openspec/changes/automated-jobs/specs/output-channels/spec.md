## ADDED Requirements

### Requirement: Telegram Bot binding
The system SHALL provide a PurCast Telegram Bot that users can bind to their account via a verification code.

#### Scenario: Generate verification code
- **WHEN** a user clicks "Connect Telegram" in the Job output settings
- **THEN** the system SHALL generate a one-time 6-digit verification code (valid for 10 minutes) and display it along with the PurCast Bot link (t.me/PurCastBot)

#### Scenario: User sends code to Bot
- **WHEN** a user sends the verification code to the PurCast Telegram Bot
- **THEN** the Bot SHALL verify the code, bind the user's chat_id to their PurCast account, and reply with a confirmation message

#### Scenario: Invalid or expired code
- **WHEN** a user sends an invalid or expired code to the Bot
- **THEN** the Bot SHALL reply with an error message asking the user to generate a new code

#### Scenario: Bot ignores non-code messages
- **WHEN** the Bot receives a message that does not match the verification code format
- **THEN** the Bot SHALL reply with a brief help message explaining how to bind

### Requirement: Telegram Bot webhook
The system SHALL expose a POST /api/telegram/webhook endpoint to receive Telegram Bot updates.

#### Scenario: Webhook receives message
- **WHEN** Telegram sends an update to the webhook
- **THEN** the system SHALL process the message to check for verification codes

#### Scenario: Webhook signature verification
- **WHEN** a request arrives at the webhook endpoint
- **THEN** the system SHALL verify the request originates from Telegram (via secret token header)

### Requirement: Telegram message delivery
The system SHALL push podcast notifications to bound Telegram chats.

#### Scenario: Deliver audio format
- **GIVEN** an output config with type='telegram' and format='audio'
- **WHEN** a Job run completes successfully
- **THEN** the system SHALL send the MP3 audio file with the podcast title as caption to the bound Telegram chat

#### Scenario: Deliver link format
- **GIVEN** an output config with type='telegram' and format='link'
- **WHEN** a Job run completes successfully
- **THEN** the system SHALL send a text message with the podcast title, a brief summary, and a playback URL

#### Scenario: Deliver both format
- **GIVEN** an output config with type='telegram' and format='both'
- **WHEN** a Job run completes successfully
- **THEN** the system SHALL send a text message (title + summary + URL) followed by the audio file

#### Scenario: Telegram delivery failure
- **WHEN** the Telegram API returns an error (chat not found, bot blocked, etc.)
- **THEN** the system SHALL log the error in the JobRun record but NOT fail the entire run (the podcast is still generated and stored)

### Requirement: LINE OA configuration
The system SHALL allow users to configure their own LINE Official Account for message delivery.

#### Scenario: Save LINE configuration
- **WHEN** a user configures a LINE output channel with a Channel Access Token
- **THEN** the system SHALL store the encrypted token in the Job's outputConfig

#### Scenario: LINE webhook setup
- **WHEN** a user adds a LINE output channel
- **THEN** the system SHALL display the PurCast webhook URL (POST /api/line/webhook/[jobId]) for the user to configure in their LINE Developers Console

### Requirement: LINE webhook for user binding
The system SHALL expose a POST /api/line/webhook/[jobId] endpoint to receive LINE events and capture user IDs.

#### Scenario: Follow event received
- **WHEN** a LINE user adds the OA as a friend (follow event)
- **THEN** the system SHALL store the LINE user ID associated with the Job for future push messages

#### Scenario: Webhook signature verification
- **WHEN** a request arrives at the LINE webhook endpoint
- **THEN** the system SHALL verify the X-Line-Signature header using the Channel Secret

### Requirement: LINE message delivery
The system SHALL push podcast notifications to LINE users via the Messaging API.

#### Scenario: Deliver audio format
- **GIVEN** an output config with type='line' and format='audio'
- **WHEN** a Job run completes successfully
- **THEN** the system SHALL send an audio message using the R2 public URL (LINE requires HTTPS URL for audio, duration in ms)

#### Scenario: Deliver link format
- **GIVEN** an output config with type='line' and format='link'
- **WHEN** a Job run completes successfully
- **THEN** the system SHALL send a text message with podcast title, summary, and playback URL

#### Scenario: Deliver both format
- **GIVEN** an output config with type='line' and format='both'
- **WHEN** a Job run completes successfully
- **THEN** the system SHALL send a text message followed by an audio message

#### Scenario: LINE delivery failure
- **WHEN** the LINE API returns an error (invalid token, user blocked OA, etc.)
- **THEN** the system SHALL log the error in the JobRun record but NOT fail the entire run

#### Scenario: LINE token invalid
- **WHEN** the LINE API returns 401 (invalid or expired token)
- **THEN** the system SHALL log the error and mark the LINE output channel as requiring re-configuration (but NOT pause the entire Job)

### Requirement: Output channel execution
The system SHALL attempt delivery to all configured output channels for a Job run.

#### Scenario: Multiple output channels
- **GIVEN** a Job with outputs: [{ type: 'telegram', ... }, { type: 'line', ... }]
- **WHEN** a Job run completes
- **THEN** the system SHALL attempt delivery to all channels, recording success/failure for each independently

#### Scenario: Partial delivery failure
- **WHEN** one output channel fails but others succeed
- **THEN** the system SHALL still mark the JobRun as 'completed' (delivery failures are logged but not fatal)
