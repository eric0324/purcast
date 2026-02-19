"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Voice {
  id: string;
  name: string;
}

interface JobWizardProps {
  voices: Voice[];
  initialData?: Record<string, unknown>;
  jobId?: string;
}

type SourceType = "rss" | "url";
type ScheduleMode = "daily" | "weekly";
type OutputFormat = "audio" | "link" | "both";

interface Source {
  type: SourceType;
  url: string;
  label?: string;
}

interface TelegramOutput {
  type: "telegram";
  chatId: string;
  format: OutputFormat;
}

interface LineOutput {
  type: "line";
  channelAccessToken: string;
  lineUserIds: string[];
  format: OutputFormat;
}

type OutputConfig = TelegramOutput | LineOutput;

const STYLE_PRESETS = ["news_brief", "casual_chat", "deep_analysis", "talk_show"] as const;

export function JobWizard({ voices, initialData, jobId }: JobWizardProps) {
  const t = useTranslations("Jobs.wizard");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState((initialData?.name as string) || "");
  const [sources, setSources] = useState<Source[]>(
    (initialData?.sources as Source[]) || [{ type: "rss", url: "" }]
  );

  // Step 2
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(
    (initialData?.schedule as { mode: ScheduleMode })?.mode || "daily"
  );
  const [scheduleTime, setScheduleTime] = useState(
    (initialData?.schedule as { time: string })?.time || "08:00"
  );
  const [timezone] = useState(
    (initialData?.schedule as { timezone: string })?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [weekday, setWeekday] = useState(
    (initialData?.schedule as { weekday?: number })?.weekday ?? 1
  );
  const [includeKeywords, setIncludeKeywords] = useState<string[]>(
    (initialData?.filterConfig as { includeKeywords?: string[] })?.includeKeywords || []
  );
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>(
    (initialData?.filterConfig as { excludeKeywords?: string[] })?.excludeKeywords || []
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");

  // Step 3
  const [stylePreset, setStylePreset] = useState(
    (initialData?.generationConfig as { stylePreset?: string })?.stylePreset || "news_brief"
  );
  const [aiPrompt, setAiPrompt] = useState(
    (initialData?.filterConfig as { aiPrompt?: string })?.aiPrompt || ""
  );
  const [customPrompt, setCustomPrompt] = useState(
    (initialData?.generationConfig as { customPrompt?: string })?.customPrompt || ""
  );
  const initVoices = (initialData?.generationConfig as { voices?: Record<string, string> })?.voices || {};
  const [voiceAId, setVoiceAId] = useState(initVoices["A"] || "");
  const [voiceBId, setVoiceBId] = useState(initVoices["B"] || "");
  const [maxArticles, setMaxArticles] = useState(
    (initialData?.generationConfig as { maxArticles?: number })?.maxArticles ?? 5
  );
  const [targetMinutes, setTargetMinutes] = useState(
    (initialData?.generationConfig as { targetMinutes?: number })?.targetMinutes ?? 15
  );

  // Step 4
  const [outputs, setOutputs] = useState<OutputConfig[]>(
    (initialData?.outputConfig as OutputConfig[]) || []
  );
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramFormat, setTelegramFormat] = useState<OutputFormat>("both");
  const [telegramCode, setTelegramCode] = useState("");
  const [telegramBotLink, setTelegramBotLink] = useState("");
  const [telegramPolling, setTelegramPolling] = useState(false);

  async function connectTelegram() {
    const res = await fetch("/api/telegram/connect", { method: "POST" });
    const data = await res.json();
    setTelegramCode(data.code);
    setTelegramBotLink(data.botLink);

    // Start polling for verification
    setTelegramPolling(true);
    const interval = setInterval(async () => {
      const pollRes = await fetch("/api/telegram/connect");
      const pollData = await pollRes.json();
      if (pollData.verified) {
        clearInterval(interval);
        setTelegramChatId(pollData.chatId);
        setTelegramPolling(false);
        setTelegramCode("");
        setOutputs((prev) => [
          ...prev.filter((o) => o.type !== "telegram"),
          { type: "telegram", chatId: pollData.chatId, format: telegramFormat },
        ]);
      }
    }, 3000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setTelegramPolling(false);
    }, 600000);
  }

  function addKeyword(type: "include" | "exclude") {
    const input = type === "include" ? keywordInput : excludeInput;
    if (!input.trim()) return;
    if (type === "include") {
      setIncludeKeywords((prev) => [...prev, input.trim()]);
      setKeywordInput("");
    } else {
      setExcludeKeywords((prev) => [...prev, input.trim()]);
      setExcludeInput("");
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const body = {
      name,
      sources: sources.filter((s) => s.url),
      schedule: {
        mode: scheduleMode,
        time: scheduleTime,
        timezone,
        ...(scheduleMode === "weekly" ? { weekday } : {}),
      },
      filterConfig: {
        ...(includeKeywords.length > 0 ? { includeKeywords } : {}),
        ...(excludeKeywords.length > 0 ? { excludeKeywords } : {}),
        ...(aiPrompt ? { aiPrompt } : {}),
      },
      generationConfig: {
        stylePreset,
        voices: {
          ...(voiceAId ? { A: voiceAId } : {}),
          ...(voiceBId ? { B: voiceBId } : {}),
        },
        maxArticles,
        targetMinutes,
        ...(customPrompt ? { customPrompt } : {}),
      },
      outputConfig: outputs,
    };

    try {
      const url = jobId ? `/api/jobs/${jobId}` : "/api/jobs";
      const method = jobId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        router.refresh();
        router.push(`/jobs/${data.job.id}`);
      } else {
        const data = await res.json();
        setError(data.errorKey || "Unknown error");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [t("step1"), t("step2"), t("step3"), t("step4"), t("step5")];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i + 1 === step
                  ? "bg-primary text-primary-foreground"
                  : i + 1 < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className="hidden text-sm sm:inline">{label}</span>
            {i < steps.length - 1 && (
              <div className="h-px w-4 bg-border sm:w-8" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step1")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("nameLabel")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("sourcesLabel")}</Label>
              {sources.map((src, i) => (
                <div key={i} className="mt-2 flex gap-2">
                  <select
                    className="rounded-md border px-2 py-1 text-sm"
                    value={src.type}
                    onChange={(e) => {
                      const updated = [...sources];
                      updated[i] = { ...src, type: e.target.value as SourceType };
                      setSources(updated);
                    }}
                  >
                    <option value="rss">{t("sourceRss")}</option>
                    <option value="url">{t("sourceUrlMonitor")}</option>
                  </select>
                  <Input
                    className="flex-1"
                    value={src.url}
                    onChange={(e) => {
                      const updated = [...sources];
                      updated[i] = { ...src, url: e.target.value };
                      setSources(updated);
                    }}
                    placeholder="https://..."
                  />
                  {sources.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSources(sources.filter((_, j) => j !== i))
                      }
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  setSources([...sources, { type: "rss", url: "" }])
                }
              >
                {t("addSource")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Schedule & Filters */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step2")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div>
                <Label>{t("scheduleMode")}</Label>
                <select
                  className="mt-1 block rounded-md border px-3 py-2 text-sm"
                  value={scheduleMode}
                  onChange={(e) =>
                    setScheduleMode(e.target.value as ScheduleMode)
                  }
                >
                  <option value="daily">{t("daily")}</option>
                  <option value="weekly">{t("weekly")}</option>
                </select>
              </div>
              <div>
                <Label>{t("time")}</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              {scheduleMode === "weekly" && (
                <div>
                  <Label>{t("weekday")}</Label>
                  <select
                    className="mt-1 block rounded-md border px-3 py-2 text-sm"
                    value={weekday}
                    onChange={(e) => setWeekday(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {t(`weekdays.${d}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("timezone")}: {timezone}
            </div>

            <div>
              <Label>{t("includeKeywords")}</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {includeKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
                  >
                    {kw}
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setIncludeKeywords(
                          includeKeywords.filter((_, j) => j !== i)
                        )
                      }
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <Input
                className="mt-1"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword("include");
                  }
                }}
                placeholder={t("keywordPlaceholder")}
              />
            </div>

            <div>
              <Label>{t("excludeKeywords")}</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {excludeKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs"
                  >
                    {kw}
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setExcludeKeywords(
                          excludeKeywords.filter((_, j) => j !== i)
                        )
                      }
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <Input
                className="mt-1"
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword("exclude");
                  }
                }}
                placeholder={t("keywordPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generation settings */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step3")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("aiFilter")}</Label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t("aiFilterPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("stylePreset")}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      stylePreset === preset
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setStylePreset(preset)}
                  >
                    {t(`stylePresets.${preset}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("customPrompt")}</Label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t("customPromptPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("voiceA")}</Label>
                <select
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  value={voiceAId}
                  onChange={(e) => setVoiceAId(e.target.value)}
                >
                  <option value="">{t("defaultVoice")}</option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("voiceB")}</Label>
                <select
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  value={voiceBId}
                  onChange={(e) => setVoiceBId(e.target.value)}
                >
                  <option value="">{t("defaultVoice")}</option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <Label>{t("maxArticles")}</Label>
                <Input
                  type="number"
                  className="mt-1 w-24"
                  min={1}
                  max={20}
                  value={maxArticles}
                  onChange={(e) => setMaxArticles(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>{t("targetMinutes")}</Label>
                <Input
                  type="number"
                  className="mt-1 w-24"
                  min={5}
                  max={60}
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Output channels */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step4")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("outputChannels")}</Label>

              {/* Telegram */}
              <div className="mt-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Telegram</span>
                  {telegramChatId || outputs.some((o) => o.type === "telegram") ? (
                    <span className="text-xs text-green-600">
                      {t("telegramConnected")}
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={connectTelegram}
                      disabled={telegramPolling}
                    >
                      {t("addTelegram")}
                    </Button>
                  )}
                </div>
                {telegramCode && (
                  <div className="mt-2 text-sm">
                    <p>{t("telegramVerifyHint")}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-lg font-bold">
                        {telegramCode}
                      </code>
                      <a
                        href={telegramBotLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Open Bot
                      </a>
                    </div>
                    {telegramPolling && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("telegramPolling")}
                      </p>
                    )}
                  </div>
                )}
                {(telegramChatId || outputs.some((o) => o.type === "telegram")) && (
                  <div className="mt-2">
                    <Label>{t("outputFormat")}</Label>
                    <select
                      className="mt-1 block rounded-md border px-2 py-1 text-sm"
                      value={telegramFormat}
                      onChange={(e) => {
                        const fmt = e.target.value as OutputFormat;
                        setTelegramFormat(fmt);
                        setOutputs((prev) =>
                          prev.map((o) =>
                            o.type === "telegram" ? { ...o, format: fmt } : o
                          )
                        );
                      }}
                    >
                      <option value="audio">{t("formatAudio")}</option>
                      <option value="link">{t("formatLink")}</option>
                      <option value="both">{t("formatBoth")}</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("review")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">{t("nameLabel")}:</span> {name}
            </div>
            <div>
              <span className="font-medium">{t("sourcesLabel")}:</span>{" "}
              {sources.filter((s) => s.url).length} source(s)
            </div>
            <div>
              <span className="font-medium">{t("scheduleMode")}:</span>{" "}
              {t(scheduleMode)} @ {scheduleTime}
            </div>
            <div>
              <span className="font-medium">{t("stylePreset")}:</span>{" "}
              {t(`stylePresets.${stylePreset}`)}
            </div>
            <div>
              <span className="font-medium">{t("outputChannels")}:</span>{" "}
              {outputs.map((o) => o.type).join(", ") || "None"}
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          {t("back")}
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep(step + 1)}>
            {t("next")}
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? jobId
                ? t("updating")
                : t("creating")
              : jobId
                ? t("update")
                : t("create")}
          </Button>
        )}
      </div>
    </div>
  );
}
