import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { JobList } from "@/components/jobs/JobList";

export default async function JobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Jobs");

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          startedAt: true,
        },
      },
    },
  });

  const serialized = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    status: j.status,
    nextRunAt: j.nextRunAt?.toISOString() || null,
    lastRunAt: j.lastRunAt?.toISOString() || null,
    runs: j.runs.map((r) => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Link href="/jobs/new">
          <Button>{t("createNew")}</Button>
        </Link>
      </div>
      <JobList initialJobs={serialized} />
    </div>
  );
}
