## ADDED Requirements

### Requirement: Google OAuth login
The system SHALL support user registration and login via Google OAuth.

#### Scenario: Google OAuth sign-in
- **WHEN** a user clicks "Sign in with Google"
- **THEN** the system SHALL redirect to Google OAuth consent screen, and upon approval, verify the Google ID token, create or retrieve the user account, sign a JWT, and set it as an HTTP-only cookie

#### Scenario: New Google user auto-registration
- **WHEN** a Google user signs in for the first time
- **THEN** a `users` record SHALL be created with plan='free' and the Google email

### Requirement: Email/Password login
The system SHALL support user registration and login via email and password.

#### Scenario: Email registration
- **WHEN** a user registers with email and password
- **THEN** the system SHALL hash the password with bcrypt (10 salt rounds), create a user record with plan='free', sign a JWT, and set it as an HTTP-only cookie

#### Scenario: Email login
- **WHEN** a user logs in with valid email and password
- **THEN** the system SHALL verify the password with bcrypt, sign a JWT, and set it as an HTTP-only cookie

#### Scenario: Invalid credentials
- **WHEN** a user provides incorrect email or password
- **THEN** the system SHALL display "帳號或密碼錯誤" without revealing which field is wrong

### Requirement: Session management
The system SHALL manage user sessions via JWT stored in secure HTTP-only cookies.

#### Scenario: Session persists across page loads
- **WHEN** an authenticated user refreshes the page
- **THEN** the middleware SHALL verify the JWT from cookie and maintain the session

#### Scenario: Session expiration
- **WHEN** a JWT expires (7 days after issuance)
- **THEN** the user SHALL be redirected to the login page

#### Scenario: JWT validation
- **WHEN** middleware validates a JWT
- **THEN** it SHALL verify the signature, check expiration, and extract userId

### Requirement: Protected routes
The system SHALL protect dashboard routes from unauthenticated access.

#### Scenario: Unauthenticated access to dashboard
- **WHEN** an unauthenticated user accesses any route under `/(dashboard)/`
- **THEN** they SHALL be redirected to `/login`

#### Scenario: Authenticated access to auth pages
- **WHEN** an authenticated user accesses `/login` or `/register`
- **THEN** they SHALL be redirected to the dashboard

### Requirement: Logout
The system SHALL allow users to log out.

#### Scenario: User logs out
- **WHEN** a user clicks "登出"
- **THEN** the JWT cookie SHALL be cleared and the user SHALL be redirected to `/login`

### Requirement: Password reset
The system SHALL support password reset via email.

#### Scenario: Request password reset
- **WHEN** a user requests password reset with their email
- **THEN** the system SHALL generate a unique reset token (UUID), store it in `password_reset_tokens` table with 1-hour expiration, and send an email with reset link

#### Scenario: Invalid email for password reset
- **WHEN** a user requests password reset with a non-existent email
- **THEN** the system SHALL display "如果該信箱存在,我們已寄送重設連結" (avoid revealing account existence)

#### Scenario: Reset password with valid token
- **WHEN** a user accesses reset link with a valid, unused, non-expired token
- **THEN** the system SHALL allow them to set a new password

#### Scenario: Reset password with invalid token
- **WHEN** a user accesses reset link with an invalid, used, or expired token
- **THEN** the system SHALL display "重設連結無效或已過期,請重新申請"

#### Scenario: Complete password reset
- **WHEN** a user submits a new password via valid reset link
- **THEN** the system SHALL hash the new password with bcrypt, update the user record, mark the reset token as used, and redirect to login page

#### Scenario: Reset token expiration
- **WHEN** a reset token is more than 1 hour old
- **THEN** it SHALL be considered expired and cannot be used
