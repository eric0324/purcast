"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DialogueScript } from "@/lib/llm/types";

const MAX_CHARS_PER_LINE = 500;

interface Voice {
  id: string;
  name: string;
  elevenlabsVoiceId: string;
}

interface ScriptEditorProps {
  podcastId: string;
  initialScript: DialogueScript;
  voices: Voice[];
}

export function ScriptEditor({ podcastId, initialScript, voices }: ScriptEditorProps) {
  const t = useTranslations("ScriptEdit");
  const tErrors = useTranslations("Errors");
  const router = useRouter();

  const [script, setScript] = useState(initialScript);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voiceAId, setVoiceAId] = useState("");
  const [voiceBId, setVoiceBId] = useState("");

  const updateLine = useCallback((index: number, text: string) => {
    setScript((prev) =>
      prev.map((line, i) => (i === index ? { ...line, text } : line))
    );
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      // Save script
      const res = await fetch(`/api/podcasts/${podcastId}/script`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.errorKey ? tErrors(data.errorKey) : t("fallbackError"));
        return;
      }

      // Trigger audio synthesis — await to ensure status is updated before redirect
      const synthRes = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          podcastId,
          ...(voiceAId && { voiceAId }),
          ...(voiceBId && { voiceBId }),
        }),
      });

      if (!synthRes.ok && synthRes.status !== 202) {
        const synthData = await synthRes.json();
        setError(synthData.errorKey ? tErrors(synthData.errorKey) : t("fallbackError"));
        return;
      }

      // Redirect to progress page to track audio generation
      router.push(`/create/${podcastId}`);
    } catch {
      setError(t("fallbackError"));
    } finally {
      setSaving(false);
    }
  }, [podcastId, script, voiceAId, voiceBId, router, t, tErrors]);

  const hasOverLimit = script.some(
    (line) => line.text.length > MAX_CHARS_PER_LINE
  );

  return (
    <div className="space-y-4">
      {voices.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="voice-a">{t("voiceA")}</Label>
            <select
              id="voice-a"
              value={voiceAId}
              onChange={(e) => setVoiceAId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              disabled={saving}
            >
              <option value="">{t("defaultVoice")}</option>
              {voices.map((v) => (
                <option key={v.id} value={v.elevenlabsVoiceId}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voice-b">{t("voiceB")}</Label>
            <select
              id="voice-b"
              value={voiceBId}
              onChange={(e) => setVoiceBId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              disabled={saving}
            >
              <option value="">{t("defaultVoice")}</option>
              {voices.map((v) => (
                <option key={v.id} value={v.elevenlabsVoiceId}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {script.map((line, index) => {
          const isOverLimit = line.text.length > MAX_CHARS_PER_LINE;
          const isHostA = line.speaker === "A";

          return (
            <Card
              key={index}
              className={`border-l-4 ${
                isHostA ? "border-l-blue-500" : "border-l-green-500"
              }`}
            >
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      isHostA ? "text-blue-600" : "text-green-600"
                    }`}
                  >
                    {isHostA ? t("hostA") : t("hostB")}
                  </span>
                  <span
                    className={`text-xs ${
                      isOverLimit
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t("charCount", {
                      count: line.text.length,
                      limit: MAX_CHARS_PER_LINE,
                    })}
                  </span>
                </div>
                <textarea
                  value={line.text}
                  onChange={(e) => updateLine(index, e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                />
                {isOverLimit && (
                  <p className="text-xs text-destructive">
                    {t("charLimitWarning", { limit: MAX_CHARS_PER_LINE })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHistory")}
        </Link>

        <Button
          onClick={handleSubmit}
          disabled={saving || hasOverLimit}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("confirmAndGenerate")
          )}
        </Button>
      </div>
    </div>
  );
}
