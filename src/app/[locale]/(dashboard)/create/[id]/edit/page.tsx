import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ScriptEditor } from "@/components/create/script-editor";
import type { DialogueScript } from "@/lib/llm/types";

export default async function ScriptEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const t = await getTranslations("ScriptEdit");

  const [podcast, voices] = await Promise.all([
    prisma.podcast.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, script: true, title: true },
    }),
    prisma.voice.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, elevenlabsVoiceId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!podcast || podcast.userId !== user.id) {
    notFound();
  }

  if (podcast.status !== "script_ready" || !podcast.script) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-xl font-bold">{t("notReady.title")}</h1>
        <p className="text-muted-foreground">{t("notReady.description")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          {podcast.title}
        </p>
      </div>
      <ScriptEditor
        podcastId={podcast.id}
        initialScript={podcast.script as unknown as DialogueScript}
        voices={voices}
      />
    </div>
  );
}
