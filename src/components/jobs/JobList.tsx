"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JobItem {
  id: string;
  name: string;
  status: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runs: Array<{
    id: string;
    status: string;
    startedAt: string;
  }>;
}

export function JobList({ initialJobs }: { initialJobs: JobItem[] }) {
  const t = useTranslations("Jobs");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [confirmAction, setConfirmAction] = useState<{
    type: "activate" | "pause" | "delete" | "runNow";
    jobId: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(jobId: string, status: "active" | "paused") {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status } : j))
        );
      }
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleRunNow(jobId: string) {
    setLoading(true);
    try {
      await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleDelete(jobId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">{t("empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <Button className="mt-4" onClick={() => router.push("/jobs/new")}>
          {t("createNew")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id} className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Link href={`/jobs/${job.id}`}>
                  <CardTitle className="text-base">{job.name}</CardTitle>
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[job.status] || "bg-gray-100"}`}
                >
                  {t(`status.${job.status}`)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <span suppressHydrationWarning>
                    {t("lastRun")}:{" "}
                    {job.lastRunAt
                      ? new Date(job.lastRunAt).toLocaleString()
                      : t("neverRun")}
                  </span>
                  <span suppressHydrationWarning>
                    {t("nextRun")}:{" "}
                    {job.nextRunAt
                      ? new Date(job.nextRunAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmAction({ type: "runNow", jobId: job.id });
                    }}
                  >
                    {t("runNow")}
                  </Button>
                  {job.status === "paused" || job.status === "error" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({ type: "activate", jobId: job.id });
                      }}
                    >
                      {t("activate")}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({ type: "pause", jobId: job.id });
                      }}
                    >
                      {t("pause")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmAction({ type: "delete", jobId: job.id });
                    }}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={() => setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "runNow" && t("runNowConfirm")}
              {confirmAction?.type === "activate" && t("activateConfirm")}
              {confirmAction?.type === "pause" && t("pauseConfirm")}
              {confirmAction?.type === "delete" && t("deleteConfirm")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "runNow" && t("runNowDescription")}
              {confirmAction?.type === "activate" && t("activateDescription")}
              {confirmAction?.type === "pause" && t("pauseDescription")}
              {confirmAction?.type === "delete" && t("deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={loading}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant={confirmAction?.type === "delete" ? "destructive" : "default"}
              disabled={loading}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "runNow") {
                  handleRunNow(confirmAction.jobId);
                } else if (confirmAction.type === "delete") {
                  handleDelete(confirmAction.jobId);
                } else {
                  handleStatusChange(
                    confirmAction.jobId,
                    confirmAction.type === "activate" ? "active" : "paused"
                  );
                }
              }}
            >
              {loading
                ? t("running")
                : confirmAction?.type === "runNow"
                  ? t("runNow")
                  : confirmAction?.type === "activate"
                    ? t("activate")
                    : confirmAction?.type === "pause"
                      ? t("pause")
                      : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
