## 1. LLM Provider 抽象層 [PRD §6.1]

- [ ] 1.1 定義 TypeScript 介面：`LLMProvider`、`ScriptOptions`、`DialogueScript`、`DialogueLine` 型別在 `src/types/llm.ts`。驗收：型別可正確匯入使用。
- [ ] 1.2 建立 `src/lib/llm/provider.ts`：實作 factory function `createLLMProvider()`，預設回傳 Claude provider。驗收：呼叫 factory 回傳正確的 provider 實例。
- [ ] 1.3 安裝 `@anthropic-ai/sdk`，建立 `src/lib/llm/claude.ts`：實作 `ClaudeProvider` class。驗收：可成功初始化並呼叫 Claude API。

## 2. Prompt 設計 [PRD §4.1 ②]

- [ ] 2.1 建立 `src/lib/llm/prompts.ts`：撰寫 system prompt（定義雙人角色、對話風格、JSON 輸出格式、語言自動偵測指示）。驗收：Prompt 結構完整，包含角色定義、格式要求與語言自動適應指令。
- [ ] 2.2 實作 user prompt 組裝函式 `buildUserPrompt(content, options)`：傳入內容與選項（目標長度），輸出完整 user prompt。驗收：不同長度的內容都能正確組裝。
- [ ] 2.3 測試 Prompt 效果：用 3 篇不同主題/語言（中英文各至少 1 篇）的文章測試生成品質。驗收：對話自然、格式正確、長度在目標範圍內、語言正確對應。

## 3. 腳本生成 API [PRD §4.1 ②]

- [ ] 3.1 建立 `/api/generate-script` API Route (`src/app/api/generate-script/route.ts`)：接收 POST `{ podcastId }`，驗證用戶權限。驗收：可接收請求，未授權回傳 401。
- [ ] 3.2 實作生成流程：讀取 podcast source_content → 更新 status 為 generating_script → 呼叫 LLM → 解析 JSON → 儲存 script → 更新 status 為 script_ready。驗收：完整流程正確執行，status 正確更新為 script_ready。
- [ ] 3.3 實作 JSON 解析與驗證：確保回傳是合法的 DialogueScript 格式，每個元素有 speaker 和 text。驗收：非法 JSON 觸發 retry。
- [ ] 3.4 實作 retry 邏輯：JSON parse 失敗最多 retry 2 次，API timeout retry 1 次。驗收：transient 錯誤正確 retry，permanent 錯誤直接 fail。
- [ ] 3.5 實作錯誤處理：失敗時更新 podcast status 為 failed 並記錄 error_message。驗收：失敗後 podcast 記錄包含錯誤訊息。

## 4. 腳本預覽/編輯頁面 [PRD §5.1]

- [ ] 4.1 建立腳本編輯頁面（`src/app/(dashboard)/create/[id]/edit/page.tsx`）：讀取 podcast 資料，驗證 status 為 script_ready。驗收：只有 script_ready 狀態的 podcast 可進入編輯頁面。
- [ ] 4.2 實作對話列表元件：顯示 [A]/[B] 對話列表，每段對話顯示 speaker label + 可編輯的 textarea。驗收：對話列表正確顯示，保持對話順序。
- [ ] 4.3 實作編輯功能：每段對話的 textarea 可編輯，限制最多 500 字元，顯示字元計數。驗收：可編輯文字，超過 500 字元顯示警告。
- [ ] 4.4 實作儲存與提交：「確認並生成語音」按鈕，儲存修改後的 script 到 DB，觸發 `/api/synthesize` API，更新 status 為 generating_audio。驗收：儲存成功後導向進度頁面。
- [ ] 4.5 實作狀態提示：若 podcast 不在 script_ready 狀態，顯示相應提示（生成中/已完成/失敗）。驗收：不同狀態顯示對應提示訊息。

## 5. 前端生成流程整合 [PRD §5.1]

- [ ] 5.1 更新生成進度頁面（`src/app/(dashboard)/create/[id]/page.tsx`）：顯示當前生成狀態（內容處理中 → 腳本生成中 → 腳本完成 → 語音合成中 → 完成）。驗收：狀態正確顯示並即時更新。
- [ ] 5.2 實作輪詢機制：每 3 秒查詢 podcast status，當 status 變為 script_ready 時自動導向編輯頁面。驗收：status 變化時 UI 即時反映並正確跳轉。
- [ ] 5.3 新增「跳過編輯」選項：在腳本完成頁面提供「跳過編輯，直接生成語音」按鈕。驗收：用戶可選擇直接進入語音合成或先編輯腳本。
