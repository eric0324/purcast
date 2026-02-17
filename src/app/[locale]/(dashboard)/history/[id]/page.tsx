import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft, FileEdit, Loader2 } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DialogueScript } from "@/lib/llm/types";
import { PodcastPlayer } from "./podcast-player";

export default async function PodcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const t = await getTranslations("History.detail");
  const tStatus = await getTranslations("History.status");
  const locale = await getLocale();

  const podcast = await prisma.podcast.findUnique({
    where: { id },
  });

  if (!podcast || podcast.userId !== user.id) {
    notFound();
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToHistory")}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{podcast.title}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {new Date(podcast.createdAt).toLocaleDateString(locale)}
                </span>
                {podcast.duration && (
                  <span>{formatDuration(podcast.duration)}</span>
                )}
              </div>
            </div>
            {podcast.audioUrl && (
              <a href={podcast.audioUrl} download>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  {t("downloadMp3")}
                </Button>
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {(podcast.status === "pending" || podcast.status === "generating_script") && (
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tStatus(podcast.status === "pending" ? "pending" : "generatingScript")}
            </div>
          )}

          {podcast.status === "script_ready" && (
            <div className="flex items-center justify-between rounded-md bg-blue-50 p-4 dark:bg-blue-950/30">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {tStatus("scriptReady")}
              </span>
              <Link href={`/create/${podcast.id}/edit`}>
                <Button size="sm">
                  <FileEdit className="mr-2 h-4 w-4" />
                  {t("editScript")}
                </Button>
              </Link>
            </div>
          )}

          {podcast.status === "completed" && podcast.audioUrl && (
            <PodcastPlayer
              src={podcast.audioUrl}
              title={podcast.title}
            />
          )}

          {podcast.status === "failed" && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {t("failedPrefix")}{podcast.errorMessage || t("unknownError")}
            </div>
          )}

          {podcast.status === "script_ready" && podcast.script && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("scriptPreview")}
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {(podcast.script as unknown as DialogueScript).slice(0, 6).map((line, i) => (
                  <div
                    key={i}
                    className={`rounded-md px-3 py-2 text-sm ${
                      line.speaker === "A"
                        ? "bg-blue-50 dark:bg-blue-950/30"
                        : "bg-green-50 dark:bg-green-950/30"
                    }`}
                  >
                    <span className="font-medium text-xs">
                      {line.speaker === "A" ? "Host A" : "Host B"}:
                    </span>{" "}
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-4 text-sm whitespace-pre-line text-muted-foreground">
            {podcast.sourceContent.slice(0, 2000)}
            {podcast.sourceContent.length > 2000 && "..."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
