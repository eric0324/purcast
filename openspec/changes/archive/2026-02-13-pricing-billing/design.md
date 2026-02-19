## Context

PurCast 採用 Free/Pro 雙層月訂閱制，需要藍新金流 NewebPay 整合處理付款、用量追蹤控制生成次數、功能門控限制 Voice Clone 存取。這是商業模式驗證的核心——觀察 Free → Pro 轉換率來驗證用戶是否願意為 Voice Clone 付費。

## Goals / Non-Goals

**Goals:**
- NewebPay MPG 付款流程順暢，3 步完成訂閱
- 用量追蹤準確，不允許超出方案限制
- Feature gating 即時生效，升級後立即可用 Voice Clone
- Notify URL callback 處理穩定，不遺漏任何訂閱事件
- 取消訂閱後允許用完當月額度

**Non-Goals:**
- 不支援團隊/企業方案（PRD §4.2）
- 不支援年繳或 credit-based 模式
- 不自動計稅（NewebPay 不需要）
- 不支援退款自動化（手動處理）

## Decisions

### 1. 使用 NewebPay MPG（Multi Payment Gateway）

**選擇：** 前端產生 AES 加密表單，POST 到 NewebPay，付款完成後透過 Return URL（前端）和 Notify URL（後端）callback

**理由：** NewebPay MPG 是台灣主流金流，支援信用卡、ATM、超商代碼等多元支付；前端 form POST 簡化整合流程；AES 加密確保資料安全性。

**實作：**
- 後端產生加密的 MPG 表單資料（TradeInfo）
- 前端自動 submit form 到 NewebPay
- 付款完成後 NewebPay redirect 回 Return URL（前端頁面）
- NewebPay 同時 POST 付款結果到 Notify URL（後端 API）
- Notify URL 驗證 AES 解密後更新訂閱狀態

### 2. Notify URL callback 使用 AES 驗證 + 冪等處理

**選擇：** NewebPay Notify URL callback + AES 解密驗證 + 交易編號冪等檢查

**理由：** NewebPay 使用 AES 加密傳輸付款結果，需解密並驗證 CheckCode；可能重複發送 callback，需確保同一交易不重複處理。

**實作：**
- 接收 NewebPay POST 的加密資料（TradeInfo）
- 使用 HashKey 和 HashIV 解密
- 驗證 CheckCode（SHA256 hash）
- 使用交易編號（MerchantOrderNo）作為冪等 key
- 根據 Status 更新 users.plan 和 subscription_end_date

### 3. 用量追蹤使用自建 DB 計數

**選擇：** 在 `usage` 表中追蹤月度生成次數

**理由：** 簡單可靠；固定額度模式不需要複雜的計量計費；DB 操作比 API 呼叫快。

**實作：** 生成前檢查 usage.generation_count < 方案上限，生成成功後 increment。使用 database transaction 確保計數準確。

### 4. Feature Gating 使用 API + Frontend 雙層檢查

**選擇：** API Route 層級強制檢查 + 前端 UI 層級引導

**理由：** API 層確保安全性（無法繞過）；前端層提供好的 UX（提前告知用戶需要升級）。

**實作：**
- API：`checkFeatureAccess(userId, feature)` middleware
- 前端：根據 user.plan 條件渲染 UI（隱藏或顯示升級提示）

### 5. 取消訂閱後允許用完當月

**選擇：** 使用 subscription_end_date 記錄訂閱到期日，到期前仍可使用 Pro 功能

**理由：** 符合業界標準（Stripe、Netflix 等都是用完當期）；提供更好的用戶體驗。

**實作：**
- 取消訂閱時設定 subscription_end_date = 當月最後一天
- Feature gate 檢查：user.plan === 'pro' || (user.subscription_end_date && now < subscription_end_date)
- 每日排程檢查過期訂閱，自動降級為 Free

### 6. 月度用量自動重置

**選擇：** 不主動重置，查詢時以當月 YYYY-MM 為 key

**理由：** 每月自動產生新的 usage 記錄（first generation of month creates row），無需 cron job 重置。簡單且無額外基礎設施。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Notify URL callback 延遲導致付款後無法立即使用 | Return URL 頁面主動輪詢 user plan 狀態 |
| 併發生成導致用量超額 | 使用 DB transaction + row-level lock 確保計數原子性 |
| 測試模式與正式模式切換 | 環境變數區分，確保 production 用正式 MerchantID |
| NewebPay callback 失敗遺漏訂閱更新 | Return URL 作為備援，前端偵測到付款成功但 plan 未更新時觸發手動同步 |
| AES 加解密實作錯誤 | 使用官方範例程式碼，撰寫單元測試驗證加解密正確性 |
