"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Download, AlertCircle, Loader2, Headphones, FileEdit } from "lucide-react";

interface Podcast {
  id: string;
  title: string;
  status: string;
  duration: number | null;
  audioUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("History.status");

  switch (status) {
    case "pending":
    case "generating_script":
    case "generating_audio":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === "pending" && t("pending")}
          {status === "generating_script" && t("generatingScript")}
          {status === "generating_audio" && t("generatingAudio")}
        </span>
      );
    case "script_ready":
      return (
        <span className="flex items-center gap-1 text-xs text-blue-600">
          <FileEdit className="h-3 w-3" />
          {t("scriptReady")}
        </span>
      );
    case "completed":
      return null;
    case "failed":
      return (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {t("failed")}
        </span>
      );
    default:
      return null;
  }
}

export function PodcastList({
  initialPodcasts,
  initialHasMore,
}: {
  initialPodcasts: Podcast[];
  initialHasMore: boolean;
}) {
  const t = useTranslations("History");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [podcasts, setPodcasts] = useState(initialPodcasts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!hasMore || loading) return;
    setLoading(true);

    try {
      const lastId = podcasts[podcasts.length - 1]?.id;
      const res = await fetch(`/api/podcasts?cursor=${lastId}`);
      const data = await res.json();

      setPodcasts((prev) => [...prev, ...data.podcasts]);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }

  if (podcasts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Headphones className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">{t("empty")}</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <Link href="/create">
            <Button>{t("startGenerate")}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {podcasts.map((podcast) => (
          <Link
            key={podcast.id}
            className="block"
            href={
              podcast.status === "script_ready"
                ? `/create/${podcast.id}/edit`
                : podcast.status === "pending" || podcast.status === "generating_script"
                  ? `/create/${podcast.id}`
                  : `/history/${podcast.id}`
            }
          >
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{podcast.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {new Date(podcast.createdAt).toLocaleDateString(locale)}
                    </span>
                    {podcast.duration && (
                      <span>{formatDuration(podcast.duration)}</span>
                    )}
                    <StatusBadge status={podcast.status} />
                  </div>
                </div>
                {podcast.status === "completed" && podcast.audioUrl && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(podcast.audioUrl!, "_blank");
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              t("loadMore")
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
