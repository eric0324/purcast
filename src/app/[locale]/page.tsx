import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/create");
  }

  return (
    <div className="min-h-screen">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
