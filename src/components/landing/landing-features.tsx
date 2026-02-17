"use client";

import { useTranslations } from "next-intl";
import { Globe, MessageSquare, AudioWaveform } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollFadeIn } from "./scroll-fade-in";

export function LandingFeatures() {
  const t = useTranslations("Landing.features");

  const features = [
    {
      icon: Globe,
      title: t("feature1.title"),
      description: t("feature1.description"),
    },
    {
      icon: MessageSquare,
      title: t("feature2.title"),
      description: t("feature2.description"),
    },
    {
      icon: AudioWaveform,
      title: t("feature3.title"),
      description: t("feature3.description"),
    },
  ];

  return (
    <section className="py-20">
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
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <ScrollFadeIn key={index} delay={index * 100}>
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </Card>
                </ScrollFadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
