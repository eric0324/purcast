## Context

腳本生成是 Podify 的核心 AI 能力——將文字內容轉化為自然的 Host A / Host B 雙人對話。這個模組接收 content-input 的輸出(純文字),透過 Claude API 產生結構化對話腳本,供下游 TTS 模組分段合成。

對話品質直接決定最終 Podcast 的聽感,是用戶是否願意付費的關鍵。

## Goals / Non-Goals

**Goals:**
- 產生自然、有互動感的雙人對話(提問、補充、總結)
- 輸出精確的結構化格式,便於 TTS 分段處理
- 控制對話長度在 8-12 分鐘(約 1,500-2,200 字對話)
- Provider-agnostic 設計,未來可切換 LLM
- 提供腳本預覽/編輯功能,讓用戶確認後再進入語音合成

**Non-Goals:**
- 不支援單人讀稿模式(V1.1)
- 不支援自訂對話風格模板
- 不開源 PodScript SDK(PRD §4.2)
- 不做即時串流生成(MVP 用批次)

## Decisions

### 1. 對話腳本使用 JSON 結構化輸出

**選擇:** 輸出為 JSON array,每個元素包含 `speaker` 和 `text`

```json
[
  { "speaker": "A", "text": "今天我們來聊聊..." },
  { "speaker": "B", "text": "這個話題很有趣..." }
]
```

**理由:** JSON 比 `[A]`/`[B]` 標記語法更容易解析,不會有邊界問題；Claude 支援 JSON mode 可確保輸出格式正確。

**替代方案:** `[A] ... [B] ...` 標記語法 — 簡單但需要自訂 parser,容易出現解析錯誤。

### 2. Provider-agnostic 抽象層使用 Interface + Factory Pattern

**選擇:** 定義 `LLMProvider` interface,透過 factory function 建立實例

```typescript
interface LLMProvider {
  generateScript(content: string, options: ScriptOptions): Promise<DialogueScript>
}
```

**理由:** 簡單明瞭,MVP 只需支援 Claude,但介面預留切換空間。不過度抽象。

**替代方案:** Vercel AI SDK — 功能更豐富但引入額外依賴；直接呼叫 Claude SDK — 最簡單但缺乏切換彈性。

### 3. Prompt 策略：System Prompt + Content Prompt 分離

**選擇:** System Prompt 定義角色與格式規範,User Prompt 傳入內容

**理由:** System Prompt 固定不變,可重複使用；User Prompt 動態傳入內容,清楚分離。

**Prompt 設計重點:**
- Host A 為主持人角色(引導話題、提問)
- Host B 為來賓角色(回應、補充、提供觀點)
- 要求自然對話風格,避免機械感
- 指定 JSON 輸出格式
- 控制對話長度(字數範圍)

### 4. 使用 Claude Sonnet 模型

**選擇:** `claude-sonnet-4-5-20250929`

**理由:** Sonnet 在品質與成本間取得平衡。每集成本約 $0.04-0.06(PRD §7.1),可負擔。

**替代方案:** Opus — 品質更好但成本高 3-5 倍；Haiku — 成本低但對話品質可能不足。

### 5. 長度控制透過 Prompt 指令

**選擇:** 在 Prompt 中明確指定目標對話段數(25-35 段來回)

**理由:** 比 token 數更直覺；Claude 對此類指令遵循度高。搭配 `max_tokens` 作為硬上限。

### 6. 腳本預覽/編輯流程

**選擇:** 生成腳本後 status 變為 'script_ready',用戶可在前端預覽並編輯對話內容,確認後再觸發語音合成

**理由:** 讓用戶有機會調整對話文字,確保內容符合需求；提升對最終成品的掌控感；避免浪費 TTS 成本於不滿意的腳本。

**流程:**
1. AI 生成腳本 → status: 'script_ready'
2. 前端顯示腳本預覽頁面,每段對話可編輯
3. 用戶確認/修改後點擊「確認並生成語音」
4. 儲存修改後的 script → status: 'generating_audio'

### 7. 自動偵測內容語言

**選擇:** 根據輸入內容自動偵測語言(中文/英文),不需用戶手動選擇

**理由:** 減少用戶決策負擔；Claude 有優秀的多語言能力,可自動適應輸入語言生成對應語言的對話。

**偵測邏輯:** 在 Prompt 中指示 Claude "根據以下內容的語言生成對應語言的對話"

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Claude API 回傳非 JSON 格式 | 使用 JSON mode；加入 retry 邏輯(最多 2 次) |
| 對話品質因內容主題而差異大 | Prompt 中加入各主題的示範範例；收集用戶回饋持續調整 |
| API 延遲導致用戶等待(30-60 秒) | 顯示進度狀態；未來可改用 streaming |
| 長文內容超過 context window | 截斷或摘要後再生成(50K 字元限制已在上游處理) |
| 用戶編輯腳本後品質下降 | 提供編輯建議 tooltip；限制每段對話長度避免過長 |
