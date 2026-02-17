"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

export function LandingHero() {
  const t = useTranslations("Landing.hero");

  return (
    <section className="relative py-20 sm:py-32 lg:py-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t("tagline")}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                {t("cta")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
