"use client";

import { Link } from "@/i18n/navigation";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-14 items-center px-4 md:px-6">
        <Link href="/" className="text-lg font-bold">
          PurCast
        </Link>
      </div>
    </header>
  );
}
