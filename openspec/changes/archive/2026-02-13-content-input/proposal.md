## Why

PurCast 的核心價值始於「內容輸入」——用戶需要一個簡單的方式將文字內容匯入系統。支援直接貼入文字和 URL 自動擷取兩種方式，降低使用門檻，讓用戶在幾秒內就能開始生成 Podcast。（參考 PRD §4.1 ①）

## What Changes

- 建立內容輸入頁面 UI：文字輸入框（支援長文貼入）+ URL 輸入框
- 實作 URL 內容擷取 API Route：使用 Readability 演算法從網頁抽取主要內容
- 支援中英文內容的正確處理
- 內容前處理：清除 HTML 標籤、正規化格式、截斷過長內容
- 內容驗證：檢查字數限制、URL 格式驗證、擷取失敗的錯誤處理
- 儲存原始內容到 `podcasts` 表的 `source_type` 和 `source_content` 欄位

## Capabilities

### New Capabilities
- `content-input`: 文字貼入與 URL 擷取功能，包含內容前處理與驗證邏輯
- `url-extraction`: URL 內容擷取引擎，使用 Readability 演算法解析網頁內容

### Modified Capabilities
<!-- 無既有 capabilities 需修改 -->

## Impact

- 新增 API Route：`/api/extract`（URL 內容擷取）
- 新增頁面元件：內容輸入表單
- 依賴 `podcasts` 表（source_type, source_content 欄位）
- 此模組的輸出是下游「腳本生成」模組的輸入

## Out of Scope

參考 PRD §4.2：不包含 RSS 自動排程匯入、PDF/文件上傳、批次 URL 匯入。僅支援單次手動輸入。
