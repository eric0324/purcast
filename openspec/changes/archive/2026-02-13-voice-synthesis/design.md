## Context

語音合成是 PurCast 最核心的差異化環節——Voice Cloning 讓用戶能用自己的聲音做 Podcast。此模組接收結構化對話腳本，分段調用 TTS API 生成音檔，再用 ffmpeg 拼接成完整 Podcast。

這也是成本最高的環節（Pro 用戶單集 $1.20-1.50），以及耗時最長的環節（1-3 分鐘）。

## Goals / Non-Goals

**Goals:**
- Voice Cloning 品質讓用戶認得出自己的聲音
- 分段合成 + 拼接流程穩定可靠
- Provider-agnostic TTS 抽象層，便於 Phase 2 遷移開源 TTS
- 合成時間控制在 3 分鐘以內

**Non-Goals:**
- 不支援多人聲音克隆（僅 Host A，PRD §4.2）
- 不自建 GPU / 開源 TTS（Phase 2+）
- 不生成影片
- 不做即時串流合成

## Decisions

### 1. ElevenLabs API 使用 REST 直接呼叫

**選擇:** 直接使用 ElevenLabs REST API，不用官方 SDK

**理由:** REST API 足夠簡單（2 個 endpoint：clone + TTS）；減少依賴；更容易替換為其他 TTS provider。

**替代方案:** `elevenlabs` npm package — 增加依賴但不增加功能。

### 2. 分段合成使用並行請求（concurrency limit = 3）

**選擇:** 同時最多 3 個 TTS API 並行請求

**理由:** 25-35 段對話若逐段合成需 2-3 分鐘；並行可縮短到 1 分鐘內。限制併發避免觸發 API rate limit。

**替代方案:** 逐段合成 — 太慢；全部並行 — 可能觸發 rate limit。

### 3. ffmpeg 直接使用 VPS 系統安裝

**選擇:** 使用 `fluent-ffmpeg` npm 包裝，呼叫 VPS 上系統安裝的 ffmpeg

**理由:** Vultr VPS 環境可直接安裝 ffmpeg 套件；無需擔心 binary 相容性；執行效能更好。

**替代方案:** @ffmpeg-installer/ffmpeg — 適用於 Serverless 環境，但 VPS 上不需要；ffmpeg.wasm — 瀏覽器端方案，不適合 server-side。

### 4. 音檔格式使用 MP3 128kbps

**選擇:** 最終輸出 MP3 128kbps，分段使用 MP3

**理由:** MP3 瀏覽器相容性最好；128kbps 對語音內容品質足夠；檔案大小合理（10 分鐘約 9MB）。

**替代方案:** WAV — 檔案太大；AAC — 相容性略差；OGG — Safari 不支援。

### 5. VPS 直接同步處理，使用狀態輪詢

**選擇:** 合成 API 在 VPS 上直接同步處理整個流程，無 timeout 限制；前端透過狀態輪詢追蹤進度

**理由:** Vultr VPS 不受 Serverless Function timeout 限制；可完整處理 1-3 分鐘的合成流程；使用 podcast status 讓前端追蹤進度。

**流程:**
1. API 接收請求，更新 status 為 'generating_audio'，立即回傳 202
2. 背景處理：分段 TTS → ffmpeg 拼接 → 上傳 R2 → 更新 status 為 'completed'
3. 前端輪詢 podcast status 直到完成或失敗

**替代方案:** Vercel Background Functions — 仍有限制且增加複雜度；Worker Queue — 增加基礎設施。

### 6. TTS Provider 抽象層設計

**選擇:** 定義 `TTSProvider` interface

```typescript
interface TTSProvider {
  synthesize(text: string, voiceId: string): Promise<Buffer>
  cloneVoice(audioFile: Buffer, name: string): Promise<string> // returns voice_id
}
```

**理由:** 與 LLM Provider 一致的設計模式；Phase 2 遷移時只需實作新 provider。

### 7. 暫存檔使用 VPS /tmp 目錄

**選擇:** 分段音檔暫存在 `/tmp/purcast-audio-{podcastId}/`，拼接完成後刪除

**理由:** VPS /tmp 目錄有充足空間；處理完即清理，不佔用長期儲存；簡化檔案管理。

**清理策略:** 無論成功或失敗，處理結束後刪除整個暫存目錄。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| ElevenLabs API rate limit | 並行上限 3；加入 exponential backoff retry |
| 分段拼接出現音檔間隔不自然 | 在段間插入 300-500ms 靜音；調整 ffmpeg crossfade 參數 |
| Voice Clone 品質不穩定 | 要求用戶上傳清晰、安靜環境的錄音；提供錄音建議 |
| VPS 磁碟空間不足 | 定期清理 /tmp；設定最大同時處理數量 |
