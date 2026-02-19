## 1. 頁面結構與 Hero [PRD §11]

- [x] 1.1 建立 Landing Page (`src/app/page.tsx`)：設定為 Static Generation，包含基礎 HTML 結構和 SEO meta tags。驗收：`npm run build` 成功生成靜態頁面。
- [x] 1.2 實作 Hero Section：標語「把任何文字內容變成 Podcast — 用你自己的聲音」+ 副標題 + CTA 按鈕「開始使用」連結到 /register。驗收：Hero 視覺吸引，CTA 按鈕可點擊。
- [x] 1.3 實作 scroll fade-in 動畫：各區塊滾動進入時 fade-in + slide-up，使用 CSS animations + Intersection Observer。驗收：滾動時動畫自然流暢。

## 2. 功能展示區塊 [PRD §4.1]

- [x] 2.1 實作 "How it Works" 區塊：3 步驟水平排列（貼入內容 → 選擇聲音 → 生成 Podcast），各步驟配 icon + 文字。驗收：步驟清晰易懂。
- [x] 2.2 實作 Features 區塊：3 張功能卡片（智慧內容擷取、AI 雙人對話、Voice Cloning），各卡片配 icon + 標題 + 描述。驗收：功能亮點突出。

## 3. Demo 試聽 [PRD §11]

- [ ] 3.1 預先生成 2-3 個範例 Podcast 音檔，上傳到 R2。驗收：音檔可公開存取。
- [x] 3.2 實作 Demo 試聽區塊：嵌入 AudioPlayer 元件，顯示範例 Podcast 標題和描述，可直接播放。驗收：訪客可試聽範例。

## 4. 定價與 CTA [PRD §8]

- [x] 4.1 實作 Pricing 區塊：Free vs Pro 比較表（價格、集數、Voice Clone、功能清單），Pro 方案標示「推薦」。驗收：方案差異一目瞭然。
- [x] 4.2 實作底部 CTA 區塊：重複「開始使用」CTA + 簡短鼓勵文案。驗收：底部 CTA 可見且可點擊。

## 5. FAQ 區塊

- [x] 5.1 實作 FAQ 區塊：使用 shadcn/ui Accordion 元件，放在 Pricing 和底部 CTA 之間。驗收：FAQ 可展開/收合。
- [x] 5.2 撰寫 FAQ 內容（3-5 題）：語言支援、Voice Clone 安全性、方案差異、生成時間、取消訂閱。驗收：中英雙語 FAQ 內容完整。

## 6. Footer 與 SEO [PRD §11]

- [x] 6.1 實作 Footer：PurCast logo + copyright + 使用條款 / 隱私政策連結。驗收：Footer 顯示正確。
- [x] 6.2 設定 SEO：Open Graph tags（og:title, og:description, og:image）、Twitter Card、structured data。驗收：社群分享時顯示正確預覽。

## 7. 中英雙語支援

- [x] 7.1 安裝 `next-intl`，設定 i18n 配置（預設語言：zh-TW，支援：en）。驗收：`next-intl` 正確載入。
- [x] 7.2 建立翻譯檔案 `messages/zh-TW.json` 和 `messages/en.json`，包含所有 Landing Page 文案。驗收：中英文翻譯完整。
- [x] 7.3 實作語言切換器：右上角 dropdown（中文 / English），切換後頁面文案即時更新。驗收：切換語言後所有文案正確切換。
- [x] 7.4 SSG 支援雙語：build 時同時生成中英文靜態頁面。驗收：`/` 和 `/en` 都可存取。

## 8. 響應式設計

- [x] 8.1 Mobile 適配（< 768px）：所有區塊垂直堆疊，字體大小適配，CTA 按鈕全寬。驗收：手機瀏覽體驗良好。
- [x] 8.2 Tablet 適配（768-1024px）：兩欄 grid 佈局。驗收：平板瀏覽體驗良好。
- [x] 8.3 Desktop 適配（> 1024px）：三欄 grid + 合理最大寬度。驗收：桌面瀏覽體驗良好。
