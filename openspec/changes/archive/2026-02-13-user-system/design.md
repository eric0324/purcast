## Context

用戶系統是 PurCast 所有功能的入口。包含驗證登入、聲音管理、生成歷史和內建播放器四個子功能。MVP 需要支援 Google OAuth 和 Email/Password 兩種登入方式,並提供流暢的用戶體驗確保留存率。

## Goals / Non-Goals

**Goals:**
- 30 秒內完成註冊並開始使用
- 聲音管理流程直覺易用
- 生成歷史方便瀏覽與回放
- 播放器支援基本操作（播放/暫停/進度/音量）

**Non-Goals:**
- 不支援手機 App（PRD §4.2）
- 不支援團隊/企業帳號
- 不支援社群功能（評論、追蹤）
- 不支援 Podcast 分享到外部平台（V1.3）
- MVP 不支援 email 驗證（註冊後即可直接使用）

## Decisions

### 1. 自建 JWT Auth + bcrypt 密碼加密

**選擇:** 使用 JWT token + bcrypt 密碼加密,session 以 HTTP-only cookie 儲存

**理由:**
- 完全掌控 Auth 流程,不依賴第三方服務
- JWT 適合 stateless API 設計
- bcrypt 是業界標準的密碼加密方案
- HTTP-only cookie 防止 XSS 攻擊,比 localStorage 更安全
- Next.js App Router 的 Server Components 可直接讀取 cookie

**實作細節:**
- 使用 `jsonwebtoken` 簽發和驗證 JWT
- 使用 `bcryptjs` 進行密碼 hash（salt rounds: 10）
- JWT payload 包含: `userId`, `email`, `iat`, `exp`
- Token 有效期: 7 天
- Cookie 設定: `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`

**替代方案:** Supabase Auth — 第三方依賴,減少控制權; NextAuth.js — 過於複雜,功能超過 MVP 需求。

### 2. Protected Routes 使用 Middleware

**選擇:** Next.js middleware 層級的路由保護,檢查 JWT cookie

**理由:** 在請求到達頁面前就驗證 JWT; 統一管理所有受保護路由; 避免每個頁面重複檢查。

**實作:** `/middleware.ts` 讀取 JWT cookie,驗證 token 有效性,未登入導向 `/login`,已登入訪問 auth 頁面導向 `/dashboard`。

### 3. Google OAuth 整合

**選擇:** 使用 Google OAuth 2.0 API,搭配 `google-auth-library` 驗證 ID token

**理由:**
- 直接使用 Google 官方 library,避免第三方封裝
- 簡化整合流程,只需處理 OAuth callback
- 安全性高,由 Google 負責驗證

**實作流程:**
1. 前端使用 Google Sign-In button,取得 ID token
2. 將 ID token 傳送到後端 API
3. 後端用 `google-auth-library` 驗證 token 真實性
4. 驗證通過後,檢查 email 是否已存在:
   - 存在: 直接登入
   - 不存在: 建立新 user 記錄（plan='free'）
5. 簽發 JWT,設定 HTTP-only cookie

### 4. 密碼重設流程

**選擇:** Email reset token 方式

**理由:** 業界標準做法,安全性高,用戶體驗清楚。

**實作流程:**
1. 用戶輸入 email,點擊「忘記密碼」
2. 後端生成 reset token（random UUID）,儲存到 DB（包含過期時間: 1 小時）
3. 寄送 reset link email（包含 token）
4. 用戶點擊 link,進入重設密碼頁面
5. 驗證 token 有效性（未過期、未使用）
6. 用戶輸入新密碼,更新並標記 token 為已使用

**資料表設計:**
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. 播放器使用自建輕量元件

**選擇:** 基於 HTML5 `<audio>` 自建播放器元件

**理由:** 需求簡單（播放/暫停/進度/音量）; 避免引入第三方 library 的 bundle size; 可完全自訂 UI 風格。

**替代方案:** react-h5-audio-player — 功能豐富但 UI 自訂性差; howler.js — 偏向遊戲音效,過度複雜。

### 6. 生成歷史使用 Server Component + 分頁

**選擇:** Server Component 取得資料 + cursor-based 分頁

**理由:** Server Component 直接查詢資料庫,不需額外 API Route; cursor-based 分頁效能優於 offset 分頁。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Google OAuth 設定複雜（GCP Console） | 提供 step-by-step 設定文件 |
| 自建 Auth 需要處理更多安全細節 | 遵循 OWASP 最佳實踐,使用成熟的 crypto library |
| JWT token 無法主動撤銷（除非建立 blacklist） | 設定合理的過期時間（7 天）,敏感操作要求重新驗證 |
| 自建播放器可能有瀏覽器相容性問題 | 測試 Chrome、Safari、Firefox; 使用 HTML5 audio 標準 API |
| Email 發送服務可能有延遲或失敗 | 使用可靠的 email provider（如 SendGrid、AWS SES）,加入 retry 機制 |
