"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HARD_LIMITS } from "@/lib/config/plan";

interface Voice {
  id: string;
  name: string;
}

interface ChannelOption {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

interface JobWizardProps {
  voices: Voice[];
  channels: ChannelOption[];
  initialData?: Record<string, unknown>;
  jobId?: string;
}

type SourceType = "rss" | "url" | "reddit";
type RedditSort = "hot" | "top_day" | "top_week" | "top_month" | "new";
type ScheduleMode = "daily" | "weekly";
type OutputFormat = "audio" | "link" | "both";

interface Source {
  type: SourceType;
  url: string;
  label?: string;
  sort?: RedditSort;
  includeComments?: boolean;
}

interface ChannelBinding {
  channelId: string;
  format: OutputFormat;
}

const STYLE_PRESETS = ["news_brief", "casual_chat", "deep_analysis", "talk_show"] as const;

export function JobWizard({ voices, channels, initialData, jobId }: JobWizardProps) {
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
  const [outputLanguage, setOutputLanguage] = useState(
    (initialData?.generationConfig as { outputLanguage?: string })?.outputLanguage || "auto"
  );

  // Step 4 — Channel bindings
  const [bindings, setBindings] = useState<ChannelBinding[]>(() => {
    const initial = initialData?.outputConfig as ChannelBinding[] | undefined;
    return Array.isArray(initial) ? initial : [];
  });

  function toggleChannel(channelId: string) {
    setBindings((prev) => {
      const exists = prev.find((b) => b.channelId === channelId);
      if (exists) return prev.filter((b) => b.channelId !== channelId);
      return [...prev, { channelId, format: "both" }];
    });
  }

  function setChannelFormat(channelId: string, format: OutputFormat) {
    setBindings((prev) =>
      prev.map((b) => (b.channelId === channelId ? { ...b, format } : b))
    );
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
      sources: sources
        .filter((s) => s.url)
        .map((s) =>
          s.type === "reddit"
            ? { type: s.type, url: s.url, sort: s.sort, includeComments: s.includeComments }
            : { type: s.type, url: s.url }
        ),
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
        ...(outputLanguage !== "auto" ? { outputLanguage } : {}),
      },
      outputConfig: bindings,
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
                <div key={i} className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <select
                      className="rounded-md border px-2 py-1 text-sm"
                      value={src.type}
                      onChange={(e) => {
                        const updated = [...sources];
                        const newType = e.target.value as SourceType;
                        updated[i] = newType === "reddit"
                          ? { ...src, type: newType, url: "", sort: "hot", includeComments: true }
                          : { type: newType, url: "" };
                        setSources(updated);
                      }}
                    >
                      <option value="rss">{t("sourceRss")}</option>
                      <option value="url">{t("sourceUrlMonitor")}</option>
                      <option value="reddit">{t("sourceReddit")}</option>
                    </select>
                    {src.type === "reddit" ? (
                      <div className="flex flex-1 items-center gap-0">
                        <span className="rounded-l-md border border-r-0 bg-muted px-2 py-1.5 text-sm text-muted-foreground">
                          r/
                        </span>
                        <Input
                          className="flex-1 rounded-l-none"
                          value={src.url}
                          onChange={(e) => {
                            const updated = [...sources];
                            updated[i] = { ...src, url: e.target.value };
                            setSources(updated);
                          }}
                          placeholder={t("subredditPlaceholder")}
                        />
                      </div>
                    ) : (
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
                    )}
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
                  {src.type === "reddit" && (
                    <div className="ml-[calc(theme(spacing.2)+100px)] flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground">{t("redditSort")}</label>
                        <select
                          className="rounded-md border px-2 py-1 text-xs"
                          value={src.sort || "hot"}
                          onChange={(e) => {
                            const updated = [...sources];
                            updated[i] = { ...src, sort: e.target.value as RedditSort };
                            setSources(updated);
                          }}
                        >
                          <option value="hot">{t("redditSortHot")}</option>
                          <option value="top_day">{t("redditSortTopDay")}</option>
                          <option value="top_week">{t("redditSortTopWeek")}</option>
                          <option value="top_month">{t("redditSortTopMonth")}</option>
                          <option value="new">{t("redditSortNew")}</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={src.includeComments ?? true}
                          onChange={(e) => {
                            const updated = [...sources];
                            updated[i] = { ...src, includeComments: e.target.checked };
                            setSources(updated);
                          }}
                          className="rounded"
                        />
                        <span className="text-muted-foreground">{t("includeComments")}</span>
                      </label>
                    </div>
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
                maxLength={HARD_LIMITS.aiPromptMaxLength}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value.slice(0, HARD_LIMITS.aiPromptMaxLength))}
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
              <Label>{t("outputLanguage")}</Label>
              <select
                className="mt-1 block rounded-md border px-3 py-2 text-sm"
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
              >
                <option value="auto">{t("langAuto")}</option>
                <option value="zh-TW">{t("langZhTW")}</option>
                <option value="en">{t("langEn")}</option>
              </select>
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
                  max={HARD_LIMITS.maxArticles}
                  value={maxArticles}
                  onChange={(e) => setMaxArticles(Math.min(Number(e.target.value), HARD_LIMITS.maxArticles))}
                />
              </div>
              <div>
                <Label>{t("targetMinutes")}</Label>
                <Input
                  type="number"
                  className="mt-1 w-24"
                  min={5}
                  max={HARD_LIMITS.targetMinutesMax}
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Math.min(Number(e.target.value), HARD_LIMITS.targetMinutesMax))}
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
              {channels.length === 0 ? (
                <div className="mt-2 rounded-md border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("noChannels")}
                  </p>
                  <a
                    href="/channels"
                    className="mt-2 inline-block text-sm text-primary underline"
                  >
                    {t("goToChannels")}
                  </a>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {channels.map((ch) => {
                    const binding = bindings.find(
                      (b) => b.channelId === ch.id
                    );
                    const isSelected = !!binding;
                    return (
                      <div
                        key={ch.id}
                        className={`rounded-md border p-3 transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleChannel(ch.id)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">
                              {ch.name}
                            </span>
                            <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
                              {ch.type === "telegram" ? "Telegram" : "LINE"}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-2 ml-7">
                            <Label className="text-xs">{t("outputFormat")}</Label>
                            <select
                              className="mt-1 block rounded-md border px-2 py-1 text-sm"
                              value={binding.format}
                              onChange={(e) =>
                                setChannelFormat(
                                  ch.id,
                                  e.target.value as OutputFormat
                                )
                              }
                            >
                              <option value="audio">{t("formatAudio")}</option>
                              <option value="link">{t("formatLink")}</option>
                              <option value="both">{t("formatBoth")}</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {error && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}
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
              {bindings.length > 0
                ? bindings
                    .map((b) => {
                      const ch = channels.find((c) => c.id === b.channelId);
                      return ch ? ch.name : b.channelId;
                    })
                    .join(", ")
                : "None"}
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
          <Button
            onClick={() => {
              if (step === 4 && bindings.length === 0) {
                setError(t("outputRequired"));
                return;
              }
              setError("");
              setStep(step + 1);
            }}
          >
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
