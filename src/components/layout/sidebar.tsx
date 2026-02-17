"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Layout.sidebar");
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/create" as const, label: t("createPodcast") },
    { href: "/history" as const, label: t("history") },
    { href: "/voices" as const, label: t("voices") },
  ];

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed left-4 top-3.5 z-50 md:hidden"
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
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-56 border-r bg-background p-4 transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
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
        </nav>
      </aside>
    </>
  );
}
