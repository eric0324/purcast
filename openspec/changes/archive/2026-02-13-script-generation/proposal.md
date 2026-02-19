## Why

將文字內容轉化為自然的雙人對話腳本是 PurCast 的核心 AI 能力。相比單人讀稿，雙人對話模式（Host A / Host B）更能吸引聽眾、更具 Podcast 的真實感。透過 Claude API 生成結構化對話腳本，為後續的 TTS 語音合成提供精確的分段輸入。（參考 PRD §4.1 ②）

## What Changes

- 實作 Claude API 整合，使用 Provider-agnostic 抽象層設計（參考 PRD §6.1）
- 設計 Prompt 模板：將輸入內容轉化為 Host A / Host B 的雙人對話腳本
- 對話風格要求：自然互動、包含提問、補充、總結等元素
- 輸出結構化 JSON 格式：`[{ speaker: "A", text: "..." }, ...]` 方便 TTS 分段處理
- 目標長度控制：8-12 分鐘的對話量（可調整）
- 支援中英文內容的腳本生成
- 儲存生成的腳本到 `podcasts` 表的 `script` 欄位

## Capabilities

### New Capabilities
- `script-generation`: Claude API 驅動的雙人對話腳本生成引擎，包含 Prompt 設計、結構化輸出解析、長度控制
- `llm-provider`: LLM Provider 抽象層，支援未來切換不同 LLM 供應商

### Modified Capabilities
<!-- 無既有 capabilities 需修改 -->

## Impact

- 新增 API Route：`/api/generate-script`
- 依賴 Claude API（Sonnet 模型），每集成本約 $0.04-0.06（參考 PRD §7.1）
- 輸出格式直接影響下游「語音合成」模組的分段邏輯
- 需要精心設計 Prompt 以確保對話品質

## Out of Scope

參考 PRD §4.2：不包含單人讀稿模式（V1.1）、自訂對話風格模板、PodScript SDK。僅支援固定的雙人對話模式。
