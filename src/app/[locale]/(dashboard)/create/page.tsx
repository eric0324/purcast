import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ContentInputForm } from "@/components/create/content-input-form";

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("CreatePodcast");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <ContentInputForm />
    </div>
  );
}
