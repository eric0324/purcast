## Why

Landing Page 是用戶接觸 PurCast 的第一個畫面，也是轉換率的關鍵。需要清楚傳達產品價值（「把任何文字內容變成 Podcast — 用你自己的聲音」）、展示功能、呈現定價方案，並引導用戶註冊試用。（參考 PRD §11 Week 4 交付物）

## What Changes

- 設計並實作 PurCast Landing Page，包含：
  - Hero Section：標語、產品簡介、CTA 按鈕（「開始使用」）
  - 功能展示區：內容輸入、AI 對話生成、Voice Cloning 三大賣點
  - 使用流程展示：3 步驟視覺化（貼入內容 → 選擇聲音 → 生成 Podcast）
  - 定價方案比較表：Free vs Pro（參考 PRD §8）
  - Demo 試聽區：提供範例 Podcast 讓訪客試聽
  - Footer：聯絡資訊、使用條款、隱私政策連結
- SEO 基礎設定：meta tags、Open Graph、structured data
- 響應式設計：桌面、平板、手機適配

## Capabilities

### New Capabilities
- `landing-page`: 首頁設計與實作，包含 Hero、功能展示、定價、Demo 試聽等區塊

### Modified Capabilities
<!-- 無既有 capabilities 需修改 -->

## Impact

- 新增首頁路由 `/`
- 需要設計素材：產品截圖/mockup、icon set
- SEO 設定影響搜尋引擎可見度
- CTA 按鈕連結到註冊/登入流程（依賴 user-system 模組）

## Out of Scope

參考 PRD §4.2：不包含部落格系統、知識庫/幫助中心。MVP 僅需一個單頁 Landing Page（支援中英雙語）。
