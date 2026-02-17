## 1. NewebPay MPG 整合 [PRD §4.1 ⑤]

- [ ] 1.1 安裝 NewebPay SDK 或實作 AES 加解密工具函式。在 NewebPay 後台建立 Pro 方案設定（$14.99/月）。驗收：AES 加解密單元測試通過。
- [ ] 1.2 建立 `/api/billing/checkout` API Route：產生 AES 加密的 MPG 表單資料（TradeInfo），回傳給前端。驗收：API 回傳正確加密的表單資料。
- [ ] 1.3 建立 MPG 付款頁面：前端接收 TradeInfo 後自動 submit form 到 NewebPay。驗收：點擊升級後正確跳轉到 NewebPay 付款頁面。
- [ ] 1.4 建立付款結果頁面：`/billing/success`（Return URL）和 `/billing/cancel`。驗收：付款完成/取消後正確導向，success 頁面輪詢 plan 狀態。

## 2. NewebPay Notify URL callback 處理 [PRD §4.1 ⑤]

- [ ] 2.1 建立 `/api/billing/notify` API Route：接收 NewebPay POST，解密 TradeInfo，驗證 CheckCode。驗收：CheckCode 驗證正確，非法請求回傳 400。
- [ ] 2.2 處理付款成功：Status=SUCCESS 時更新 users.plan='pro'，儲存 newebpay_trade_no，設定 subscription_start_date。驗收：付款成功後 user plan 更新。
- [ ] 2.3 處理付款失敗：Status != SUCCESS 時記錄日誌，不更新 plan。驗收：付款失敗有 log 記錄，plan 維持 free。
- [ ] 2.4 實作冪等處理：記錄已處理的 MerchantOrderNo，跳過重複 callback。驗收：重複 callback 不會重複處理。
- [ ] 2.5 建立 `/api/billing/return` API Route：處理 Return URL 的前端 redirect，解密並顯示付款結果。驗收：前端正確顯示付款成功/失敗訊息。

## 3. 訂閱管理 [PRD §4.1 ⑤]

- [ ] 3.1 建立 `/billing/manage` 頁面：顯示訂閱狀態、下次扣款日期、取消訂閱按鈕。驗收：Pro 用戶可查看訂閱資訊。
- [ ] 3.2 建立 `/api/billing/cancel` API Route：處理取消訂閱，設定 subscription_end_date = 當月最後一天。驗收：取消後 subscription_end_date 正確設定。
- [ ] 3.3 實作訂閱到期檢查邏輯：每日 cron job 檢查 subscription_end_date < today，自動降級為 Free。驗收：過期訂閱自動降級。
- [ ] 3.4 實作續訂功能：cancelled 用戶可點擊「續訂」重新走 MPG 流程。驗收：續訂後 subscription_end_date 清空，plan 恢復 pro。

## 4. 用量追蹤 [PRD §4.1 ⑤]

- [ ] 4.1 建立 `src/lib/billing/usage.ts`：實作 `checkUsageLimit(userId)` 函式，查詢當月用量是否超過方案上限（考慮 subscription_end_date）。驗收：Free 用戶 2 集、Pro 用戶 15 集上限正確檢查，cancelled 但未到期的 Pro 用戶仍可用 15 集。
- [ ] 4.2 實作 `incrementUsage(userId)` 函式：使用 DB transaction 原子性增加計數。驗收：並發呼叫不會超額。
- [ ] 4.3 在生成 API 整合用量檢查：生成前呼叫 `checkUsageLimit`，達上限回傳 429。驗收：超額用戶無法生成。
- [ ] 4.4 實作用量顯示 API：回傳當月用量和方案上限，包含 subscription_end_date 資訊。驗收：前端可顯示 "X / Y 集" 及到期提示。

## 5. Feature Gating [PRD §8]

- [ ] 5.1 建立 `src/lib/billing/feature-gate.ts`：實作 `checkFeatureAccess(userId, feature)` 函式，檢查 plan='pro' 或 subscription_end_date 未到期。驗收：Free 用戶存取 Voice Clone 回傳 false，cancelled 但未到期的 Pro 用戶回傳 true。
- [ ] 5.2 在 Voice Clone API 整合 feature gate：clone 和 synthesize 時檢查 Pro 權限。驗收：Free 用戶呼叫 clone API 回傳 403，expired 用戶同樣 403。
- [ ] 5.3 實作前端 plan-aware 元件：建立 `<ProFeature>` wrapper 元件，Free 用戶顯示 lock + 升級提示，cancelled 用戶顯示到期提示。驗收：Free 用戶看到升級提示，Pro 用戶正常使用，cancelled 用戶看到到期倒數。

## 6. 定價 UI [PRD §8]

- [ ] 6.1 建立定價方案比較元件（Free vs Pro 表格），整合在設定頁面和 Landing Page。驗收：方案差異清楚呈現。
- [ ] 6.2 建立用量顯示元件：Dashboard 顯示「本月已使用 X / Y 集」+ 進度條，包含到期提示。驗收：用量即時正確顯示，cancelled 用戶看到到期日。
- [ ] 6.3 建立升級提示元件：Free 用戶達到上限或點擊 Pro 功能時顯示。驗收：提示文案正確，點擊可跳轉 NewebPay MPG。
- [ ] 6.4 建立續訂提示元件：cancelled 用戶接近到期時顯示續訂 CTA。驗收：到期前 7 天顯示續訂提示。

## 7. 環境變數與部署 [PRD §4.1 ⑤]

- [ ] 7.1 設定環境變數：NEWEBPAY_MERCHANT_ID、NEWEBPAY_HASH_KEY、NEWEBPAY_HASH_IV、NEWEBPAY_API_URL（測試/正式環境）。驗收：環境變數正確載入。
- [ ] 7.2 設定 NewebPay 後台 Notify URL 和 Return URL。驗收：callback 正確觸發。
- [ ] 7.3 撰寫 NewebPay 整合測試文件：測試流程、測試卡號、預期結果。驗收：QA 可依文件完成測試。
