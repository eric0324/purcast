import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { errorKey: "auth.tokenPasswordRequired" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { errorKey: "auth.passwordTooShort" },
        { status: 400 }
      );
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { errorKey: "auth.resetLinkInvalid" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: "ok" });
  } catch {
    return NextResponse.json(
      { errorKey: "auth.resetFailed" },
      { status: 500 }
    );
  }
}
