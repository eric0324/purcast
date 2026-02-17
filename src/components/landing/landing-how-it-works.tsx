"use client";

import { useTranslations } from "next-intl";
import { FileText, Mic, Headphones } from "lucide-react";
import { ScrollFadeIn } from "./scroll-fade-in";

export function LandingHowItWorks() {
  const t = useTranslations("Landing.howItWorks");

  const steps = [
    {
      icon: FileText,
      title: t("step1.title"),
      description: t("step1.description"),
    },
    {
      icon: Mic,
      title: t("step2.title"),
      description: t("step2.description"),
    },
    {
      icon: Headphones,
      title: t("step3.title"),
      description: t("step3.description"),
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <ScrollFadeIn key={index} delay={index * 100}>
                  <div className="flex flex-col items-center text-center p-6">
                    <span className="text-sm font-semibold text-primary mb-3">
                      Step {index + 1}
                    </span>
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </ScrollFadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
