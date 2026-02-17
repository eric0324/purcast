## ADDED Requirements

### Requirement: Usage count tracking
The system SHALL track the number of podcasts generated per user per month.

#### Scenario: First generation of the month
- **WHEN** a user generates their first podcast in a calendar month
- **THEN** a usage record SHALL be created with generation_count=1 for that user and month (YYYY-MM)

#### Scenario: Subsequent generations
- **WHEN** a user generates another podcast in the same month
- **THEN** the generation_count SHALL be atomically incremented by 1

### Requirement: Usage limit enforcement
The system SHALL enforce monthly generation limits based on the user's plan.

#### Scenario: Free user within limit
- **WHEN** a Free user has generated fewer than 2 podcasts this month
- **THEN** the system SHALL allow the generation to proceed

#### Scenario: Free user at limit
- **WHEN** a Free user has reached 2 generations this month
- **THEN** the system SHALL block the generation and display "本月免費額度已用完,升級 Pro 獲得更多額度"

#### Scenario: Pro user within limit
- **WHEN** a Pro user has generated fewer than 15 podcasts this month
- **THEN** the system SHALL allow the generation to proceed

#### Scenario: Pro user at limit
- **WHEN** a Pro user has reached 15 generations this month
- **THEN** the system SHALL block the generation and display "本月額度已用完，下個月重置"

#### Scenario: Cancelled Pro user within grace period
- **WHEN** a user with plan='pro' and subscription_end_date in the future has generated fewer than 15 podcasts
- **THEN** the system SHALL allow the generation (still counts as Pro user until end date)

#### Scenario: Cancelled Pro user after grace period
- **WHEN** a user with subscription_end_date in the past attempts to generate
- **THEN** the system SHALL enforce Free tier limits (2 generations) and prompt to renew

### Requirement: Usage display
The system SHALL display current usage to the user.

#### Scenario: Show remaining quota
- **WHEN** a user views the dashboard or generation page
- **THEN** the system SHALL display "本月已使用 X / Y 集" where Y is the plan limit

#### Scenario: Show quota for cancelled subscription
- **WHEN** a user with subscription_end_date views usage
- **THEN** the system SHALL display "本月已使用 X / 15 集（訂閱將於 YYYY-MM-DD 到期）"
