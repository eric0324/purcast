"use client";

import { useTranslations } from "next-intl";

export function LandingFooter() {
  const t = useTranslations("Landing.footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold text-primary">Podify</div>
          <div className="text-sm text-muted-foreground">
            {t("copyright", { year: currentYear })}
          </div>
        </div>
      </div>
    </footer>
  );
}
