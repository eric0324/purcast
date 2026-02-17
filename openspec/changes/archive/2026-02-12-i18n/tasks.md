## 1. next-intl 基礎設定

- [x] 1.1 安裝 next-intl v4（`bun add next-intl`）。驗收：套件安裝成功。
- [x] 1.2 建立 `src/i18n/request.ts`，設定 getRequestConfig。驗收：可正確取得 locale。
- [x] 1.3 建立 `src/i18n/routing.ts`，設定 locales: ['zh-TW', 'en']、defaultLocale: 'zh-TW'、localePrefix: 'never'。驗收：路由設定正確。
- [x] 1.4 建立 `src/i18n/navigation.ts`，匯出 locale-aware Link、useRouter、usePathname、redirect。驗收：元件可正確使用。
- [x] 1.5 建立 `src/middleware.ts`，整合 next-intl middleware。驗收：請求正確路由至對應 locale。

## 2. 翻譯檔建立

- [x] 2.1 建立 `messages/zh-TW.json`，包含所有頁面與元件的繁體中文翻譯 key。驗收：涵蓋全 App 文字。
- [x] 2.2 建立 `messages/en.json`，包含對應的英文翻譯。驗收：與 zh-TW.json key 結構一致。

## 3. 路由結構重構

- [x] 3.1 建立 `src/app/[locale]/layout.tsx`，提供 html/body、NextIntlClientProvider、載入翻譯訊息。驗收：所有子頁面可存取翻譯。
- [x] 3.2 修改 `src/app/layout.tsx` 為 pass-through layout（不含 html/body）。驗收：不與 locale layout 衝突。
- [x] 3.3 遷移所有頁面至 `src/app/[locale]/...` 結構。驗收：27 頁面皆可正常存取。

## 4. 元件國際化

- [x] 4.1 所有 Server Components 改用 `getTranslations()` 取得翻譯。驗收：server-side 渲染正確顯示翻譯文字。
- [x] 4.2 所有 Client Components 改用 `useTranslations()` 取得翻譯。驗收：client-side 正確顯示翻譯文字。
- [x] 4.3 導航元件（Header、Sidebar）改用 `@/i18n/navigation` 的 Link。驗收：導航保持 locale context。

## 5. API 錯誤訊息國際化

- [x] 5.1 API route 錯誤回傳格式改為 `{ errorKey: "namespace.key" }`。驗收：API 回傳 errorKey 而非硬編碼訊息。
- [x] 5.2 前端 error handling 改用 `tErrors(data.errorKey)` 翻譯錯誤訊息。驗收：錯誤訊息依語言顯示。

## 6. 語言切換功能

- [x] 6.1 在 Settings 頁面新增語言切換 UI。驗收：可切換 zh-TW / en。
- [x] 6.2 切換使用 `router.replace(pathname, { locale })`，語言存入 NEXT_LOCALE cookie。驗收：切換後頁面重新載入為目標語言。

## 7. 驗證

- [x] 7.1 `bun run build` 通過，27 頁面皆正確生成。驗收：無建置錯誤。
