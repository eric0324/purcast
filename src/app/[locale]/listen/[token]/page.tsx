import { prisma } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Headphones, ChevronRight } from "lucide-react";
import { ListenPlayer } from "./listen-player";

export default async function ListenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("Listen");

  const podcast = await prisma.podcast.findUnique({
    where: { shareToken: token, status: "completed" },
  });

  if (!podcast || !podcast.audioUrl) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/50">
        <header className="flex items-center justify-center p-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Headphones className="h-5 w-5" />
            PurCast
          </Link>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-lg text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Headphones className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold">{t("notFound")}</h1>
            <p className="text-muted-foreground">{t("notFoundDescription")}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/50">
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg space-y-3">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Headphones className="h-5 w-5" />
            PurCast
          </Link>

          {/* Audio player card */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <ListenPlayer src={podcast.audioUrl} />
          </div>
        </div>
      </main>

      {/* CTA footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <span className="text-sm font-medium">{t("ctaSlogan")}</span>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("ctaButton")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
