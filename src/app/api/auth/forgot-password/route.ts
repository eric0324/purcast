import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { generateResetToken } from "@/lib/auth/jwt";
import { sendPasswordResetEmail } from "@/lib/email/client";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { errorKey: "auth.emailRequired" },
        { status: 400 }
      );
    }

    // Always return success to avoid revealing account existence
    const message = "ok";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message });
    }

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { errorKey: "auth.sendResetFailed" },
      { status: 500 }
    );
  }
}
