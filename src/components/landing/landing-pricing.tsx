"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ScrollFadeIn } from "./scroll-fade-in";

export function LandingPricing() {
  const t = useTranslations("Landing.pricing");

  const plans = [
    {
      name: t("free.name"),
      price: t("free.price"),
      description: t("free.description"),
      features: [
        { text: t("free.feature1"), included: true },
        { text: t("free.feature2"), included: true },
        { text: t("free.feature3"), included: false },
        { text: t("free.feature4"), included: false },
      ],
      cta: t("free.cta"),
      href: "/register",
      highlighted: false,
    },
    {
      name: t("pro.name"),
      price: t("pro.price"),
      description: t("pro.description"),
      features: [
        { text: t("pro.feature1"), included: true },
        { text: t("pro.feature2"), included: true },
        { text: t("pro.feature3"), included: true },
        { text: t("pro.feature4"), included: true },
      ],
      cta: t("pro.cta"),
      href: "",
      highlighted: false,
      comingSoon: true,
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <ScrollFadeIn key={index} delay={index * 100}>
                <Card
                  className={`p-8 ${
                    plan.highlighted
                      ? "border-2 border-primary shadow-lg"
                      : ""
                  }`}
                >
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    {plan.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {plan.comingSoon ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      size="lg"
                      disabled
                    >
                      {plan.cta}
                    </Button>
                  ) : (
                    <Link href={plan.href}>
                      <Button
                        className="w-full"
                        variant="outline"
                        size="lg"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                </Card>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
