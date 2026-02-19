import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobWizard } from "@/components/jobs/JobWizard";

export default async function NewJobPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Jobs");

  const voices = await prisma.voice.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("createNew")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <JobWizard voices={voices} />
    </div>
  );
}
