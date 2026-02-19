## Context

PurCast 目前是手動流程：用戶貼內容 → 生成腳本 → 編輯 → 語音合成 → 完成。現有模組包括 LLM (`src/lib/llm/`)、TTS (`src/lib/tts/`)、R2 儲存、ffmpeg 音訊處理，皆為 provider-agnostic 抽象。

Automated Jobs 要在這之上加一層自動化：定時輪詢來源 → 過濾聚合 → 複用現有 pipeline 生成 Podcast → 推送到外部管道。系統跑在 Vultr VPS，用 PM2 管理 process，沒有 Redis。

## Goals / Non-Goals

**Goals:**
- 用戶可建立自動化 Job，設定來源、排程、過濾規則、輸出管道
- 系統定時抓取 RSS / URL 新內容，自動聚合為 Podcast
- 支援 Telegram Bot + LINE OA 輸出
- Job 執行消耗用戶既有月配額
- 完整的執行歷史記錄

**Non-Goals:**
- 即時 webhook 觸發（僅定時輪詢）
- 用戶手動編輯 Job 產生的腳本（自動流程跳過 script_ready 階段）
- X / Reddit 等需要特殊 API 的來源
- 複雜的 Job 間依賴或串聯

## Decisions

### D1: Worker 架構 — 獨立 PM2 process + node-cron

**選擇**: 獨立的 `worker.ts` 由 PM2 管理，用 node-cron 排程。

**為什麼不在 Next.js 內跑 cron**:
- Next.js App Router 的 serverless 傾向不適合長駐背景任務
- Cron timer 會在 HMR / 重啟時遺失或重複
- 獨立 process 可單獨重啟、監控、scaling

**為什麼不用 BullMQ + Redis**:
- 現有架構沒有 Redis，加 Redis 增加運維複雜度
- node-cron 對「固定時間觸發」的場景夠用
- VPS 單機部署，不需要分散式 queue

**架構**:
```
PM2
├── next-app (port 3000)      ← 現有 Next.js
└── job-worker                ← 新增 worker process
    ├── node-cron scheduler
    ├── 直接 import Prisma client（共用 DB）
    ├── 直接 import src/lib/llm, tts, r2, audio
    └── 輸出管道 (Telegram / LINE SDK)
```

Worker 與 Next.js 透過**共享資料庫**溝通，不需要 HTTP API 互調。Next.js 寫入 Job 設定到 DB，Worker 讀取並執行。

### D2: 排程機制 — 每分鐘掃描 + 比對排程時間

**選擇**: Worker 啟動時**不**為每個 Job 動態建立 cron job。改用「每分鐘掃一次 DB，找出該執行的 Job」。

**理由**:
- 動態新增/刪除 cron job 需要管理 in-memory 狀態，重啟後要重建
- DB 掃描模式無狀態，重啟即恢復，Job 新增/修改即時生效
- 每分鐘一次 DB query 負擔極低

**流程**:
1. Worker 每分鐘跑一次 `checkDueJobs()`
2. 查詢 `jobs WHERE status = 'active' AND next_run_at <= now()`
3. 對每個到期 Job，spawn 執行 pipeline
4. 執行完成後，根據 schedule config 計算 `next_run_at` 並更新

### D3: 資料模型

```
Job
├── id (UUID)
├── userId (FK → users)
├── name (text)
├── status ('active' | 'paused' | 'error')
├── sources (jsonb) — [{ type: 'rss' | 'url', url, label? }]
├── schedule (jsonb) — { mode: 'daily' | 'weekly', time: '08:00', timezone, weekday? }
├── filterConfig (jsonb) — { includeKeywords, excludeKeywords, aiPrompt? }
├── generationConfig (jsonb) — { stylePreset, customPrompt?, voiceId, maxArticles, targetMinutes }
├── outputConfig (jsonb) — [{ type: 'telegram' | 'line', config, format: 'audio' | 'link' | 'both' }]
├── nextRunAt (timestamptz)
├── lastRunAt (timestamptz, nullable)
├── createdAt, updatedAt

JobRun
├── id (UUID)
├── jobId (FK → jobs)
├── status ('pending' | 'fetching' | 'filtering' | 'generating_script' | 'generating_audio' | 'publishing' | 'completed' | 'failed' | 'skipped')
├── articlesFound (int)
├── articlesSelected (int)
├── selectedArticles (jsonb) — [{ title, url, reason }]
├── podcastId (FK → podcasts, nullable) — 連到現有 Podcast 表
├── errorMessage (text, nullable)
├── startedAt (timestamptz)
├── completedAt (timestamptz, nullable)

JobArticle (去重用)
├── id (UUID)
├── jobId (FK → jobs)
├── url (text) — 文章 URL，用於去重
├── title (text)
├── fetchedAt (timestamptz)
├── unique(jobId, url)
```

**為什麼用 JSONB 存 sources / schedule / config**: 這些欄位結構可能頻繁迭代（加來源類型、加輸出管道），JSONB 避免頻繁 migration。用 TypeScript interface 在應用層確保型別安全。

### D4: Job 執行 Pipeline

```
fetchSources(job)
  → articles: { title, url, content }[]
filterArticles(articles, job.filterConfig)
  → 第一層: keyword filter (不耗 quota)
  → 去重: 排除 job_articles 已存在的 URL
  → 第二層: AI 篩選 (耗 quota, 僅在有 aiPrompt 時)
  → selected: { title, url, content, reason }[]
如果 selected 為空 → 建立 skipped JobRun，結束
generateAggregatedScript(selected, job.generationConfig)
  → 複用 LLM module，但需新的聚合 prompt
  → 產出 GenerateScriptResult
synthesizeAudio(script, voiceConfig)
  → 複用現有 TTS pipeline (synthesizeScript + ffmpeg concat)
uploadToR2(audioBuffer)
  → 複用現有 R2 upload
createPodcastRecord(...)
  → 寫入 podcasts 表，status='completed'，source_type='job'
publishToChannels(job.outputConfig, podcast)
  → 推送到 Telegram / LINE
recordJobRun(...)
  → 寫入 job_runs + job_articles
updateNextRunAt(job)
```

### D5: 來源抓取策略

**RSS**: 用 `rss-parser` 解析 feed，取得文章列表 (title, link, content/summary, pubDate)。用 pubDate 排序取最新。

**URL 監控**:
1. 用 `fetch` 抓取首頁 HTML
2. 用 `cheerio` 解析，提取所有 `<a>` 連結
3. 過濾出文章連結（同域名、路徑像文章的 URL，排除 nav/footer 連結）
4. 對新連結用 `fetch` + `cheerio` 擷取文章全文（`<article>` 或 `<main>` 區塊）

**備註**: URL 監控的「判斷哪些是文章連結」可能不精準，先用啟發式規則（路徑含日期、slug 格式），後續可加 AI 輔助。

### D6: LLM 擴充 — 新增 filterArticles + generateAggregatedScript

**不修改現有 `LLMProvider` interface**，改在 `src/lib/llm/` 下新增獨立函式：

```typescript
// src/lib/llm/filter.ts
export async function aiFilterArticles(
  articles: ArticleSummary[],
  aiPrompt: string
): Promise<FilteredArticle[]>

// src/lib/llm/aggregate.ts
export async function generateAggregatedScript(
  articles: ArticleContent[],
  config: AggregationConfig
): Promise<GenerateScriptResult>
```

**理由**: 現有 `generateScript(content)` 接受單一 string，聚合腳本需要多篇文章 + 風格設定 + 串場邏輯，interface 不同。新增函式而非修改 interface，避免影響手動流程。

### D7: Telegram — grammY library + PurCast Bot

**選擇 grammY 而非 Telegraf**:
- grammY 是 Telegraf 的精神續作，TypeScript-first
- 更好的 TypeScript 類型支援
- 更活躍的維護

**綁定流程**:
1. Job 設定頁 → 用戶點「連接 Telegram」
2. 顯示 PurCast Bot 連結 + 一次性驗證碼
3. 用戶在 Telegram 對 Bot 發送驗證碼
4. Bot webhook 收到後，將 chat_id 綁定到用戶帳號
5. Job 輸出設定可選擇已綁定的 Telegram chat

**推送格式**: 依用戶設定 (audio / link / both)
- `audio`: 直接發送 mp3 檔 + 標題
- `link`: 發送文字訊息（標題 + 摘要 + 播放連結）
- `both`: 先發文字再發音檔

### D8: LINE — 用戶自備 OA + Channel Access Token

**流程**:
1. 用戶在 LINE Developers Console 建立 Messaging API Channel
2. 在 Job 設定頁填入 Channel Access Token
3. 系統用該 Token 呼叫 LINE Messaging API 推送
4. 用戶需將 PurCast 提供的 Webhook URL 設定到 LINE Channel（用來接收用戶訊息/取得 user ID）

**推送**: 使用 LINE Messaging API 的 push message，格式同 Telegram（audio / link / both）。音訊檔透過公開 R2 URL 發送。

**不用 LINE SDK**: LINE Messaging API 只需 REST call，不需要完整 SDK。用 `fetch` 直呼即可。

### D9: Podcast 表擴充

Job 產生的 Podcast 寫入現有 `podcasts` 表，新增：
- `source_type` 擴充 enum: `'text' | 'url' | 'job'`
- `job_run_id` (nullable FK → job_runs) — 標記這集是哪次 Job 執行產生的

這樣 History 頁面可以過濾手動 vs 自動，Job 執行詳情頁可以連回 Podcast。

### D10: 前端頁面路由

```
src/app/[locale]/(dashboard)/jobs/
├── page.tsx           → Job Dashboard 列表
├── new/page.tsx       → 建立 Job (多步驟表單)
├── [id]/
│   ├── page.tsx       → Job 詳情 + 執行歷史
│   ├── edit/page.tsx  → 編輯 Job
│   └── runs/
│       └── [runId]/page.tsx → 單次執行詳情
```

建立 Job 表單用多步驟 (Step Wizard)：
1. 基本資訊 + 來源設定
2. 排程 + 過濾規則
3. 腳本風格 + 語音設定
4. 輸出管道設定
5. 預覽確認

## Risks / Trade-offs

**[URL 監控精準度低]** → 啟發式規則辨識文章連結可能漏選或誤選。Mitigation: 先上線收集回饋，後續加 AI 輔助判斷連結是否為文章。

**[Worker 單點故障]** → PM2 單 process 掛掉會影響所有 Job。Mitigation: PM2 autorestart + max_restarts 設定，加上錯誤通知。Worker 啟動時重新掃描遺漏的 Job（nextRunAt 已過期的）。

**[LLM / TTS 費用不可控]** → Job 自動執行可能在用戶不注意時大量消耗 API 費用。Mitigation: 嚴格的 quota 控制 + 配額不足時自動暫停 Job + 通知用戶。

**[LINE Token 管理]** → 用戶自備 Token 增加設定門檻，Token 過期或無效需要處理。Mitigation: 每次推送前驗證 Token，失敗時暫停該輸出管道並通知用戶。

**[Telegram Bot 被濫用]** → 公開 Bot 可能收到垃圾訊息。Mitigation: Bot 只回應驗證碼格式的訊息，其餘忽略。

## Migration Plan

1. Prisma schema 新增 Job, JobRun, JobArticle model + Podcast 表擴充 → `bunx prisma migrate`
2. 建立 `src/lib/jobs/` 模組（pipeline, sources, filtering, outputs）
3. 建立 `src/lib/llm/filter.ts` + `src/lib/llm/aggregate.ts`
4. 建立 Job CRUD API routes (`src/app/api/jobs/`)
5. 建立 Telegram Bot webhook (`src/app/api/telegram/webhook/`)
6. 建立前端 Job 頁面
7. 建立 `worker.ts` + PM2 ecosystem config 更新
8. 部署: migration → 部署 Next.js → 啟動 worker process

**Rollback**: Worker process 可獨立停止，不影響主站。刪除 migration 需反向 migrate。

## Open Questions

1. **風格預設的 prompt 內容**: 四種預設風格（新聞簡報、閒聊對談、深度分析、脫口秀）的具體 system prompt 要先定義還是在實作時調整？
2. **Worker 的 TypeScript 執行方式**: 用 `tsx` 直接跑 .ts，還是先 build 成 .js 再由 node 跑？建議用 `tsx` 保持開發一致性。
3. **Telegram Bot Token**: 由平台統一申請一個 Bot，Token 存在環境變數中。需要申請嗎？
