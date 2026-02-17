import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db/client";
import { setAuthCookie } from "@/lib/auth/cookie";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { errorKey: "auth.missingGoogleToken" },
        { status: 400 }
      );
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json(
        { errorKey: "auth.googleVerifyFailed" },
        { status: 401 }
      );
    }

    const { sub: googleId, email, name } = payload;

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, name: user.name || name },
        });
      }
    } else {
      user = await prisma.user.create({
        data: { email, googleId, name },
      });
    }

    await setAuthCookie(user.id, user.email);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    return NextResponse.json(
      { errorKey: "auth.googleLoginFailed" },
      { status: 500 }
    );
  }
}
