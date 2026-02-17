## Why

用戶系統是所有功能的基礎入口——用戶需要註冊登入才能使用服務、管理克隆聲音、瀏覽歷史生成的 Podcast、以及在網頁上直接收聽。一個流暢的用戶體驗是留存率的關鍵。（參考 PRD §4.1 ④、§5.1 新用戶流程）

## What Changes

- 實作自建 JWT 驗證系統：支援 Google OAuth + Email/Password 註冊登入
- 使用 bcrypt 密碼加密 + HTTP-only JWT cookie session
- 密碼重設功能：寄送 reset token email
- 聲音管理頁面：上傳音檔進行克隆、預覽克隆聲音、刪除已克隆的聲音
- 生成歷史頁面:瀏覽過去生成的所有 Podcast,顯示標題、日期、時長、狀態
- 內建音頻播放器元件：直接在網頁上收聽 Podcast
- 用戶個人設定頁面：帳號資訊、方案狀態
- 受保護路由（Protected Routes）：未登入用戶導向登入頁

## Capabilities

### New Capabilities
- `auth`: 自建 JWT Auth,Google OAuth + Email/Password 登入,bcrypt 密碼加密,HTTP-only cookie session 管理、密碼重設、受保護路由
- `voice-management`: 聲音管理介面,上傳/預覽/刪除克隆聲音
- `podcast-history`: 生成歷史列表,瀏覽、搜尋、排序過去的 Podcast
- `audio-player`: 內建音頻播放器元件,支援播放/暫停、進度條、音量控制

### Modified Capabilities
<!-- 無既有 capabilities 需修改 -->

## Impact

- 新增頁面：登入/註冊、密碼重設、聲音管理、生成歷史、個人設定
- 自建 JWT 驗證影響所有需要驗證的 API Routes
- 播放器元件會在多個頁面重複使用
- 依賴 `users`、`voices`、`podcasts` 資料表
- 需要 email 發送服務（密碼重設功能）

## Out of Scope

參考 PRD §4.2：不包含手機 App（iOS/Android）、團隊/企業帳號管理、社群功能（評論、追蹤）。MVP 僅支援個人帳號。
MVP 不包含 email 驗證流程（註冊後即可直接使用）。
