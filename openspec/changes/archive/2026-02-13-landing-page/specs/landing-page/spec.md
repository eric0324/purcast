## ADDED Requirements

### Requirement: Hero section
The system SHALL display a hero section as the first visible area of the landing page.

#### Scenario: Hero content displayed
- **WHEN** a visitor loads the landing page
- **THEN** the hero SHALL display the tagline "把任何文字內容變成 Podcast — 用你自己的聲音", a brief product description, and a primary CTA button "開始使用"

#### Scenario: CTA button navigation
- **WHEN** a visitor clicks "開始使用"
- **THEN** they SHALL be navigated to the registration page

### Requirement: How it Works section
The system SHALL display a 3-step process visualization.

#### Scenario: Steps displayed
- **WHEN** a visitor scrolls to the "How it Works" section
- **THEN** the system SHALL display 3 steps: (1) 貼入內容或 URL, (2) 選擇聲音, (3) 生成 Podcast — each with an icon and brief description

### Requirement: Features section
The system SHALL showcase the three core product features.

#### Scenario: Feature cards displayed
- **WHEN** a visitor scrolls to the Features section
- **THEN** the system SHALL display 3 feature cards: 智慧內容擷取, AI 雙人對話, Voice Cloning — each with icon, title, and description

### Requirement: Demo listening section
The system SHALL provide sample podcasts for visitors to listen to.

#### Scenario: Demo audio playback
- **WHEN** a visitor clicks play on a demo podcast
- **THEN** the embedded audio player SHALL play the pre-generated sample podcast

#### Scenario: Multiple demo samples
- **WHEN** a visitor views the demo section
- **THEN** at least 2 sample podcasts SHALL be available with titles and brief descriptions

### Requirement: Pricing section
The system SHALL display a pricing comparison table.

#### Scenario: Plan comparison displayed
- **WHEN** a visitor scrolls to the pricing section
- **THEN** the system SHALL display Free ($0, 2集/月, 預設聲音) and Pro ($14.99/月, 15集/月, Voice Clone) with feature comparison

#### Scenario: Pro plan CTA
- **WHEN** a visitor clicks the Pro plan CTA
- **THEN** they SHALL be navigated to the registration page

### Requirement: Footer
The system SHALL display a footer with essential links.

#### Scenario: Footer content
- **WHEN** a visitor scrolls to the bottom
- **THEN** the footer SHALL display: PurCast logo, copyright, links to 使用條款 and 隱私政策

### Requirement: Responsive design
The system SHALL be fully responsive across device sizes.

#### Scenario: Mobile layout
- **WHEN** the viewport width is below 768px
- **THEN** all sections SHALL stack vertically with appropriate spacing and font sizes

#### Scenario: Desktop layout
- **WHEN** the viewport width is 1024px or above
- **THEN** feature cards and pricing table SHALL display in a horizontal grid

### Requirement: SEO optimization
The system SHALL include SEO meta tags and structured data.

#### Scenario: Meta tags present
- **WHEN** a search engine crawls the landing page
- **THEN** the page SHALL include title, description, Open Graph tags (og:title, og:description, og:image), and Twitter Card tags

#### Scenario: Static generation
- **WHEN** the landing page is built
- **THEN** it SHALL be statically generated at build time for optimal load speed and SEO

### Requirement: FAQ section
The system SHALL display a FAQ section with common questions and answers.

#### Scenario: FAQ content displayed
- **WHEN** a visitor scrolls to the FAQ section (between Pricing and bottom CTA)
- **THEN** the system SHALL display 3-5 frequently asked questions in an accordion format

#### Scenario: FAQ accordion interaction
- **WHEN** a visitor clicks on a FAQ question
- **THEN** the answer SHALL expand/collapse with smooth animation

#### Scenario: FAQ topics
- **WHEN** the FAQ section is displayed
- **THEN** it SHALL include questions about: supported languages, Voice Clone safety, plan differences, generation time, and subscription cancellation

### Requirement: Bilingual support (Chinese/English)
The system SHALL support both Traditional Chinese and English versions of the landing page.

#### Scenario: Default language
- **WHEN** a visitor loads the landing page without language preference
- **THEN** the page SHALL display in Traditional Chinese (zh-TW) by default

#### Scenario: Language switcher
- **WHEN** a visitor clicks the language switcher in the top-right corner
- **THEN** the page SHALL switch between 中文 and English, updating all text content

#### Scenario: English page accessible
- **WHEN** a visitor navigates to `/en`
- **THEN** the landing page SHALL display fully in English

#### Scenario: SSG bilingual
- **WHEN** the landing page is built
- **THEN** both Chinese and English versions SHALL be statically generated at build time
