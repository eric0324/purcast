import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VoiceList } from "./voice-list";
import { Lock } from "lucide-react";

export default async function VoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Voices");

  if (user.plan !== "pro") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
          <Lock className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t("locked")}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            {t("lockedDescription")}
          </p>
          <span className="inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
            {t("upgradeButton")}
          </span>
        </div>
      </div>
    );
  }

  const voices = await prisma.voice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <VoiceList voices={voices} />
    </div>
  );
}
