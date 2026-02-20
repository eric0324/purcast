import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChannelList } from "./channel-list";

export default async function ChannelsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Channels");

  const channels = await prisma.channel.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const serialized = channels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    type: ch.type,
    config: ch.config as Record<string, unknown>,
    createdAt: ch.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <ChannelList initialChannels={serialized} />
    </div>
  );
}
