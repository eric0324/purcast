import nodemailer from "nodemailer";
import { getTranslations } from "next-intl/server";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@podify.app";

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  locale: string = "zh-TW"
) {
  const t = await getTranslations({ locale, namespace: "Email.resetPassword" });
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"Podify" <${FROM_EMAIL}>`,
    to,
    subject: t("subject"),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${t("heading")}</h2>
        <p>${t("body")}</p>
        <p>${t("instruction")}</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">${t("buttonText")}</a>
        <p style="margin-top:24px;color:#666;font-size:14px;">${t("ignore")}</p>
      </div>
    `,
  });
}
