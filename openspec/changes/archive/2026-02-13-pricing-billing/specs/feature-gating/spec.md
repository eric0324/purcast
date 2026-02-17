## ADDED Requirements

### Requirement: Voice Clone feature gate
The system SHALL restrict Voice Clone functionality to Pro users only.

#### Scenario: Pro user accesses Voice Clone
- **WHEN** a Pro user attempts to upload a voice sample or use a cloned voice
- **THEN** the system SHALL allow the action

#### Scenario: Active Pro user within grace period
- **WHEN** a user with plan='pro' and subscription_end_date in the future attempts to use Voice Clone
- **THEN** the system SHALL allow the action (subscription still active until end date)

#### Scenario: Expired Pro user blocked from Voice Clone
- **WHEN** a user with subscription_end_date in the past attempts to use Voice Clone
- **THEN** the API SHALL return a 403 error and the UI SHALL display a renewal prompt

#### Scenario: Free user blocked from Voice Clone
- **WHEN** a Free user attempts to use Voice Clone features
- **THEN** the API SHALL return a 403 error and the UI SHALL display an upgrade prompt

#### Scenario: Free user sees upgrade prompt in UI
- **WHEN** a Free user views the voice selection step during podcast generation
- **THEN** the Voice Clone option SHALL be visible but disabled with a "Upgrade to Pro" badge

### Requirement: Feature gate API middleware
The system SHALL provide a reusable middleware for checking feature access at the API level.

#### Scenario: Feature access check
- **WHEN** an API route requires a specific plan level
- **THEN** the middleware SHALL check:
  1. user.plan === 'pro', OR
  2. user.subscription_end_date exists AND now < subscription_end_date
- **THEN** return 403 if both conditions are false

#### Scenario: Plan upgrade takes effect immediately
- **WHEN** a user upgrades from Free to Pro
- **THEN** all Pro features SHALL be accessible immediately without requiring re-login

#### Scenario: Subscription cancellation UI update
- **WHEN** a user cancels their subscription
- **THEN** the UI SHALL display "Pro 功能可使用至 YYYY-MM-DD" instead of lock icons

### Requirement: Plan-aware UI rendering
The system SHALL conditionally render UI elements based on the user's plan.

#### Scenario: Free user dashboard
- **WHEN** a Free user views the dashboard
- **THEN** Pro-only features SHALL show lock icons with upgrade prompts

#### Scenario: Pro user dashboard
- **WHEN** a Pro user views the dashboard
- **THEN** all features SHALL be fully accessible without upgrade prompts

#### Scenario: Cancelled Pro user dashboard
- **WHEN** a user with subscription_end_date views the dashboard
- **THEN** all Pro features SHALL remain accessible with a banner "訂閱將於 YYYY-MM-DD 到期"
