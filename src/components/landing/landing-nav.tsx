"use client";

import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { Globe } from "lucide-react";

export function LandingNav() {
  const t = useTranslations("Landing.nav");
  const tLang = useTranslations("Layout.languageSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const toggleLanguage = () => {
    const newLocale = currentLocale === "zh-TW" ? "en" : "zh-TW";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-primary">
            Podify
          </Link>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {currentLocale === "zh-TW" ? tLang("en") : tLang("zhTW")}
            </Button>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t("login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t("register")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
