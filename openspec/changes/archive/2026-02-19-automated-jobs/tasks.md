## 1. Database Schema & Migration

- [x] 1.1 Add Job, JobRun, JobArticle models to Prisma schema with all columns, relations, and JSONB fields as defined in database-schema spec
- [x] 1.2 Extend Podcast model: add source_type='job' to enum, add job_run_id nullable FK to job_runs
- [x] 1.3 Add updated_at trigger for jobs table (extend existing trigger)
- [x] 1.4 Run `bunx prisma migrate` and verify generated migration, then `bunx prisma generate`
- [x] 1.5 Define TypeScript interfaces for JSONB fields: JobSource, JobSchedule, JobFilterConfig, JobGenerationConfig, JobOutputConfig (in `src/lib/jobs/types.ts`)

## 2. Source Fetching Module

- [x] 2.1 Install dependencies: rss-parser, cheerio
- [x] 2.2 Create `src/lib/jobs/sources/types.ts` — FetchedArticle interface { title, url, content, publishedAt? }
- [x] 2.3 Implement `src/lib/jobs/sources/rss.ts` — fetchRSS(url): parse RSS feed, return FetchedArticle[], handle errors gracefully (return [] on failure)
- [x] 2.4 Implement `src/lib/jobs/sources/url-monitor.ts` — fetchURLMonitor(url): fetch HTML, extract article-like links with cheerio heuristics, fetch new article content
- [x] 2.5 Implement `src/lib/jobs/sources/extract-content.ts` — extractArticleContent(url): fetch page, extract main text from `<article>`/`<main>`, strip HTML
- [x] 2.6 Implement `src/lib/jobs/sources/index.ts` — fetchSources(sources: JobSource[]): dispatch by type, merge results, enforce 30s timeout per request
- [x] 2.7 Write tests for RSS fetching (valid feed, invalid feed, empty feed)
- [x] 2.8 Write tests for URL monitoring (link extraction, heuristic filtering, content extraction)

## 3. Content Filtering Module

- [x] 3.1 Implement `src/lib/jobs/filtering/keyword-filter.ts` — keywordFilter(articles, includeKeywords, excludeKeywords): case-insensitive keyword matching on title + content
- [x] 3.2 Implement `src/lib/jobs/filtering/dedup.ts` — deduplicateArticles(articles, jobId): check against job_articles table by URL
- [x] 3.3 Implement `src/lib/jobs/filtering/index.ts` — filterPipeline(articles, filterConfig, jobId): chain keyword → dedup → AI filter, return selected articles
- [x] 3.4 Write tests for keyword filtering (include, exclude, both, none configured)
- [x] 3.5 Write tests for deduplication (new articles, already seen, same URL from multiple sources)

## 4. LLM Extensions

- [x] 4.1 Implement `src/lib/llm/filter.ts` — aiFilterArticles(articles, aiPrompt, maxArticles): send titles+summaries to LLM, return ranked list with reasons
- [x] 4.2 Define style preset prompts in `src/lib/llm/style-presets.ts` — STYLE_PRESETS: Record<string, string> for news_brief, casual_chat, deep_analysis, talk_show
- [x] 4.3 Implement `src/lib/llm/aggregate.ts` — generateAggregatedScript(articles, config): multi-article → single DialogueScript with transitions, using style preset + custom prompt + target duration
- [x] 4.4 Write tests for aiFilterArticles (ranking, reason output, max articles limit)
- [x] 4.5 Write tests for generateAggregatedScript (style application, multi-article handling, custom prompt)

## 5. Output Channels — Telegram

- [x] 5.1 Install dependency: grammy
- [x] 5.2 Create `src/lib/jobs/outputs/telegram.ts` — TelegramChannel class: sendAudio(chatId, audioUrl, title), sendLink(chatId, title, summary, url), sendBoth(...)
- [x] 5.3 Implement Telegram verification code generation + storage (temp codes in DB or in-memory with TTL)
- [x] 5.4 Create API route `src/app/api/telegram/webhook/route.ts` — receive Bot updates, handle verification code messages, verify request authenticity
- [x] 5.5 Create API route `src/app/api/telegram/connect/route.ts` — POST: generate verification code for authenticated user, return code + bot link
- [x] 5.6 Write tests for Telegram message delivery (audio, link, both formats, failure handling)

## 6. Output Channels — LINE

- [x] 6.1 Create `src/lib/jobs/outputs/line.ts` — LineChannel class: pushMessage using LINE Messaging API via fetch, support audio/link/both formats
- [x] 6.2 Create API route `src/app/api/line/webhook/[jobId]/route.ts` — receive LINE events (follow), verify X-Line-Signature, store user ID
- [x] 6.3 Implement LINE token encryption/decryption for storage in outputConfig
- [x] 6.4 Write tests for LINE message delivery (push message, token validation, signature verification)

## 7. Output Channel Dispatcher

- [x] 7.1 Implement `src/lib/jobs/outputs/index.ts` — publishToChannels(outputConfig, podcast): dispatch to all configured channels, collect results, log failures independently
- [x] 7.2 Write tests for dispatcher (multi-channel delivery, partial failure handling)

## 8. Job Execution Pipeline

- [x] 8.1 Implement `src/lib/jobs/pipeline.ts` — executeJob(job): orchestrate full pipeline (fetch → filter → generate → synthesize → upload → create podcast → publish → record), update JobRun status at each step
- [x] 8.2 Implement quota check at pipeline start: verify user has remaining quota, pause Job + fail run if exhausted
- [x] 8.3 Implement concurrent execution guard: skip Job if it already has an in-progress JobRun
- [x] 8.4 Implement job_articles recording after successful pipeline completion
- [x] 8.5 Implement usage increment: call existing usage tracking to increment generation_count after podcast creation
- [x] 8.6 Write tests for pipeline (full success, failure at each step, skipped run, quota exhaustion, concurrent guard)

## 9. Job Scheduling Worker

- [x] 9.1 Create `src/worker.ts` — entry point: initialize Prisma, register node-cron `* * * * *` to call checkDueJobs()
- [x] 9.2 Implement checkDueJobs(): query active Jobs with next_run_at <= now(), spawn executeJob for each
- [x] 9.3 Implement next_run_at calculation: daily mode (next occurrence of time in timezone), weekly mode (next weekday + time in timezone)
- [x] 9.4 Implement worker recovery: on startup, detect overdue Jobs and execute them
- [x] 9.5 Update PM2 ecosystem config: add job-worker process entry using `tsx src/worker.ts`
- [x] 9.6 Write tests for schedule calculation (daily next run, weekly next run, timezone handling, after-execution update)

## 10. Job CRUD API

- [x] 10.1 Create `src/app/api/jobs/route.ts` — GET (list Jobs), POST (create Job with validation)
- [x] 10.2 Create `src/app/api/jobs/[id]/route.ts` — GET (Job detail + recent runs), PUT (update Job), DELETE (delete Job + cascades)
- [x] 10.3 Create `src/app/api/jobs/[id]/status/route.ts` — PATCH (activate/pause with quota check)
- [x] 10.4 Create `src/app/api/jobs/[id]/runs/[runId]/route.ts` — GET (run detail with selectedArticles)
- [x] 10.5 Implement request validation: required fields, source URL format, schedule config, voiceId ownership, output config
- [x] 10.6 Write tests for all CRUD endpoints (create, list, get, update, delete, status toggle, authorization)

## 11. Frontend — Job Dashboard & List

- [x] 11.1 Create `/jobs/page.tsx` — Job list with status badges (active/paused/error), last run time, next run time, action buttons
- [x] 11.2 Implement empty state with CTA to create new Job
- [x] 11.3 Implement activate/pause toggle with confirmation dialog
- [x] 11.4 Implement delete with confirmation dialog

## 12. Frontend — Create & Edit Job

- [x] 12.1 Create step wizard component with progress indicator (5 steps)
- [x] 12.2 Step 1: Basic info (name) + sources config (add/remove RSS URLs, URL monitors)
- [x] 12.3 Step 2: Schedule config (daily/weekly, time picker, timezone selector) + keyword filter (include/exclude keyword chips)
- [x] 12.4 Step 3: AI filter prompt textarea + style preset selector (4 presets) + custom prompt textarea + voice selector (from user's voices) + max articles slider + target duration slider
- [x] 12.5 Step 4: Output channels — Telegram connect button + LINE OA token input + format selector (audio/link/both) per channel
- [x] 12.6 Step 5: Review & confirm — summary of all settings, create button
- [x] 12.7 Create `/jobs/new/page.tsx` wiring wizard to POST /api/jobs
- [x] 12.8 Create `/jobs/[id]/edit/page.tsx` wiring wizard (pre-populated) to PUT /api/jobs/[id]

## 13. Frontend — Job Detail & Run History

- [x] 13.1 Create `/jobs/[id]/page.tsx` — display Job config summary + execution history list (status, time, articles count)
- [x] 13.2 Create `/jobs/[id]/runs/[runId]/page.tsx` — display run detail: status, timing, selected articles table (title, URL, reason), link to podcast
- [x] 13.3 Handle skipped/failed run states with appropriate messaging

## 14. Usage Tracking Integration

- [x] 14.1 Modify usage check to support Job-triggered creation (worker context, no HTTP request)
- [x] 14.2 Implement auto-pause: after quota increment, check if user hit limit and pause remaining active Jobs
- [x] 14.3 Update usage display UI to show manual vs Job breakdown
- [x] 14.4 Write tests for Job quota integration (check, increment, auto-pause)

## 15. i18n

- [x] 15.1 Add Job-related translation keys to `messages/zh-TW.json` (dashboard, wizard steps, status labels, error messages)
- [x] 15.2 Add Job-related translation keys to `messages/en.json`

## 16. Integration Testing & Deployment

- [x] 16.1 End-to-end test: create Job → activate → worker picks up → pipeline executes → Podcast created → output delivered
- [ ] 16.2 Verify worker process starts and restarts correctly via PM2
- [ ] 16.3 Deploy: run migration → deploy Next.js → start worker → verify Telegram webhook connectivity
