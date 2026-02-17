## Context

Podify 是一個從零開始的 MVP 專案，需要在 4 週內上線。所有功能模組（內容輸入、腳本生成、語音合成、用戶系統、計費）都依賴共同的基礎架構。此設計文件定義專案骨架、資料庫結構、儲存方案和共用元件，作為所有後續開發的地基。

當前狀態：空白專案，尚無任何程式碼。

## Goals / Non-Goals

**Goals:**
- 建立可立即開發的 Next.js 14 專案骨架
- 完成 PostgreSQL 資料庫連線與核心 Schema
- 設定 Cloudflare R2 音檔儲存
- 提供統一的專案結構與共用元件
- 設定 Vultr VPS + PM2 部署環境

**Non-Goals:**
- 不實作任何業務邏輯（由各功能模組負責）
- 不處理自建 GPU、開源 TTS 等 Phase 2+ 議題

## Decisions

### 1. 專案結構採用 Next.js App Router 分層架構

**選擇：** 按功能分層的目錄結構

```
src/
├── app/                    # App Router 路由
│   ├── (auth)/             # 驗證相關頁面（登入、註冊）
│   ├── (dashboard)/        # 登入後頁面（生成、歷史、設定）
│   ├── api/                # API Routes
│   └── layout.tsx          # Root Layout
├── components/
│   ├── ui/                 # 共用 UI 元件（Button, Input, Card 等）
│   └── layout/             # Layout 元件（Header, Sidebar, Footer）
├── lib/
│   ├── db/                 # PostgreSQL client（Prisma 或 Drizzle）
│   ├── auth/               # 自建 Auth 工具函式
│   ├── r2/                 # R2 儲存工具函式
│   └── utils/              # 通用工具函式
└── types/                  # TypeScript 型別定義
```

**理由：** App Router 的 Route Groups `(auth)` / `(dashboard)` 可分離登入前後的 Layout，保持結構清晰。

**替代方案：** Pages Router — 生態系更成熟但不支援 React Server Components，不利於未來擴展。

### 2. 資料庫使用自架 PostgreSQL + Prisma ORM

**選擇：** Vultr VPS 上自架 PostgreSQL，使用 Prisma 作為 ORM

**理由：** 完全掌控資料庫，無第三方限制。Prisma 提供型別安全的 query、migration 工具、schema 管理，開發體驗好。Vultr VPS 成本可控（$6-12/月）。

**替代方案：** Drizzle ORM — 更輕量但生態系較小；raw SQL + pg — 無型別安全。

### 3. 儲存使用 Cloudflare R2

**選擇：** Cloudflare R2，S3-compatible API

**理由：** 無出流費用（egress-free），音檔播放屬於高出流場景，R2 比 AWS S3 節省大量成本。

**替代方案：** AWS S3 — 功能更完整但出流費用高，對音檔串流不經濟。

### 4. UI 元件使用 shadcn/ui + Tailwind CSS

**選擇：** shadcn/ui 作為元件庫基礎

**理由：** shadcn/ui 是 copy-paste 模式而非 npm 依賴，可完全客製化。基於 Radix UI 確保 accessibility。搭配 Tailwind CSS 開發速度快，適合 MVP 快速迭代。

**替代方案：** Chakra UI — 較重、bundle size 較大；純手刻 — MVP 時程不允許。

### 5. 部署使用 Vultr VPS + PM2

**選擇：** Vultr VPS 上使用 PM2 管理 Next.js 進程

**理由：** 無 Serverless Function timeout 限制（音檔合成需要 1-3 分鐘）；成本可控；自架 PostgreSQL 和 Next.js 在同一台機器，延遲低。PM2 提供進程管理、自動重啟、log 管理。

**替代方案：** Vercel — Serverless 有 timeout 限制；Docker — 增加複雜度，MVP 不需要。

### 6. 環境變數管理使用 `.env` + PM2 ecosystem

**選擇：** 開發用 `.env.local`，生產用 PM2 ecosystem.config.js 管理

**理由：** Next.js 原生支援 `.env.local`，PM2 ecosystem 檔案可集中管理生產環境變數。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 自架 PostgreSQL 需要自行維護備份 | 設定 pg_dump cron job，定期備份到 R2 |
| Vultr VPS 單點故障 | MVP 階段可接受，成長後考慮加入負載均衡 |
| R2 沒有 CDN 內建 | 搭配 Cloudflare CDN（免費），音檔 URL 透過 Cloudflare 分發 |
| shadcn/ui 需要手動更新 | MVP 階段影響小，元件穩定後不常更新 |
| PM2 需要手動部署 | 可搭配 GitHub Actions 自動化部署 |
