import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/cookie";
import { prisma } from "@/lib/db/client";

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyJWT(token) : null;

  if (!payload) {
    return NextResponse.json({ errorKey: "unauthorized" }, { status: 401 });
  }

  const cursor = request.nextUrl.searchParams.get("cursor");

  const podcasts = await prisma.podcast.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const hasMore = podcasts.length > PAGE_SIZE;
  const items = hasMore ? podcasts.slice(0, PAGE_SIZE) : podcasts;

  return NextResponse.json({ podcasts: items, hasMore });
}
