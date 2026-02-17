import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations, getLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/settings/locale-switcher";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("Settings");
  const tCommon = await getTranslations("Common");
  const tLang = await getTranslations("Layout.languageSwitcher");
  const locale = await getLocale();

  const planLabel = user.plan === "pro" ? t("proPlan") : t("freePlan");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("accountInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">{tCommon("email")}</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          {user.name && (
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-muted-foreground">{t("name")}</span>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">{t("plan")}</span>
            <span className="text-sm font-medium">{planLabel}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">{t("registeredDate")}</span>
            <span className="text-sm font-medium">
              {new Date(user.createdAt).toLocaleDateString(locale)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tLang("label")}</span>
            <LocaleSwitcher />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
