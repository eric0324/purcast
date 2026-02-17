"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

const POLL_INTERVAL = 3000;

interface ProgressPollerProps {
  podcastId: string;
}

export function ProgressPoller({ podcastId }: ProgressPollerProps) {
  const t = useTranslations("ScriptGeneration");
  const router = useRouter();

  const [status, setStatus] = useState<string>("generating_script");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [lastActiveStatus, setLastActiveStatus] = useState<string>("generating_script");

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/podcasts/${podcastId}/status`);
      if (!res.ok) return;

      const data = await res.json();
      setStatus(data.status);
      setErrorMessage(data.errorMessage);

      if (data.status !== "failed") {
        setLastActiveStatus(data.status);
      }

      if (data.status === "script_ready") {
        router.push(`/create/${podcastId}/edit`);
      }

      if (data.status === "completed") {
        router.push(`/history/${podcastId}`);
      }
    } catch {
      // Ignore polling errors
    }
  }, [podcastId, router]);

  useEffect(() => {
    const interval = setInterval(pollStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollStatus]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setErrorMessage(null);
    setStatus("generating_script");

    try {
      await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podcastId }),
      });
    } catch {
      setStatus("failed");
      setErrorMessage(t("fallbackError"));
    } finally {
      setRegenerating(false);
    }
  }, [podcastId, t]);

  const handleRetrySynthesize = useCallback(async () => {
    setRegenerating(true);
    setErrorMessage(null);
    setStatus("generating_audio");

    try {
      await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podcastId }),
      });
    } catch {
      setStatus("failed");
      setErrorMessage(t("fallbackError"));
    } finally {
      setRegenerating(false);
    }
  }, [podcastId, t]);

  if (status === "failed") {
    const wasAudioPhase = lastActiveStatus === "generating_audio";

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>
            {errorMessage
              ? t("failedMessage", { error: errorMessage })
              : t("fallbackError")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {wasAudioPhase ? (
            <>
              <Button onClick={handleRetrySynthesize} disabled={regenerating}>
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t("retrySynthesize")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/create/${podcastId}/edit`)}
              >
                {t("editScript")}
              </Button>
            </>
          ) : (
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {t("regenerate")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const statusKey =
    status === "pending"
      ? "pending"
      : status === "generating_audio"
        ? "generatingAudio"
        : "generatingScript";

  const progressKey =
    status === "generating_audio" ? "progressAudio" : "progress";

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {t(`status.${statusKey}`)}
      </p>
      <p className="text-xs text-muted-foreground">{t(progressKey)}</p>
    </div>
  );
}
