import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobSource, JobSchedule, JobGenerationConfig, JobOutputConfig } from "@/lib/jobs/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Jobs");

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          articlesFound: true,
          articlesSelected: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          podcastId: true,
        },
      },
    },
  });

  if (!job || job.userId !== user.id) notFound();

  const sources = job.sources as unknown as JobSource[];
  const schedule = job.schedule as unknown as JobSchedule;
  const genConfig = job.generationConfig as unknown as JobGenerationConfig;
  const outputConfig = job.outputConfig as unknown as JobOutputConfig[];

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  const runStatusColor: Record<string, string> = {
    completed: "text-green-600",
    failed: "text-red-600",
    skipped: "text-yellow-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/jobs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("detail.backToJobs")}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{job.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[job.status] || ""}`}
            >
              {t(`status.${job.status}`)}
            </span>
          </div>
        </div>
        <Link href={`/jobs/${id}/edit`}>
          <Button variant="outline">{t("detail.editJob")}</Button>
        </Link>
      </div>

      {/* Config summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.config")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">{t("detail.sources")}:</span>
            <ul className="mt-1 list-inside list-disc">
              {sources.map((s, i) => (
                <li key={i} className="text-muted-foreground">
                  [{s.type.toUpperCase()}] {s.url}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="font-medium">{t("detail.schedule")}:</span>
            <p className="text-muted-foreground">
              {schedule.mode === "daily" ? t("wizard.daily") : t("wizard.weekly")}{" "}
              @ {schedule.time} ({schedule.timezone})
              {schedule.mode === "weekly" &&
                schedule.weekday !== undefined &&
                ` — ${t(`wizard.weekdays.${schedule.weekday}`)}`}
            </p>
          </div>
          <div>
            <span className="font-medium">{t("detail.generation")}:</span>
            <p className="text-muted-foreground">
              {t(`wizard.stylePresets.${genConfig.stylePreset}`)} ·{" "}
              {genConfig.maxArticles} articles · {genConfig.targetMinutes} min
            </p>
          </div>
          <div>
            <span className="font-medium">{t("detail.outputs")}:</span>
            <p className="text-muted-foreground">
              {outputConfig.map((o) => o.type).join(", ")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Run history */}
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.runHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {job.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("detail.noRuns")}</p>
          ) : (
            <div className="space-y-2">
              {job.runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-medium ${runStatusColor[run.status] || ""}`}
                    >
                      {t(`run.statusLabels.${run.status}`)}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      {t("detail.articlesFound", { count: run.articlesFound })} ·{" "}
                      {t("detail.articlesSelected", {
                        count: run.articlesSelected,
                      })}
                    </span>
                  </div>
                  <Link href={`/jobs/${id}/runs/${run.id}`}>
                    <Button variant="ghost" size="sm">
                      {t("detail.viewRun")}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
