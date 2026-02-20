"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SidebarAccount } from "./usage-badge";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Layout.sidebar");
  const [open, setOpen] = useState(false);

  const actionItems = [
    { href: "/create" as const, label: t("singleGenerate") },
    { href: "/jobs" as const, label: t("automatedJobs") },
  ];

  const browseItems = [
    { href: "/history" as const, label: t("history") },
    { href: "/voices" as const, label: t("voices") },
    { href: "/channels" as const, label: t("channels") },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center border-b bg-background px-4 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </Button>
        <Link href="/" className="ml-2 text-lg font-bold">
          PurCast
        </Link>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r bg-background transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center border-b px-5">
          <Link href="/" className="text-lg font-bold">
            PurCast
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col overflow-y-auto p-4">
          <div className="flex flex-col gap-0.5">
            {actionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  pathname.startsWith(item.href)
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="my-3 border-t" />
          <div className="flex flex-col gap-0.5">
            {browseItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  pathname.startsWith(item.href)
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Account at bottom */}
        <div className="shrink-0 p-4">
          <SidebarAccount />
        </div>
      </aside>
    </>
  );
}
