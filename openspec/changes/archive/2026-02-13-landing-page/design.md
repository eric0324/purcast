## Context

Landing Page 是用戶接觸 Podify 的第一個畫面，承擔轉換率的關鍵任務。需要在 5 秒內傳達產品價值、展示功能亮點、呈現定價方案，並引導訪客註冊。目標是支撐 MVP 上線後 4 週內 50 人註冊的驗證指標（PRD §10.1）。

## Goals / Non-Goals

**Goals:**
- 5 秒內讓訪客理解 Podify 的核心價值
- 清楚的 CTA 引導訪客註冊
- 展示 Free/Pro 方案差異促進轉換
- Demo 試聽區讓訪客體驗成果
- SEO 友善，搜尋引擎可索引
- 中英雙語支援，擴大觸及範圍

**Non-Goals:**
- 不建立部落格系統
- 不建立知識庫/幫助中心
- 不做 A/B 測試基礎設施（MVP）

## Decisions

### 1. 頁面區塊結構與排序

**選擇:** 單頁式設計，區塊順序：

1. **Hero** — 標語 + CTA
2. **How it Works** — 3 步驟流程
3. **Features** — 三大賣點（內容輸入、AI 對話、Voice Clone）
4. **Demo** — 試聽範例 Podcast
5. **Pricing** — Free vs Pro 比較表
6. **FAQ** — 常見問題（3-5 個）
7. **CTA** — 底部再次引導註冊
8. **Footer** — 連結

**理由:** 遵循經典 SaaS Landing Page 結構：先吸引（Hero）→ 解釋（How/Features）→ 證明（Demo）→ 轉換（Pricing）→ 解惑（FAQ）→ 行動（CTA）。

### 2. 使用 CSS Animations 而非 framer-motion

**選擇:** Tailwind CSS animations + CSS scroll-driven animations

**理由:** 減少 JS bundle size；Landing Page 動畫需求簡單（fade-in、slide-up）；CSS 動畫效能更好。

**替代方案:** framer-motion — 功能強大但增加 ~30KB bundle，MVP 不需要。

### 3. 使用 Static Generation (SSG)

**選擇:** Next.js Static Generation，build time 生成 HTML

**理由:** Landing Page 內容不需動態更新；SSG 載入最快，SEO 最佳；可搭配 Cloudflare CDN 全球分發。

### 4. Demo 試聽使用預先生成的音檔

**選擇:** 預先生成 2-3 個範例 Podcast，存放在 R2，直接嵌入頁面

**理由:** 避免即時生成的成本和延遲；可精心挑選最佳效果的範例；音檔嵌入播放器元件。

**替代方案:** 即時 Demo — 成本高且品質不可控。

### 5. 中英雙語支援

**選擇:** 使用 `next-intl` 實作中英雙語 Landing Page，右上角語言切換器

**理由:** Podify 支援中英文內容生成，Landing Page 也應同時吸引中英文用戶；`next-intl` 與 Next.js App Router 整合良好，支援 SSG。

**實作:**
- 預設語言：繁體中文
- 語言切換器：右上角 dropdown（中文 / English）
- 翻譯檔案：`messages/zh-TW.json`、`messages/en.json`

### 6. FAQ 區塊

**選擇:** 在 Pricing 和底部 CTA 之間加入 FAQ 區塊，使用 Accordion 元件（可展開/收合）

**理由:** 解答潛在用戶的常見疑問，降低註冊門檻；Accordion 節省空間；常見問題也有助於 SEO。

**FAQ 內容（3-5 題）:**
- Podify 支援哪些語言？
- Voice Clone 安全嗎？我的聲音會被如何使用？
- Free 和 Pro 方案有什麼差別？
- 生成一集 Podcast 需要多長時間？
- 可以取消 Pro 訂閱嗎？

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 設計素材不足（截圖、icon） | 使用 Lucide icons + 簡單插圖；產品 UI 完成後截圖 |
| Demo 音檔品質不佳影響第一印象 | 精心挑選內容並多次生成取最佳版本 |
| SEO 效果需要時間累積 | 搭配社群推廣作為初期流量來源 |
| 雙語翻譯維護成本 | MVP 階段內容少，一次翻譯後較少更動 |
| 翻譯品質影響國際用戶印象 | 英文版由 native speaker 或專業翻譯校對 |
| FAQ 內容過時 | 定期檢視並更新常見問題 |
