"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DialogueScript } from "@/lib/llm/types";

interface TranscriptPanelProps {
  script: DialogueScript;
}

export function TranscriptPanel({ script }: TranscriptPanelProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Listen");

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium hover:bg-muted/50 transition-colors rounded-xl"
      >
        <span>{t("transcript")}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="max-h-96 overflow-y-auto border-t px-6 py-4 space-y-3">
          {script.map((line, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                line.speaker === "A"
                  ? "bg-blue-50 dark:bg-blue-950/30"
                  : "bg-green-50 dark:bg-green-950/30"
              }`}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {line.speaker === "A" ? "Host A" : "Host B"}
              </span>
              <p className="mt-0.5">{line.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
