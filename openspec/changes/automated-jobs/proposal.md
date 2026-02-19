## Why

PurCast 目前只支援手動貼內容產生 Podcast。用戶若想定期追蹤特定來源（部落格、新聞 RSS），需要每次手動複製貼上，無法自動化。Automated Jobs 讓用戶設定來源 + 排程 + 輸出管道，系統自動抓取新內容、AI 篩選聚合、產生 Podcast 並推送到 Telegram / LINE，實現「訂閱即收聽」的體驗。

## What Changes

- 新增 **Job 管理系統**：用戶可建立、編輯、暫停、刪除自動化 Job
- 新增 **來源抓取**：支援 RSS feed 解析 + URL 首頁監控（偵測新文章連結）
- 新增 **內容過濾**：關鍵字規則過濾（不耗 quota）+ AI 篩選排序（耗 quota）
- 新增 **排程引擎**：node-cron + PM2 worker process，依用戶設定時間觸發
- 新增 **聚合腳本生成**：多篇文章聚合為一集 Podcast，支援風格預設 + 自訂 prompt
- 新增 **輸出管道**：Telegram Bot 推送 + LINE Official Account 推送，用戶可選格式（音檔/連結/兩者）
- 新增 **Job Dashboard**：獨立頁面列表顯示所有 Job 狀態 + 執行歷史
- 新增 **執行記錄**：每次 Job 觸發記錄選了哪些文章、篩選理由、產出的 Podcast

## Capabilities

### New Capabilities

- `job-management`: Job 的 CRUD API 與 Dashboard UI（列表、建立、編輯、詳情、執行歷史）
- `source-fetching`: RSS feed 解析與 URL 首頁監控，偵測新內容、擷取文章全文
- `content-filtering`: 關鍵字規則過濾 + AI 篩選排序 + 已處理文章去重
- `job-scheduling`: node-cron 排程引擎，Job 執行 pipeline 編排（抓取→過濾→聚合→生成→發佈）
- `output-channels`: Telegram Bot 與 LINE OA 輸出管道，訊息推送與綁定流程

### Modified Capabilities

- `database-schema`: 新增 jobs、job_runs、job_articles 表，擴充資料模型
- `usage-tracking`: 自動 Job 執行也消耗月配額，配額用完時 Job 自動暫停

## Impact

- **資料庫**: 新增 3+ 張表（jobs, job_runs, job_articles），需 Prisma migration
- **後端 API**: 新增 Job CRUD endpoints（`/api/jobs/*`）、Telegram webhook、LINE 綁定 API
- **前端頁面**: 新增 `/jobs`、`/jobs/new`、`/jobs/[id]`、`/jobs/[id]/edit`、`/jobs/[id]/runs/[runId]` 頁面
- **部署架構**: 新增 PM2 worker process 跑 node-cron 排程（獨立於 Next.js 主程序）
- **新依賴**: rss-parser（RSS 解析）、node-cron（排程）、cheerio（HTML 解析）、telegraf 或 grammy（Telegram Bot）
- **既有系統**: 複用現有 LLM 模組（腳本生成）、TTS 模組（語音合成）、R2 儲存、ffmpeg 音訊處理
- **Quota 系統**: usage-tracking 需支援 Job 觸發的自動扣額，並在額度不足時暫停 Job

## Out of Scope

- X (Twitter) 來源（API 費用高，未來考慮）
- Reddit / YouTube / Hacker News 來源
- Discord / Slack / Email newsletter 輸出
- Webhook 通用輸出
- Apple Podcasts / Spotify 上架（可透過手動 RSS Feed 達成）
- 即時事件驅動觸發（僅支援定時輪詢）
