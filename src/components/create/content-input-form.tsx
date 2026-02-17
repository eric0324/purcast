"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, Globe, AlertCircle } from "lucide-react";

const CONTENT_MAX_LENGTH = 50_000;
const CONTENT_MIN_LENGTH = 100;

type Tab = "text" | "url";

interface ExtractedContent {
  title: string;
  content: string;
  url: string;
  truncated: boolean;
}

export function ContentInputForm() {
  const t = useTranslations("CreatePodcast");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [textContent, setTextContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => setUsage({ used: data.used, limit: data.limit }))
      .catch(() => {});
  }, []);

  const currentContent =
    activeTab === "text" ? textContent : extracted?.content ?? "";
  const isTruncated =
    activeTab === "text"
      ? textContent.length >= CONTENT_MAX_LENGTH
      : extracted?.truncated ?? false;
  const limitReached = usage ? usage.used >= usage.limit : false;
  const canSubmit =
    currentContent.length >= CONTENT_MIN_LENGTH &&
    !submitting &&
    !limitReached;

  const hasContent =
    (activeTab === "text" && textContent.length > 0) ||
    (activeTab === "url" && extracted !== null);

  const handleTabSwitch = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return;
      if (hasContent) {
        setPendingTab(tab);
        setShowSwitchDialog(true);
      } else {
        setActiveTab(tab);
      }
    },
    [activeTab, hasContent]
  );

  const confirmSwitch = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setTextContent("");
      setUrlInput("");
      setExtracted(null);
      setUrlError("");
      setError("");
    }
    setShowSwitchDialog(false);
    setPendingTab(null);
  }, [pendingTab]);

  const handleTextChange = useCallback(
    (value: string) => {
      if (value.length > CONTENT_MAX_LENGTH) {
        setTextContent(value.slice(0, CONTENT_MAX_LENGTH));
      } else {
        setTextContent(value);
      }
      setError("");
    },
    []
  );

  const isValidUrl = useCallback((url: string) => {
    return /^https?:\/\/.+/.test(url);
  }, []);

  const handleExtract = useCallback(async () => {
    setUrlError("");
    setError("");

    if (!isValidUrl(urlInput)) {
      setUrlError(t("url.invalidUrl"));
      return;
    }

    setExtracting(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorKey = data.errorKey;
        setError(errorKey ? tErrors(errorKey) : t("fallbackError"));
        return;
      }

      setExtracted(data);
    } catch {
      setError(t("fallbackError"));
    } finally {
      setExtracting(false);
    }
  }, [urlInput, isValidUrl, t, tErrors]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/podcasts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: activeTab,
          sourceContent: currentContent,
          sourceUrl: activeTab === "url" ? extracted?.url : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorKey = data.errorKey;
        setError(errorKey ? tErrors(errorKey) : t("fallbackError"));
        return;
      }

      // Fire-and-forget: trigger script generation
      fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podcastId: data.podcast.id }),
      });

      router.push(`/create/${data.podcast.id}`);
    } catch {
      setError(t("fallbackError"));
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    activeTab,
    currentContent,
    extracted,
    router,
    t,
    tErrors,
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 額度已滿警告 */}
      {limitReached && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("usageLimitReached")}
        </div>
      )}

      {/* Tab 切換 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTabSwitch("text")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "text"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <FileText className="h-4 w-4" />
          {t("tabs.text")}
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch("url")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "url"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Globe className="h-4 w-4" />
          {t("tabs.url")}
        </button>
      </div>

      {/* 文字貼入 */}
      {activeTab === "text" && (
        <div className="space-y-2">
          <textarea
            value={textContent}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t("text.placeholder")}
            className="flex min-h-[300px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t("text.charCount", {
                count: textContent.length,
                limit: CONTENT_MAX_LENGTH,
              })}
            </span>
            {isTruncated && (
              <span className="text-amber-500">
                {t("text.truncatedWarning", { limit: CONTENT_MAX_LENGTH })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* URL 擷取 */}
      {activeTab === "url" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError("");
              }}
              placeholder={t("url.placeholder")}
              type="url"
              className="flex-1"
              disabled={extracting}
            />
            <Button
              onClick={handleExtract}
              disabled={extracting || !urlInput.trim()}
            >
              {extracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("url.extracting")}
                </>
              ) : (
                t("url.extractButton")
              )}
            </Button>
          </div>
          {urlError && (
            <p className="text-sm text-destructive">{urlError}</p>
          )}

          {/* 擷取結果預覽 */}
          {extracted && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-medium">{t("preview.title")}</h3>
                {extracted.title && (
                  <p className="font-semibold">{extracted.title}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {extracted.content.slice(0, 200)}
                  {extracted.content.length > 200 ? "..." : ""}
                </p>
                {extracted.truncated && (
                  <p className="text-xs text-amber-500">
                    {t("text.truncatedWarning", { limit: CONTENT_MAX_LENGTH })}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExtracted(null);
                      setUrlInput("");
                    }}
                  >
                    {t("preview.reExtract")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* 最低字數提示 */}
      {currentContent.length > 0 &&
        currentContent.length < CONTENT_MIN_LENGTH && (
          <p className="text-sm text-muted-foreground">
            {t("minCharsHint", { min: CONTENT_MIN_LENGTH })}
          </p>
        )}

      {/* 下一步按鈕 */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tCommon("loading")}
          </>
        ) : (
          t("next")
        )}
      </Button>

      {/* 切換確認對話框 */}
      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("switchConfirm.title")}</DialogTitle>
            <DialogDescription>
              {t("switchConfirm.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSwitchDialog(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={confirmSwitch}>{tCommon("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
