"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth.forgotPassword");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.errorKey ? tErrors(data.errorKey) : data.error);
        return;
      }

      setSent(true);
    } catch {
      setError(t("fallbackError"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("sentTitle")}</CardTitle>
          <CardDescription>{t("sentDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/login">
            <Button variant="outline">{t("backToLogin")}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{tCommon("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("submitting") : t("submit")}
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
