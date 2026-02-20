"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ChannelData {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  createdAt: string;
}

interface ChannelListProps {
  initialChannels: ChannelData[];
}

export function ChannelList({ initialChannels }: ChannelListProps) {
  const t = useTranslations("Channels");
  const router = useRouter();
  const [channels, setChannels] = useState(initialChannels);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Custom channel dialog
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [customBotToken, setCustomBotToken] = useState("");
  const [customChatId, setCustomChatId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Official bot inline state
  const [officialError, setOfficialError] = useState("");

  // Telegram verification (inline in official bot section)
  const [telegramCode, setTelegramCode] = useState("");
  const [telegramBotLink, setTelegramBotLink] = useState("");
  const [telegramPolling, setTelegramPolling] = useState(false);

  const officialChannel = channels.find(
    (ch) => ch.type === "telegram" && ch.config.mode === "official"
  );
  const customChannels = channels.filter(
    (ch) => !(ch.type === "telegram" && ch.config.mode === "official")
  );

  function resetCustomForm() {
    setChannelName("");
    setCustomBotToken("");
    setCustomChatId("");
    setError("");
  }

  function resetOfficialFlow() {
    setTelegramCode("");
    setTelegramBotLink("");
    setTelegramPolling(false);
    setOfficialError("");
  }

  async function startTelegramVerify() {
    const res = await fetch("/api/telegram/connect", { method: "POST" });
    const data = await res.json();
    setTelegramCode(data.code);
    setTelegramBotLink(data.botLink);
    setTelegramPolling(true);

    const interval = setInterval(async () => {
      const pollRes = await fetch("/api/telegram/connect");
      const pollData = await pollRes.json();
      if (pollData.verified) {
        clearInterval(interval);
        setTelegramPolling(false);
        setTelegramCode("");
        await createOfficialChannel(pollData.chatId);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      setTelegramPolling(false);
    }, 600000);
  }

  async function createOfficialChannel(verifiedChatId: string) {
    setOfficialError("");

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "PurCast Official Bot",
          type: "telegram",
          mode: "official",
          chatId: verifiedChatId,
        }),
      });

      if (res.ok) {
        resetOfficialFlow();
        router.refresh();
        const listRes = await fetch("/api/channels");
        const listData = await listRes.json();
        setChannels(listData.channels);
      } else {
        const data = await res.json();
        setOfficialError(data.errorKey || "Unknown error");
      }
    } catch {
      setOfficialError("Network error");
    }
  }

  async function handleCreateCustom() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName,
          type: "telegram",
          mode: "custom",
          botToken: customBotToken,
          chatId: customChatId,
        }),
      });

      if (res.ok) {
        setShowAddCustom(false);
        resetCustomForm();
        router.refresh();
        const listRes = await fetch("/api/channels");
        const listData = await listRes.json();
        setChannels(listData.channels);
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

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/channels/${id}`, { method: "DELETE" });
      setChannels((prev) => prev.filter((c) => c.id !== id));
      setDeleteId(null);
      router.refresh();
    } catch {
      // ignore
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setChannels((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c))
        );
        setEditingId(null);
      }
    } catch {
      // ignore
    }
  }

  const isCustomCreateDisabled =
    submitting ||
    !channelName.trim() ||
    !customBotToken ||
    !customChatId;

  return (
    <div className="space-y-10">
      {/* Section 1: Official Bot */}
      <section>
        <h2 className="text-lg font-semibold">{t("officialBotSection")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("officialBotSectionDescription")}
        </p>

        <div className="mt-4">
          {officialChannel ? (
            <Card>
              <CardContent className="p-4">
                <p className="font-medium">{officialChannel.name}</p>
                <span className="mt-1 inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                  {t("connected")}
                </span>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                {telegramCode ? (
                  <div className="space-y-2 text-sm">
                    <p>{t("telegramVerifyHint")}</p>
                    <div className="flex items-center gap-2">
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
                      <p className="text-xs text-muted-foreground">
                        {t("telegramPolling")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t("officialBotDescription")}
                    </p>
                    {officialError && (
                      <p className="text-sm text-destructive">{officialError}</p>
                    )}
                    <Button variant="outline" onClick={startTelegramVerify}>
                      {t("setupOfficialBot")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Section 2: Custom Channels */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("customSection")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("customSectionDescription")}
            </p>
          </div>
          <Button onClick={() => setShowAddCustom(true)}>
            {t("addChannel")}
          </Button>
        </div>

        <div className="mt-4">
          {customChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {t("customEmptyDescription")}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customChannels.map((ch) => (
                <Card key={ch.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        {editingId === ch.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(ch.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRename(ch.id)}
                            >
                              OK
                            </Button>
                          </div>
                        ) : (
                          <h3
                            className="cursor-pointer truncate font-medium hover:underline"
                            onClick={() => {
                              setEditingId(ch.id);
                              setEditName(ch.name);
                            }}
                            title={t("clickToRename")}
                          >
                            {ch.name}
                          </h3>
                        )}
                        <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t("customBot")}
                        </span>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Chat ID: {ch.config.chatId as string}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(ch.id)}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Add Custom Channel Dialog */}
      <Dialog
        open={showAddCustom}
        onOpenChange={(open) => {
          setShowAddCustom(open);
          if (!open) resetCustomForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addChannel")}</DialogTitle>
            <DialogDescription>{t("customBotDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("channelName")}</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={t("channelNamePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("botToken")}</Label>
              <Input
                value={customBotToken}
                onChange={(e) => setCustomBotToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
                type="password"
              />
            </div>
            <div>
              <Label>{t("chatId")}</Label>
              <Input
                value={customChatId}
                onChange={(e) => setCustomChatId(e.target.value)}
                placeholder="-1001234567890"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCustom(false);
                resetCustomForm();
              }}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateCustom} disabled={isCustomCreateDisabled}>
              {submitting ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
