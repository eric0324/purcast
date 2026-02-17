## Why

Voice Cloning 是 Podify 的核心差異化特色——讓用戶用自己的聲音做 Podcast，而非千篇一律的 AI 預設聲音。這是驅動 Free → Pro 轉換的關鍵功能。語音合成模組負責將對話腳本轉化為實際音檔，包含 Voice Cloning 流程和 TTS 合成。（參考 PRD §4.1 ③）

## What Changes

- 整合 ElevenLabs Flash API 作為 Phase 1 的 TTS Provider
- Voice Cloning 流程：用戶上傳 1-3 分鐘音檔 → ElevenLabs clone API → 取得 voice_id
- TTS 合成邏輯：
  - Host A：用戶的 Clone 聲音（Pro）或預設 AI 聲音（Free）
  - Host B：固定預設 AI 聲音
- 分段合成：將 `[A]`/`[B]` 標記的腳本各段分別調用 TTS API
- 音檔拼接：使用 ffmpeg 將所有分段音檔拼接為完整 Podcast（加入適當間隔和轉場）
- 上傳完成的音檔至 Cloudflare R2
- 更新 `podcasts` 表的 `audio_url`、`duration`、`status` 欄位
- 儲存克隆聲音資訊到 `voices` 表

## Capabilities

### New Capabilities
- `voice-cloning`: 聲音克隆流程，包含音檔上傳、ElevenLabs clone API 整合、voice_id 管理
- `tts-synthesis`: TTS 語音合成引擎，分段合成 + Provider-agnostic 抽象層
- `audio-processing`: ffmpeg 音檔拼接、格式轉換、間隔插入、上傳至 R2

### Modified Capabilities
<!-- 無既有 capabilities 需修改 -->

## Impact

- 新增 API Routes：`/api/clone-voice`、`/api/synthesize`
- 依賴 ElevenLabs Flash API，Pro 用戶單集成本約 $1.20-1.50（參考 PRD §7.1）
- 依賴 ffmpeg（VPS 上系統安裝，無 Serverless timeout 限制）
- 依賴 Cloudflare R2 儲存
- 這是整個生成流程中耗時最長的環節（1-3 分鐘）

## Out of Scope

參考 PRD §4.2：不包含多人聲音克隆（僅 Host A）、自建 GPU/開源 TTS（Phase 2+）、影片生成。Phase 1 僅使用 ElevenLabs 作為 TTS Provider。
