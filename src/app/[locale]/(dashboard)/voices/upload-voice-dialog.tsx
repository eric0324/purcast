"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type UploadStep = "select" | "uploading" | "cloning" | "done";

const ACCEPTED_TYPES = ".mp3,.wav,.m4a";
const MAX_SIZE_MB = 25;

interface Voice {
  id: string;
  name: string;
  sampleUrl: string | null;
  createdAt: Date;
}

export function UploadVoiceDialog({
  children,
  onSuccess,
}: {
  children: React.ReactNode;
  onSuccess: (voice: Voice) => void;
}) {
  const t = useTranslations("Voices.upload");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("select");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("select");
    setName("");
    setFile(null);
    setError("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(t("fileSizeError", { maxSize: MAX_SIZE_MB }));
      return;
    }

    setFile(selected);
    setError("");
    if (!name) {
      setName(selected.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleUpload() {
    if (!file || !name.trim()) return;
    setError("");

    try {
      setStep("uploading");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());

      setStep("cloning");

      const res = await fetch("/api/voices", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("uploadFailed"));
        setStep("select");
        return;
      }

      const data = await res.json();
      setStep("done");
      onSuccess(data.voice);

      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1000);
    } catch {
      setError(t("fallbackError"));
      setStep("select");
    }
  }

  const stepText: Record<UploadStep, string> = {
    select: "",
    uploading: t("uploading"),
    cloning: t("cloning"),
    done: t("done"),
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voice-name">{t("nameLabel")}</Label>
            <Input
              id="voice-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={step !== "select"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-file">{t("fileLabel")}</Label>
            <Input
              ref={fileRef}
              id="voice-file"
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              disabled={step !== "select"}
            />
          </div>

          {step !== "select" && step !== "done" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {stepText[step]}
            </div>
          )}

          {step === "done" && (
            <p className="text-sm text-green-600">{t("success")}</p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!file || !name.trim() || step !== "select"}
          >
            {t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
