## Why

Podify 目前沒有用量限制，任何用戶都可以無限生成 Podcast 和使用 Voice Clone，無法控制 API 成本（Claude + TTS 每集約 NT$3-5）。需要用量追蹤和功能門控來：1) 控制成本風險 2) 建立 Free/Pro 差異化基礎。

## What Changes

- 用量追蹤系統：
  - Free 方案每月上限 5 集
  - 生成 Podcast 前檢查當月用量，超額阻止生成
  - 生成成功後遞增計數（DB transaction 確保原子性）
  - 用量按月份 YYYY-MM 為 key，無需 cron 重置
- Feature Gate（功能門控）：
  - Voice Clone 功能鎖定，僅 Pro 用戶可用
  - Voice Clone API（上傳/刪除）加入 plan 檢查
  - 前端 Voices 頁面 Free 用戶顯示鎖定 + 升級提示
- 用量顯示 UI：
  - Dashboard 顯示「本月已使用 X / 5 集」
  - 超額時顯示升級 Pro 提示（Pro 尚未開放，提示「即將推出」）

## Capabilities

### New Capabilities
- `usage-tracking`: 用量追蹤邏輯 — 月度計數、上限檢查、遞增、用量查詢 API
- `feature-gating`: 功能門控 — 根據 user.plan 控制 Voice Clone 存取

### Modified Capabilities
<!-- 無既有 spec 需修改 -->

## Impact

- 修改 API：`POST /api/podcasts/create` 加入用量檢查、成功後遞增
- 修改 API：`POST /api/voices`、`DELETE /api/voices/[id]` 加入 plan 檢查
- 新增 API：`GET /api/usage` 回傳當月用量
- 修改前端：create 頁面顯示剩餘額度、Voices 頁面 Free 用戶鎖定
- DB：使用既有 `usage` 表，無需 migration

## Out of Scope

- Pro 方案金流整合（NewebPay）— 另案處理
- 訂閱管理（升級/降級/取消）— 另案處理
- Pro 用戶的用量上限（待定價後決定）
- 年繳方案、團隊方案（PRD §4.2）
