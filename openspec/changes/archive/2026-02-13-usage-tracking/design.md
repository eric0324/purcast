## Context

PurCast 目前無用量限制，所有用戶可無限生成 Podcast 和使用 Voice Clone。DB 已有 `usage` 表（userId + month + generation_count）和 `users.plan` 欄位（free/pro），但尚未在任何 API 中使用。

## Goals / Non-Goals

**Goals:**
- Free 用戶每月最多 5 集，超額擋住並提示升級
- Voice Clone 功能僅 Pro 用戶可用，Free 用戶前後端都擋住
- 用量計數原子性，不允許併發超額
- 前端清楚顯示剩餘額度

**Non-Goals:**
- 不處理 Pro 方案的金流和訂閱管理
- 不定義 Pro 用戶的用量上限（暫設為不限制）
- 不做計費相關的 cron job

## Decisions

### 1. 用量檢查放在 POST /api/podcasts/create

**選擇：** 在建立 Podcast 記錄前檢查用量，超額直接回傳 403

**理由：** 這是生成流程的入口，最早攔截。不在 generate-script 或 synthesize 攔截，避免 Podcast 記錄已建立但無法完成。

**實作：**
- `checkUsageLimit(userId)` → 查詢 usage 表當月記錄 vs 方案上限
- Free: 5 集、Pro: 不限制（`Infinity`）
- 回傳 `{ allowed: boolean, used: number, limit: number }`

### 2. 用量遞增放在 Podcast 建立成功後

**選擇：** 在 `POST /api/podcasts/create` 成功建立 Podcast 記錄後，同 transaction 遞增用量

**理由：** 用量對應「建立 Podcast」而非「完成生成」，避免生成失敗不扣額度導致用戶反覆重試的成本風險。

**實作：**
- `incrementUsage(userId)` → upsert usage 記錄，generation_count + 1
- 使用 Prisma transaction 確保 Podcast create + usage increment 原子性

### 3. Feature Gate 使用 plan 欄位直接判斷

**選擇：** `checkFeatureAccess(userId, feature)` 直接讀取 user.plan

**理由：** MVP 階段只有一個 gate（Voice Clone），不需要複雜的權限系統。未來加入 subscription_end_date 判斷也很容易擴充。

**實作：**
- Voice Clone API（POST /api/voices）：檢查 plan === 'pro'，否則回傳 403
- 前端 Voices 頁面：根據 plan 顯示鎖定 UI 或正常功能

### 4. 用量查詢 API 回傳簡單結構

**選擇：** `GET /api/usage` 回傳 `{ used, limit, plan }`

**理由：** 前端只需要這三個值來渲染用量條和升級提示。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 併發建立 Podcast 導致超額 | Prisma transaction + DB unique constraint (userId, month) |
| 生成失敗但已扣額度 | 接受此 trade-off，避免重試成本。未來可考慮退還機制 |
| Pro 方案上線前 Feature Gate 會影響現有用戶 | Voice Clone 本來就是 Pro 賣點，Free 用戶預期不能用 |
