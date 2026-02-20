import { prisma } from "@/lib/db/client";
import { PLAN_LIMITS } from "@/lib/config/plan";

interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: string;
}

/**
 * Check if user has remaining usage quota for current month
 */
export async function checkUsageLimit(
  userId: string
): Promise<UsageCheckResult> {
  // Get user plan
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const plan = user.plan as "free" | "pro";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Get usage for current month
  const usage = await prisma.usage.findUnique({
    where: {
      userId_month: {
        userId,
        month: currentMonth,
      },
    },
    select: { generationCount: true },
  });

  const used = usage?.generationCount ?? 0;
  const allowed = used < limit;

  return {
    allowed,
    used,
    limit,
    plan,
  };
}

/**
 * Increment usage count for current month
 */
export async function incrementUsage(userId: string): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);

  await prisma.usage.upsert({
    where: {
      userId_month: {
        userId,
        month: currentMonth,
      },
    },
    update: {
      generationCount: {
        increment: 1,
      },
    },
    create: {
      userId,
      month: currentMonth,
      generationCount: 1,
    },
  });
}
