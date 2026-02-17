"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mic, Play, Pause, Trash2, Upload, Pencil, Check, X } from "lucide-react";
import { UploadVoiceDialog } from "./upload-voice-dialog";

interface Voice {
  id: string;
  name: string;
  sampleUrl: string | null;
  createdAt: Date;
}

export function VoiceList({ voices: initialVoices }: { voices: Voice[] }) {
  const t = useTranslations("Voices");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [voices, setVoices] = useState(initialVoices);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function handlePlay(voice: Voice) {
    if (!voice.sampleUrl) return;

    if (playingId === voice.id) {
      audioRef?.pause();
      setPlayingId(null);
      return;
    }

    audioRef?.pause();
    const audio = new Audio(voice.sampleUrl);
    audio.onended = () => setPlayingId(null);
    audio.play();
    setAudioRef(audio);
    setPlayingId(voice.id);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/voices/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setVoices((prev) => prev.filter((v) => v.id !== deleteId));
      }
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function startEditing(voice: Voice) {
    setEditingId(voice.id);
    setEditName(voice.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
  }

  async function handleRename(id: string) {
    if (!editName.trim() || editSaving) return;
    setEditSaving(true);

    try {
      const res = await fetch(`/api/voices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        setVoices((prev) =>
          prev.map((v) => (v.id === id ? { ...v, name: editName.trim() } : v))
        );
        setEditingId(null);
      }
    } finally {
      setEditSaving(false);
    }
  }

  if (voices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Mic className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">{t("empty")}</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <UploadVoiceDialog onSuccess={(voice) => setVoices((prev) => [voice, ...prev])}>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              {t("uploadVoice")}
            </Button>
          </UploadVoiceDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadVoiceDialog onSuccess={(voice) => setVoices((prev) => [voice, ...prev])}>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            {t("uploadVoice")}
          </Button>
        </UploadVoiceDialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {voices.map((voice) => (
          <Card key={voice.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                {editingId === voice.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(voice.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="h-7 text-sm"
                      autoFocus
                      disabled={editSaving}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleRename(voice.id)}
                      disabled={editSaving || !editName.trim()}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={cancelEditing}
                      disabled={editSaving}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className="truncate font-medium cursor-pointer hover:text-primary"
                    onClick={() => startEditing(voice)}
                    title={t("clickToRename")}
                  >
                    {voice.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(voice.createdAt).toLocaleDateString(locale)}
                </p>
              </div>
              <div className="flex gap-1">
                {editingId !== voice.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditing(voice)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {voice.sampleUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePlay(voice)}
                  >
                    {playingId === voice.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(voice.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t("deleting") : t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
