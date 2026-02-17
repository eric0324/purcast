## 1. Next.js 專案初始化 [PRD §6.1]

- [x] 1.1 使用 `create-next-app` 初始化 Next.js 14 App Router 專案（TypeScript、Tailwind CSS、ESLint、src/ 目錄）。驗收：`bun run build` 可正常建置。
- [x] 1.2 安裝 shadcn/ui 並初始化設定，安裝基礎元件（Button、Input、Card、Dialog、DropdownMenu）。驗收：可在頁面中引用 shadcn 元件並正常渲染。
- [x] 1.3 建立專案目錄結構：`src/components/ui/`、`src/components/layout/`、`src/lib/db/`、`src/lib/auth/`、`src/lib/r2/`、`src/lib/utils/`、`src/types/`。驗收：目錄結構存在且符合 design.md 規格。
- [x] 1.4 建立 `.env.local.example` 範本檔案，列出所有必要環境變數（DATABASE_URL、JWT_SECRET、GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME、ELEVENLABS_API_KEY、ANTHROPIC_API_KEY、NEWEBPAY_MERCHANT_ID、NEWEBPAY_HASH_KEY、NEWEBPAY_HASH_IV）。驗收：檔案存在，包含所有變數的佔位符。

## 2. PostgreSQL 資料庫 Schema [PRD §6.3]

- [x] 2.1 安裝 Prisma（`prisma` + `@prisma/client`），初始化 `prisma/schema.prisma`。驗收：`bunx prisma init` 成功。
- [x] 2.2 定義 `users` 表 schema（id, email, password_hash, google_id, name, plan, newebpay_customer_id, subscription_end_date, created_at, updated_at）。驗收：`bunx prisma validate` 成功。
- [x] 2.3 定義 `voices` 表（id, user_id, elevenlabs_voice_id, name, sample_url, created_at），設定 user_id 關聯與 cascade delete。驗收：關聯正確。
- [x] 2.4 定義 `podcasts` 表（id, user_id, title, source_type, source_content, source_url, script, audio_url, duration, status, error_message, created_at, updated_at），status 預設 'pending'，新增 'script_ready' 狀態。驗收：可插入記錄並正確設定預設值。
- [x] 2.5 定義 `usage` 表（id, user_id, month, generation_count），設定 (user_id, month) unique constraint。驗收：同一用戶同月份不可重複插入。
- [x] 2.6 建立 `updated_at` 自動更新邏輯（Prisma `@updatedAt` 自動處理）。驗收：更新記錄時 `updated_at` 自動變更。

## 3. 資料庫 Client 設定

- [x] 3.1 建立 `src/lib/db/client.ts`：Prisma singleton client，避免 hot reload 時重複建立連線。驗收：Server Component 和 API Route 都能正確查詢。
- [x] 3.2 建立 `src/types/database.ts`：從 Prisma 匯出型別。驗收：型別可正確用於 TypeScript。

## 4. Cloudflare R2 儲存設定 [PRD §6.1]

- [x] 4.1 安裝 `@aws-sdk/client-s3`。建立 `src/lib/r2/client.ts`，使用環境變數初始化 S3 client（指向 R2 endpoint）。驗收：可成功連線到 R2。
- [x] 4.2 建立 `src/lib/r2/utils.ts`，實作 `uploadFile(key, body, contentType)`、`deleteFile(key)`、`getPublicUrl(key)` 工具函式。驗收：可上傳測試檔案到 R2 並取得公開 URL。

## 5. App Layout 與共用元件 [PRD §5.1]

- [x] 5.1 建立 Root Layout（`src/app/layout.tsx`）：設定 metadata（title: "Podify"）、字體、Tailwind CSS。驗收：所有頁面繼承正確的 metadata。
- [x] 5.2 建立 Auth Route Group Layout（`src/app/(auth)/layout.tsx`）：置中卡片式佈局。驗收：`/login` 頁面以置中卡片呈現。
- [x] 5.3 建立 Dashboard Route Group Layout（`src/app/(dashboard)/layout.tsx`）：Header + Sidebar + Main Content。驗收：Dashboard 頁面正確顯示。
- [x] 5.4 建立 Header 元件（`src/components/layout/header.tsx`）：Podify logo、用戶資訊 dropdown（設定、登出）。驗收：正確顯示。
- [x] 5.5 建立 Sidebar 元件（`src/components/layout/sidebar.tsx`）：導覽連結 + 響應式 hamburger menu。驗收：桌面顯示 sidebar，手機顯示 hamburger。

## 6. Vultr VPS + PM2 部署設定

- [x] 6.1 建立 `ecosystem.config.js`（PM2 設定檔），配置 Next.js 啟動指令、環境變數、log 路徑。驗收：`pm2 start ecosystem.config.js` 可啟動。
- [x] 6.2 撰寫部署腳本 `scripts/deploy.sh`：git pull → bun install → bunx prisma migrate deploy → bun run build → pm2 reload。驗收：執行腳本可完成部署。
- [x] 6.3 設定 Nginx reverse proxy config（`scripts/nginx.conf`）：將 80/443 轉發到 Next.js 的 3000 port，配置 SSL（Let's Encrypt）。驗收：部署到 VPS 後可透過 HTTPS 存取網站。
