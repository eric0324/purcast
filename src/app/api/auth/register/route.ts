import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { setAuthCookie } from "@/lib/auth/cookie";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { errorKey: "auth.emailPasswordRequired" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { errorKey: "auth.invalidEmail" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { errorKey: "auth.passwordTooShort" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { errorKey: "auth.emailTaken" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    await setAuthCookie(user.id, user.email);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    return NextResponse.json(
      { errorKey: "auth.registerFailed" },
      { status: 500 }
    );
  }
}
