## 1. 自建 Auth 系統實作 [PRD §4.1 ④]

- [x] 1.1 安裝依賴套件：`npm install jsonwebtoken bcryptjs google-auth-library nodemailer`（email 發送）。驗收：套件安裝成功。
- [x] 1.2 建立 JWT 工具函式 (`src/lib/auth/jwt.ts`)：`signJWT(payload)`, `verifyJWT(token)`, `generateResetToken()`。驗收：可正確簽發和驗證 token。
- [x] 1.3 建立密碼加密函式 (`src/lib/auth/password.ts`)：`hashPassword(password)`, `comparePassword(password, hash)`。驗收：bcrypt 加密和驗證正確運作。
- [x] 1.4 建立 `password_reset_tokens` 資料表 migration。驗收：資料表建立成功。
- [x] 1.5 建立註冊 API (`src/app/api/auth/register/route.ts`)：驗證 email 格式、檢查重複、hash 密碼、建立 user、簽發 JWT、設定 HTTP-only cookie。驗收：新用戶可註冊並取得 JWT。
- [x] 1.6 建立登入 API (`src/app/api/auth/login/route.ts`)：驗證 email/password、比對密碼 hash、簽發 JWT、設定 HTTP-only cookie。驗收：現有用戶可登入。
- [x] 1.7 建立 Google OAuth API (`src/app/api/auth/google/route.ts`)：接收 Google ID token、用 `google-auth-library` 驗證、檢查或建立 user、簽發 JWT。驗收：Google 登入成功取得 JWT。
- [x] 1.8 建立登出 API (`src/app/api/auth/logout/route.ts`)：清除 JWT cookie。驗收：登出後 cookie 被清除。
- [x] 1.9 建立請求密碼重設 API (`src/app/api/auth/forgot-password/route.ts`)：生成 reset token、儲存到 DB、寄送 email。驗收：收到 reset email。
- [x] 1.10 建立重設密碼 API (`src/app/api/auth/reset-password/route.ts`)：驗證 token、更新密碼、標記 token 為已使用。驗收：可成功重設密碼。
- [x] 1.11 實作 middleware 路由保護 (`src/middleware.ts`)：讀取 JWT cookie、驗證 token、未登入導向 /login、已登入訪問 auth 頁面導向 dashboard。驗收：路由保護正確運作。
- [x] 1.12 建立登入頁面 (`src/app/(auth)/login/page.tsx`)：Google OAuth 按鈕 + Email/Password 表單 + 「忘記密碼」連結。驗收：兩種登入方式都可觸發。
- [x] 1.13 建立註冊頁面 (`src/app/(auth)/register/page.tsx`)：Email/Password 註冊表單,註冊成功後自動登入。驗收：新用戶可註冊並自動導向 dashboard。
- [x] 1.14 建立忘記密碼頁面 (`src/app/(auth)/forgot-password/page.tsx`)：輸入 email 表單。驗收：提交後顯示「已寄送重設連結」訊息。
- [x] 1.15 建立重設密碼頁面 (`src/app/(auth)/reset-password/page.tsx`)：驗證 token、輸入新密碼表單。驗收：可成功重設密碼並導向登入頁。
- [x] 1.16 設定 Google OAuth (GCP Console)：建立 OAuth 2.0 client ID、設定 authorized redirect URIs。驗收：Google OAuth 設定完成。
- [x] 1.17 設定 email 發送服務（SendGrid 或 AWS SES）：建立 API key、設定寄件人 email。驗收：可成功寄送測試 email。

## 2. 聲音管理頁面 [PRD §4.1 ④、§5.2]

- [x] 2.1 建立聲音管理頁面 (`src/app/(dashboard)/voices/page.tsx`)：列出用戶的克隆聲音（名稱、日期、預覽按鈕、刪除按鈕）。驗收：正確顯示 voices 列表。
- [x] 2.2 實作空狀態 UI：無聲音時顯示引導上傳的空狀態。驗收：新用戶看到正確的空狀態。
- [x] 2.3 實作上傳對話框：檔案選擇器（MP3/WAV/M4A）+ 錄音建議說明 + 上傳按鈕。驗收：可選擇檔案,限制格式和大小。
- [x] 2.4 實作上傳進度 UI：上傳中 → 克隆中 → 完成三階段進度顯示。驗收：進度正確反映當前階段。
- [x] 2.5 實作聲音預覽：點擊預覽按鈕播放 sample 音檔。驗收：可正確播放預覽。
- [x] 2.6 實作刪除確認與執行：確認對話框 + 呼叫 delete API + 更新列表。驗收：刪除後聲音從列表消失。

## 3. 生成歷史頁面 [PRD §4.1 ④]

- [x] 3.1 建立歷史頁面 (`src/app/(dashboard)/history/page.tsx`)：Server Component 查詢 podcasts 表,按建立時間倒序排列。驗收：正確顯示歷史列表。
- [x] 3.2 實作 podcast 狀態顯示：pending/generating 顯示 spinner,completed 顯示播放按鈕,failed 顯示錯誤。驗收：各狀態正確顯示。
- [x] 3.3 實作分頁（cursor-based）：每頁 10 筆,「載入更多」按鈕。驗收：可正確載入下一頁。
- [x] 3.4 實作 podcast 詳情頁 (`src/app/(dashboard)/history/[id]/page.tsx`)：標題、內容預覽、播放器、下載按鈕。驗收：點擊 podcast 可進入詳情頁。
- [x] 3.5 實作 MP3 下載功能：點擊下載按鈕直接下載音檔。驗收：檔案正確下載。

## 4. 音頻播放器元件 [PRD §4.1 ④]

- [x] 4.1 建立 AudioPlayer 元件 (`src/components/ui/audio-player.tsx`)：播放/暫停按鈕、進度條（可拖動）、時間顯示（MM:SS）、音量控制。驗收：基本功能正常運作。
- [x] 4.2 實作 persistent mini-player：底部固定的迷你播放器,跨頁面保持播放狀態。驗收：切換頁面時音頻不中斷。
- [x] 4.3 實作單一播放邏輯：播放新音頻時自動停止舊的。驗收：不會同時播放兩個音頻。

## 5. 用戶設定頁面

- [x] 5.1 建立設定頁面 (`src/app/(dashboard)/settings/page.tsx`)：顯示帳號資訊（email、方案、註冊日期）。驗收：資訊正確顯示。
