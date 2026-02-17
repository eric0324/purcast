import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { comparePassword } from "@/lib/auth/password";
import { setAuthCookie } from "@/lib/auth/cookie";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { errorKey: "auth.emailPasswordRequired" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { errorKey: "auth.invalidCredentials" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { errorKey: "auth.invalidCredentials" },
        { status: 401 }
      );
    }

    await setAuthCookie(user.id, user.email);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    return NextResponse.json(
      { errorKey: "auth.loginFailed" },
      { status: 500 }
    );
  }
}
