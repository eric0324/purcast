"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("Layout.languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLocale = e.target.value as "zh-TW" | "en";
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      className="rounded-md border bg-background px-3 py-1.5 text-sm"
    >
      <option value="zh-TW">{t("zhTW")}</option>
      <option value="en">{t("en")}</option>
    </select>
  );
}
