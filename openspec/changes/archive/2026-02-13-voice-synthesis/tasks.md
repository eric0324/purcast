## 1. TTS Provider 抽象層 [PRD §6.1]

- [ ] 1.1 定義 TypeScript 型別：`TTSProvider` interface、`SynthesizeOptions` 在 `src/types/tts.ts`。驗收：型別可正確匯入。
- [ ] 1.2 建立 `src/lib/tts/provider.ts`：factory function `createTTSProvider()`。驗收：回傳 ElevenLabs provider 實例。
- [ ] 1.3 建立 `src/lib/tts/elevenlabs.ts`：實作 `ElevenLabsProvider` class，包含 `synthesize()` 和 `cloneVoice()` 方法。驗收：可成功呼叫 ElevenLabs API。

## 2. Voice Cloning [PRD §4.1 ③、§5.2]

- [ ] 2.1 建立 `/api/voices/clone` API Route：接收音檔上傳（multipart/form-data），驗證格式（MP3/WAV/M4A）、大小（<10MB）、長度（>30s）。驗收：不合規格的檔案回傳正確錯誤。
- [ ] 2.2 實作 ElevenLabs clone 整合：上傳音檔至 R2 → 呼叫 ElevenLabs Add Voice API → 儲存 voice_id 到 voices 表。驗收：上傳成功後可在 voices 表查到記錄。
- [ ] 2.3 建立 `/api/voices/[id]` DELETE API Route：刪除 ElevenLabs voice → 刪除 voices 記錄 → 刪除 R2 檔案。驗收：刪除後三處資料皆清除。

## 3. TTS 分段合成 [PRD §4.1 ③]

- [ ] 3.1 建立 `src/lib/tts/synthesize-script.ts`：實作 `synthesizeScript(script, voiceAId, voiceBId)` 函式，將對話腳本分段合成。驗收：輸入腳本輸出 Buffer 陣列。
- [ ] 3.2 實作並行控制（concurrency = 3）：使用 p-limit 或手寫 semaphore 控制並行數。驗收：同時最多 3 個 API 請求。
- [ ] 3.3 實作 retry 邏輯：單段失敗最多 retry 2 次，含 exponential backoff。驗收：暫時性錯誤可自動恢復。
- [ ] 3.4 實作聲音選擇邏輯：Pro 用戶 Host A 用 cloned voice，Free 用戶用預設；Host B 固定預設。驗收：不同方案用戶使用正確的 voice_id。

## 4. VPS 環境設定與音檔處理 [PRD §6.1]

- [ ] 4.1 在 VPS 上安裝 ffmpeg：執行 `apt update && apt install -y ffmpeg`。驗收：`ffmpeg -version` 回傳版本資訊。
- [ ] 4.2 安裝 `fluent-ffmpeg`（不需安裝 @ffmpeg-installer/ffmpeg）。建立 `src/lib/audio/concat.ts`，設定 ffmpeg 路徑為系統路徑。驗收：套件安裝成功，可呼叫系統 ffmpeg。
- [ ] 4.3 實作 `concatSegments(segments: Buffer[], podcastId: string)`：建立 `/tmp/purcast-audio-{podcastId}/` 目錄暫存音檔，將多段音檔拼接為一個 MP3，段間插入 400ms 靜音。驗收：輸出完整 MP3 可正常播放。
- [ ] 4.4 實作 `getAudioDuration(buffer: Buffer)`：使用 ffprobe 取得音檔時長（秒）。驗收：回傳正確時長。
- [ ] 4.5 實作暫存檔清理邏輯：拼接完成（無論成功失敗）後刪除 `/tmp/purcast-audio-{podcastId}/` 整個目錄。驗收：處理後 temp 目錄無殘留。

## 5. 完整合成流程（VPS 直接處理）[PRD §6.2]

- [ ] 5.1 建立 `/api/synthesize` API Route：接收 podcast ID → 讀取 script → 更新 status 為 'generating_audio' → 立即回傳 202。驗收：API 快速回應，不等待完整處理。
- [ ] 5.2 實作背景處理流程：在 VPS 上直接同步處理（無 timeout 限制）：分段合成 → ffmpeg 拼接 → 上傳 R2 → 更新 podcast record（audio_url, duration, status='completed'）。驗收：完整流程成功執行，處理時間 1-3 分鐘不會 timeout。
- [ ] 5.3 實作狀態更新：各階段更新 podcast status（generating_audio → completed/failed）。驗收：前端可透過輪詢取得正確狀態。
- [ ] 5.4 實作錯誤處理：任何步驟失敗時設定 status=failed + error_message，清理 /tmp 暫存檔。驗收：失敗後 podcast 記錄有錯誤訊息，暫存目錄已清理。
