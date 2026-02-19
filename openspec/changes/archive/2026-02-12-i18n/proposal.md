## Why

PurCast 目標市場為繁體中文用戶，但同時需要支援英文用戶。全 App 國際化（i18n）讓所有頁面、元件、API 錯誤訊息都能根據用戶語言偏好自動切換，提升非中文用戶的使用體驗。

## What Changes

- 導入 next-intl v4，設定 App Router 整合（localePrefix: "never"，語言存在 cookie）
- 建立 `messages/zh-TW.json` 與 `messages/en.json` 翻譯檔
- 重構路由結構：所有頁面移至 `src/app/[locale]/...` dynamic segment
- Root layout 改為 pass-through，locale layout 提供 html/body + NextIntlClientProvider
- 所有 Server Components 使用 `getTranslations()`，Client Components 使用 `useTranslations()`
- 建立 `@/i18n/navigation` 提供 locale-aware 的 Link、useRouter、usePathname
- API 錯誤回傳 `{ errorKey }` 格式，前端透過翻譯 key 顯示本地化錯誤訊息
- 語言切換功能放在 Settings 頁面，使用 `router.replace(pathname, { locale })`
- Email 模板支援 locale 參數，server-side 翻譯

## Capabilities

### New Capabilities
- `i18n-framework`: next-intl v4 整合，支援 zh-TW 與 en 雙語切換
- `locale-navigation`: locale-aware 路由導航（Link、useRouter、usePathname）
- `language-switcher`: Settings 頁面中的語言切換 UI

### Modified Capabilities
- `app-layout`: Root layout 改為 pass-through，新增 [locale] layout
- `auth`: API 錯誤訊息改為 errorKey 格式，前端翻譯顯示
- 所有頁面與元件：硬編碼文字改為翻譯 key

## Impact

- 路由結構變更影響所有頁面（27 頁面皆已遷移）
- Layout 架構調整（root → pass-through，locale layout → html/body）
- 所有 UI 文字改為翻譯函式呼叫
- API 錯誤處理模式變更

## Out of Scope

- 第三語言支援（僅 zh-TW + en）
- URL 路徑帶語言前綴（使用 cookie 方案）
- 自動偵測瀏覽器語言（未來可加）
