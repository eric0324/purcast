"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UsageBadge } from "./usage-badge";

export function Header() {
  const router = useRouter();
  const t = useTranslations("Layout.header");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Link href="/" className="mr-auto text-lg font-bold">
          Podify
        </Link>

        <UsageBadge />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {t("account")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/settings">{t("settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
