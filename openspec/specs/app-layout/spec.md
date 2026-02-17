## ADDED Requirements

### Requirement: Root layout with metadata
The system SHALL provide a root layout (`app/layout.tsx`) that includes global metadata (title: "Podify", description), font configuration, and Tailwind CSS setup.

#### Scenario: Page renders with correct metadata
- **WHEN** any page is loaded
- **THEN** the HTML document SHALL include the site title "Podify" and appropriate meta description

#### Scenario: Global styles applied
- **WHEN** any page is rendered
- **THEN** Tailwind CSS utility classes and global styles SHALL be available

### Requirement: Auth route group layout
The system SHALL provide a layout for the `(auth)` route group with a centered, minimal design suitable for login and registration pages.

#### Scenario: Auth pages use minimal layout
- **WHEN** a user visits `/login` or `/register`
- **THEN** the page SHALL render with a centered card layout without sidebar or navigation

### Requirement: Dashboard route group layout
The system SHALL provide a layout for the `(dashboard)` route group with header navigation and sidebar.

#### Scenario: Dashboard pages include navigation
- **WHEN** an authenticated user visits any dashboard page
- **THEN** the page SHALL render with a top header and a sidebar navigation

#### Scenario: Sidebar navigation items
- **WHEN** the dashboard layout renders
- **THEN** the sidebar SHALL display navigation links: 生成 Podcast, 生成歷史, 聲音管理, 設定

### Requirement: Header component
The system SHALL provide a header component displaying the Podify logo, current user info, and a user dropdown menu.

#### Scenario: Header shows user email
- **WHEN** an authenticated user views any dashboard page
- **THEN** the header SHALL display the user's email or name with a dropdown menu containing: 設定, 登出

### Requirement: Responsive layout
The system SHALL provide responsive layouts that adapt to mobile, tablet, and desktop screen sizes.

#### Scenario: Mobile sidebar collapses
- **WHEN** the viewport width is below 768px
- **THEN** the sidebar SHALL collapse into a hamburger menu

#### Scenario: Desktop sidebar visible
- **WHEN** the viewport width is 768px or above
- **THEN** the sidebar SHALL be visible by default

### Requirement: Database client initialization
The system SHALL provide a pre-configured Prisma client instance for database access.

#### Scenario: Prisma client available
- **WHEN** any Server Component or API Route needs database access
- **THEN** it SHALL use a singleton Prisma client from `src/lib/db/client.ts`

#### Scenario: Required database environment variable
- **WHEN** the application initializes
- **THEN** it SHALL read `DATABASE_URL` from environment variables
