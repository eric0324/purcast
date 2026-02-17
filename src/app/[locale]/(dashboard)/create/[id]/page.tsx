import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProgressPoller } from "./progress-poller";

export default async function ScriptGenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const t = await getTranslations("ScriptGeneration");

  const podcast = await prisma.podcast.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, title: true },
  });

  if (!podcast || podcast.userId !== user.id) {
    notFound();
  }

  if (podcast.status === "script_ready") {
    redirect(`/create/${id}/edit`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        <p className="text-sm text-muted-foreground font-medium">
          {podcast.title}
        </p>
      </div>
      <ProgressPoller podcastId={podcast.id} />
    </div>
  );
}
