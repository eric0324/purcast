## 1. 內容輸入頁面 UI [PRD §4.1 ①]

- [ ] 1.1 建立內容輸入頁面 (`src/app/(dashboard)/create/page.tsx`)：包含 Tab 切換（文字貼入 / URL 擷取）。驗收：頁面正常顯示，可切換 Tab。
- [ ] 1.2 實作文字貼入 Tab：Textarea 元件（50,000 字元上限）、即時字數統計、超出限制自動截斷並警告。驗收：字數正確顯示，超限截斷並提示。
- [ ] 1.3 實作 URL 輸入 Tab：URL Input + 格式驗證（http/https）+ 「擷取」按鈕。驗收：無效 URL 顯示錯誤，有效 URL 啟用按鈕。
- [ ] 1.4 實作 Tab 切換確認對話框：已有內容時切換顯示確認。驗收：確認後清除內容。
- [ ] 1.5 實作「下一步」按鈕：字數 >= 100 時啟用，點擊儲存到 podcasts 表並導向下一步。驗收：正確儲存並跳轉。

## 2. 內容前處理工具 [PRD §4.1 ①]

- [ ] 2.1 建立 `src/lib/content/clean.ts`：實作 `stripHtmlTags()`、`normalizeWhitespace()`、`truncateContent()` 函式。驗收：各函式正確處理輸入。
- [ ] 2.2 實作 `validateContent(text)` 驗證函式：檢查非空且 >= 100 字元。驗收：邊界條件正確。

## 3. URL 擷取 API [PRD §4.1 ①]

- [ ] 3.1 安裝 `@mozilla/readability`、`jsdom`、`he`。驗收：套件安裝成功。
- [ ] 3.2 建立 `/api/extract` API Route (`src/app/api/extract/route.ts`)：接收 POST `{ url }`。驗收：可接收請求。
- [ ] 3.3 實作 URL 驗證 + HTML 抓取：格式驗證、10 秒 timeout、2MB 大小限制、非 2xx 錯誤處理。驗收：各錯誤情境回傳正確狀態碼。
- [ ] 3.4 實作 Readability 解析 + 內容清理：jsdom 解析 → Readability 擷取 → 移除 HTML → 解碼 entities → 截斷。驗收：一般文章網站正確擷取純文字。
- [ ] 3.5 實作回傳格式 `{ title, content, url, truncated }` 與失敗處理（422）。驗收：成功/失敗回傳格式正確。

## 4. 前端 URL 擷取整合 [PRD §4.1 ①]

- [ ] 4.1 實作擷取載入狀態：Spinner + 「正在擷取...」文字。驗收：擷取期間顯示載入。
- [ ] 4.2 實作擷取結果預覽：顯示標題 + 前 200 字預覽 + 「使用此內容」按鈕。驗收：成功後顯示預覽。
- [ ] 4.3 實作錯誤處理 UI：根據狀態碼顯示對應中文錯誤訊息。驗收：各錯誤顯示友善提示。

## 5. 資料庫儲存 [PRD §6.3]

- [ ] 5.1 建立 Server Action `createPodcast()`：插入 podcasts 表，回傳 podcast id。驗收：text 和 url 兩種類型都正確儲存。
