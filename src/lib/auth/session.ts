import { cookies } from "next/headers";
import { verifyJWT } from "./jwt";
import { COOKIE_NAME } from "./cookie";
import { prisma } from "@/lib/db/client";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyJWT(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  // User was deleted (e.g. DB reset) but JWT is still valid — clear stale cookie
  if (!user) {
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  return user;
}
