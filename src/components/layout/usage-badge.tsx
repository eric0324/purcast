"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function UsageBadge() {
  const t = useTranslations("Layout.header");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => setUsage({ used: data.used, limit: data.limit }))
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const limitReached = usage.used >= usage.limit;

  return (
    <span
      className={`text-xs tabular-nums px-2.5 py-1 rounded-full ${
        limitReached
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {t("usage", { used: usage.used, limit: usage.limit })}
    </span>
  );
}
