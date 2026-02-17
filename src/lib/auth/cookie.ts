import { cookies } from "next/headers";
import { signJWT } from "./jwt";

const COOKIE_NAME = "podify_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function setAuthCookie(userId: string, email: string) {
  const token = signJWT({ userId, email });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
