import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const COOKIE_NAME = "purcast_token";
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];
const PUBLIC_PAGES = ["/listen"];

const intlMiddleware = createMiddleware(routing);

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix for path matching (next-intl may route via /en or /zh-TW internally)
  const pathWithoutLocale = pathname.replace(/^\/(zh-TW|en)(\/|$)/, "/");

  // Let the landing page (/) and public pages pass through without auth
  if (pathWithoutLocale === "/") {
    return intlMiddleware(request);
  }

  const isPublicPage = PUBLIC_PAGES.some((p) => pathWithoutLocale.startsWith(p));
  if (isPublicPage) {
    return intlMiddleware(request);
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!payload;

  const isAuthPage = AUTH_PAGES.some((p) => pathWithoutLocale.startsWith(p));

  // Authenticated user visiting auth pages → redirect to dashboard
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/history", request.url));
  }

  // Unauthenticated user visiting protected pages → redirect to login
  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Run intl middleware for locale cookie handling
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
