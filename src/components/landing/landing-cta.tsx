"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { ScrollFadeIn } from "./scroll-fade-in";

export function LandingCta() {
  const t = useTranslations("Landing.cta");

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollFadeIn>
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-2xl p-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t("title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                {t("button")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
