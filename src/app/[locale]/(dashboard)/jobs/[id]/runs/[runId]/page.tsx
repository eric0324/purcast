import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SelectedArticle } from "@/lib/jobs/types";

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function RunDetailPage({ params }: PageProps) {
  const { id, runId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Jobs.run");

  const run = await prisma.jobRun.findUnique({
    where: { id: runId },
    include: {
      job: { select: { userId: true, name: true } },
      podcast: {
        select: { id: true, title: true, audioUrl: true, duration: true },
      },
    },
  });

  if (!run || run.job.userId !== user.id || run.jobId !== id) notFound();

  const selectedArticles = (run.selectedArticles || []) as unknown as SelectedArticle[];

  const statusColor: Record<string, string> = {
    completed: "text-green-600",
    failed: "text-red-600",
    skipped: "text-yellow-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/jobs/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("backToJob")}
        </Link>
        <h1 className="text-2xl font-bold">{run.job.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("status")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">{t("status")}:</span>{" "}
            <span className={statusColor[run.status] || ""}>
              {t(`statusLabels.${run.status}`)}
            </span>
          </div>
          <div>
            <span className="font-medium">{t("startedAt")}:</span>{" "}
            {new Date(run.startedAt).toLocaleString()}
          </div>
          {run.completedAt && (
            <div>
              <span className="font-medium">{t("completedAt")}:</span>{" "}
              {new Date(run.completedAt).toLocaleString()}
            </div>
          )}
          {run.errorMessage && (
            <div className="sm:col-span-2">
              <span className="font-medium">{t("errorMessage")}:</span>{" "}
              <span className="text-destructive">{run.errorMessage}</span>
            </div>
          )}
          {run.podcast && (
            <div>
              <Link href={`/history/${run.podcast.id}`}>
                <Button variant="outline" size="sm">
                  {t("viewPodcast")}
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("selectedArticles")} ({selectedArticles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedArticles.map((article, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {article.title}
                  </a>
                  <p className="mt-0.5 text-muted-foreground">
                    {t("articleReason")}: {article.reason}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
