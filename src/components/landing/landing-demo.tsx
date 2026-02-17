"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock } from "lucide-react";
import { ScrollFadeIn } from "./scroll-fade-in";

export function LandingDemo() {
  const t = useTranslations("Landing.demo");

  const demos = [
    {
      title: t("sample1.title"),
      duration: t("sample1.duration"),
      description: t("sample1.description"),
    },
    {
      title: t("sample2.title"),
      duration: t("sample2.duration"),
      description: t("sample2.description"),
    },
    {
      title: t("sample3.title"),
      duration: t("sample3.duration"),
      description: t("sample3.description"),
    },
  ];

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ScrollFadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              {t("title")}
            </h2>
            <p className="text-center text-muted-foreground mb-16">
              {t("subtitle")}
            </p>
          </ScrollFadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demos.map((demo, index) => (
              <ScrollFadeIn key={index} delay={index * 100}>
                <Card className="p-6">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled
                      className="rounded-full w-16 h-16"
                    >
                      <Play className="h-8 w-8" />
                    </Button>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{demo.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="h-4 w-4" />
                    {demo.duration}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {demo.description}
                  </p>
                  <p className="text-xs text-center text-muted-foreground italic">
                    {t("comingSoon")}
                  </p>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
