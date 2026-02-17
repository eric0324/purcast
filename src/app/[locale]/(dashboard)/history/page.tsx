import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PodcastList } from "./podcast-list";

const PAGE_SIZE = 10;

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("History");

  const podcasts = await prisma.podcast.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = podcasts.length > PAGE_SIZE;
  const items = hasMore ? podcasts.slice(0, PAGE_SIZE) : podcasts;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <PodcastList
        initialPodcasts={items}
        initialHasMore={hasMore}
      />
    </div>
  );
}
