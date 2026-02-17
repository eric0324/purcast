## 1. 用量追蹤核心邏輯

- [x] 1.1 建立 `src/lib/billing/usage.ts`：實作 `checkUsageLimit(userId)` 函式，回傳 `{ allowed, used, limit, plan }`。Free=5 集、Pro=Infinity。驗收：單元測試通過。
- [x] 1.2 實作 `incrementUsage(userId)` 函式：upsert usage 記錄，generation_count+1。驗收：單元測試通過，含首次生成和重複月份場景。
- [x] 1.3 修改 `POST /api/podcasts/create`：建立 Podcast 前呼叫 `checkUsageLimit`，超額回傳 403 + errorKey `usage.limitReached`。成功後在同 transaction 呼叫 `incrementUsage`。驗收：超額用戶被擋、正常用戶 usage 遞增。

## 2. Feature Gate

- [x] 2.1 建立 `src/lib/billing/feature-gate.ts`：實作 `checkFeatureAccess(userId, feature)` 函式，Voice Clone 需 plan='pro'。驗收：單元測試通過。
- [x] 2.2 修改 `POST /api/voices`：加入 plan 檢查，Free 用戶回傳 403 + errorKey `feature.proOnly`。驗收：Free 用戶被擋、Pro 用戶正常。
- [x] 2.3 修改 `DELETE /api/voices/[id]`：加入 plan 檢查，Free 用戶回傳 403。驗收：同上。

## 3. 用量查詢 API

- [x] 3.1 建立 `GET /api/usage` API Route：回傳 `{ used, limit, plan }`。驗收：正確回傳當月用量、未登入 401。

## 4. 前端 UI

- [x] 4.1 Create 頁面顯示用量：呼叫 `/api/usage` 顯示「本月已使用 X / 5 集」。超額時 disable 表單 + 顯示升級提示。驗收：用量正確顯示、超額時無法提交。
- [x] 4.2 Voices 頁面 Free 用戶鎖定：根據 plan 顯示鎖定畫面 + 升級提示，取代原本的 voice 管理 UI。驗收：Free 用戶看到鎖定、Pro 用戶正常使用。

## 5. i18n

- [x] 5.1 新增翻譯 key：`usage.limitReached`、`usage.monthlyUsage`、`usage.upgradePrompt`、`feature.proOnly`、`feature.voiceCloneLocked`。驗收：中英文翻譯完整。
