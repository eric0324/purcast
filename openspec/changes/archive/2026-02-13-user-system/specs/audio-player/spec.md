## ADDED Requirements

### Requirement: Audio player component
The system SHALL provide a reusable audio player component for podcast playback.

#### Scenario: Play and pause
- **WHEN** a user clicks the play button
- **THEN** the audio SHALL start playing and the button SHALL change to a pause icon
- **WHEN** a user clicks the pause button
- **THEN** the audio SHALL pause and the button SHALL change to a play icon

#### Scenario: Progress bar
- **WHEN** audio is playing
- **THEN** a progress bar SHALL display the current position relative to total duration, and the user SHALL be able to click/drag to seek

#### Scenario: Time display
- **WHEN** the player is active
- **THEN** the current time and total duration SHALL be displayed in MM:SS format

#### Scenario: Volume control
- **WHEN** a user adjusts the volume slider
- **THEN** the audio volume SHALL change accordingly (0-100%)

### Requirement: Player state management
The system SHALL manage player state across page navigation.

#### Scenario: Audio continues on navigation
- **WHEN** a user navigates to a different page while audio is playing
- **THEN** the audio playback SHALL continue (persistent mini-player at bottom)

#### Scenario: Only one audio at a time
- **WHEN** a user plays a different podcast while one is already playing
- **THEN** the previous audio SHALL stop and the new one SHALL start playing
