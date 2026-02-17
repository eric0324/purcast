## ADDED Requirements

### Requirement: Voice list page
The system SHALL provide a voice management page displaying all cloned voices for the current user.

#### Scenario: Display cloned voices
- **WHEN** a user visits the voice management page
- **THEN** the system SHALL display a list of their cloned voices with name, creation date, and a preview play button

#### Scenario: No voices yet
- **WHEN** a user has no cloned voices
- **THEN** the page SHALL display an empty state with a prompt to upload their first voice sample

### Requirement: Voice upload UI
The system SHALL provide a UI for uploading voice samples.

#### Scenario: Upload dialog
- **WHEN** a user clicks "上傳聲音"
- **THEN** a dialog SHALL appear with a file picker (MP3/WAV/M4A), recording guidelines, and an upload button

#### Scenario: Upload progress
- **WHEN** a voice sample is being uploaded and cloned
- **THEN** the UI SHALL show a progress indicator with status text ("上傳中..." → "克隆中..." → "完成")

#### Scenario: Upload success
- **WHEN** voice cloning completes
- **THEN** the new voice SHALL appear in the list and a success toast SHALL be displayed

### Requirement: Voice preview
The system SHALL allow users to preview their cloned voices.

#### Scenario: Play voice sample
- **WHEN** a user clicks the preview button on a voice
- **THEN** the system SHALL play the voice sample audio

### Requirement: Voice deletion UI
The system SHALL allow users to delete cloned voices from the management page.

#### Scenario: Delete confirmation
- **WHEN** a user clicks delete on a voice
- **THEN** a confirmation dialog SHALL appear: "確定要刪除此聲音？此操作無法復原。"

#### Scenario: Delete success
- **WHEN** deletion is confirmed and completes
- **THEN** the voice SHALL be removed from the list and a success toast SHALL be displayed
