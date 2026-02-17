## Why

Podify 採用 Free/Pro 雙層訂閱制，需要計費系統來管理訂閱、追蹤用量、控制功能存取。這是商業模式驗證的核心——透過 Voice Cloning 功能驅動 Free → Pro 的轉換率。（參考 PRD §4.1 ⑤、§8 Pricing）

## What Changes

- 整合藍新金流 NewebPay 訂閱計費：
  - Free tier：$0/月，2 集/月，僅預設 AI 聲音
  - Pro tier：$14.99/月，15 集/月，Voice Clone 功能
- 用量追蹤系統：記錄每月生成次數，達到上限時阻止生成
- 方案升級/降級流程：Free → Pro 升級、Pro 取消訂閱（允許用完當月）
- NewebPay Notify URL callback 處理：訂閱建立、付款成功/失敗、取消等事件
- 功能門控（Feature Gating）：Voice Clone 功能僅限 Pro 用戶
- 用量顯示 UI：讓用戶看到本月剩餘生成次數
- 儲存用量資料到 `usage` 表
- 自建訂閱管理頁面：查看訂閱狀態、取消訂閱、查看到期日

## Capabilities

### New Capabilities
- `newebpay-billing`: 藍新金流訂閱整合，MPG 表單、Notify/Return URL callback 處理
- `usage-tracking`: 用量追蹤與限制，月度計數、上限檢查、重置邏輯
- `feature-gating`: 功能門控邏輯，根據用戶方案控制 Voice Clone 等功能的存取

### Modified Capabilities
<!-- 無既有 capabilities 需修改 -->

## Impact

- 新增 API Routes：`/api/billing/checkout`、`/api/billing/manage`、`/api/billing/cancel`、`/api/billing/notify`、`/api/billing/return`
- 新增頁面元件：方案選擇、用量顯示、升級提示、訂閱管理頁面
- 依賴 NewebPay MPG API + Notify URL callback
- 用量追蹤邏輯會影響「語音合成」和「腳本生成」模組（生成前需檢查用量）
- 依賴 `users`（plan、subscription_end_date 欄位）和 `usage` 資料表

## Out of Scope

參考 PRD §4.2：不包含團隊/企業方案、年繳方案、一次性購買（credit-based）模式。MVP 僅支援月訂閱制。
