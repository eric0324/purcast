"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocaleSwitcher } from "@/components/settings/locale-switcher";

interface UserInfo {
  name: string | null;
  email: string;
  used: number;
  limit: number;
  plan: string;
  createdAt: string;
}

export function SidebarAccount() {
  const t = useTranslations("Layout.sidebar");
  const tHeader = useTranslations("Layout.header");
  const tSettings = useTranslations("Settings");
  const tLang = useTranslations("Layout.languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => setInfo(data))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!info) return null;

  const limitReached = info.used >= info.limit;
  const percent = Math.min((info.used / info.limit) * 100, 100);
  const displayName = info.name || info.email;
  const initial = (info.name?.[0] || info.email[0]).toUpperCase();
  const planLabel = info.plan === "pro" ? tSettings("proPlan") : tSettings("freePlan");

  return (
    <>
      <div className="flex flex-col gap-3 border-t pt-3">
        {/* Usage */}
        <div className="px-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("usageLabel")}</span>
            <span className="tabular-nums">
              {info.used} / {info.limit}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                limitReached ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Account trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{displayName}</div>
                {info.name && (
                  <div className="truncate text-xs text-muted-foreground">{info.email}</div>
                )}
              </div>
              <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="center" className="w-[--radix-dropdown-menu-trigger-width]">
            <div className="px-2 py-2">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">{info.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tHeader("settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {tHeader("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tSettings("title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Row label={tSettings("name")} value={info.name || "—"} />
            <Row label="Email" value={info.email} />
            <Row label={tSettings("plan")} value={planLabel} />
            <Row
              label={tSettings("registeredDate")}
              value={new Date(info.createdAt).toLocaleDateString(locale)}
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-muted-foreground">{tLang("label")}</span>
              <LocaleSwitcher />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
