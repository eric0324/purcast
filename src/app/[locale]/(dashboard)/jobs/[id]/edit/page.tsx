import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobWizard } from "@/components/jobs/JobWizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditJobPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Jobs");

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) notFound();

  const voices = await prisma.voice.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  const initialData = {
    name: job.name,
    sources: job.sources,
    schedule: job.schedule,
    filterConfig: job.filterConfig,
    generationConfig: job.generationConfig,
    outputConfig: job.outputConfig,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("wizard.update")}</h1>
        <p className="text-sm text-muted-foreground">{job.name}</p>
      </div>
      <JobWizard
        voices={voices}
        initialData={initialData as Record<string, unknown>}
        jobId={id}
      />
    </div>
  );
}
