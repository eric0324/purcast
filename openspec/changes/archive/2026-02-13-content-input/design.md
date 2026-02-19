## Context

PurCast 的內容輸入模組是整個 Podcast 生成流程的起點。用戶需要一個簡單且可靠的方式將內容送入系統：

- **直接貼入文字**：適合已有文字檔的用戶（如筆記、腳本、文章草稿）
- **URL 自動擷取**：適合想將網路文章轉成 Podcast 的用戶

挑戰：網頁內容通常包含導覽列、廣告、側邊欄等雜訊；需正確處理中英文混合內容；過長內容需合理截斷。

## Goals / Non-Goals

**Goals:**
- 用戶可在 30 秒內完成內容輸入並進入下一步
- URL 擷取內容清晰度 > 90%（無導覽列、廣告等雜訊）
- 對無法擷取的 URL 提供明確錯誤訊息與建議
- 正確處理繁簡中文、英文內容

**Non-Goals:**
- 不支援 PDF/文件上傳（PRD §4.2）
- 不支援批次 URL 匯入
- 不支援 RSS 自動排程（V1.1）
- 不進行內容改寫或摘要，僅擷取與清理

## Decisions

### 1. URL 擷取使用 @mozilla/readability + jsdom

**選擇：** `@mozilla/readability` + `jsdom`

**理由：** Readability 是 Firefox Reader View 的核心演算法，成熟度高，支援多語言，能正確識別中文文章主體。jsdom 提供完整 DOM API，相容性最好。

**替代方案：** `cheerio` + 自訂規則 — 需維護複雜啟發式規則；`puppeteer` — 效能開銷大，需 headless browser 基礎設施。

### 2. 統一由後端 API 處理 URL 擷取

**選擇：** API Route (`/api/extract`) 執行 URL 擷取

**理由：** 避免 CORS 問題；隱藏用戶 IP；集中錯誤處理。

**替代方案：** 前端 fetch + CORS Proxy — 需額外維護 Proxy；第三方 API（Diffbot）— 成本高。

### 3. 內容長度限制 50,000 字元

**選擇：** 單次輸入上限 50,000 字元（約 2 萬中文字）

**理由：** 匹配下游 LLM context window 限制；避免前端卡頓；一般長文約 5,000-15,000 字。超過限制自動截斷並提示。

### 4. URL 擷取 API 為同步操作

**選擇：** `/api/extract` 為同步 API，等待完成後回傳

**理由：** 大多數擷取在 2-5 秒內完成；簡化前端邏輯；避免引入 Job Queue。設定 10 秒 timeout。

### 5. 儲存清理後內容而非原始 HTML

**選擇：** `podcasts.source_content` 儲存清理後文字

**理由：** 下游腳本生成直接使用；避免重複處理；節省儲存空間。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| jsdom 記憶體用量高，複雜網頁可能溢出 | 設定 10 秒 timeout；限制 HTML 2MB；監控記憶體 |
| Readability 無法正確識別所有網站 | 提供「擷取失敗，請手動複製貼上」友善提示 |
| 同步 API 導致前端等待過久 | 顯示載入提示；10 秒 timeout 後建議手動貼上 |
| 內容截斷可能丟失重要資訊 | Readability 自動過濾側邊欄；UI 顯示截斷警告 |

## Resolved Questions

- **付費牆內容**：MVP 不支援付費牆內容擷取（如 Medium 付費文章），用戶需手動複製貼上。
- **圖片 URL**：不保留圖片 URL，擷取時移除所有圖片標籤。未來若需要封面圖功能再考慮。
