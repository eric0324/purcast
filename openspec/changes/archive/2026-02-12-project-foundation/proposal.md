## Why

Podify 的所有功能模組都依賴共同的基礎架構：Next.js 專案骨架、PostgreSQL 資料庫、自建認證系統、Cloudflare R2 儲存、以及核心資料表結構。在開發任何功能之前，必須先建立這些基礎建設，確保後續模組可以在統一的架構上開發。（參考 PRD §6.1 系統架構總覽）

## What Changes

- 初始化 Next.js 14 App Router 專案，設定 TypeScript、ESLint、Tailwind CSS
- 在 Vultr VPS 上設定 PostgreSQL 資料庫
- 建立核心資料庫 Schema：`users`、`voices`、`podcasts`、`usage` 四張表（參考 PRD §6.3）
- 設定 Cloudflare R2 儲存 bucket，用於音檔儲存
- 建立專案目錄結構與共用元件基礎（Layout、Navigation、共用 UI 元件）
- 設定環境變數管理（DB、ElevenLabs、Claude API、R2 等 keys）
- 設定 Vultr VPS + PM2 部署配置

## Capabilities

### New Capabilities
- `database-schema`: 核心資料表結構定義（users, voices, podcasts, usage）
- `storage-config`: Cloudflare R2 儲存設定，音檔上傳/下載的工具函式
- `app-layout`: Next.js App Router 頁面骨架、共用 Layout、Navigation 元件

### Modified Capabilities
<!-- 無既有 capabilities 需修改 -->

## Impact

- 新建 Next.js 專案，所有後續功能模組在此基礎上開發
- PostgreSQL 資料庫 Schema 為所有模組共用，後續模組可直接操作這些表
- R2 儲存設定影響音檔上傳與播放流程
- 環境變數配置影響所有外部 API 整合

## Out of Scope

參考 PRD §4.2：不包含自建 GPU/開源 TTS、影片生成、手機 App、團隊/企業方案。此模組專注於基礎建設，不涉及任何業務邏輯實作。
