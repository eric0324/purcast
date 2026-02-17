import { prisma } from "@/lib/db/client";

export type Feature = "voice-clone";

const FEATURE_PLAN_MAP: Record<Feature, string> = {
  "voice-clone": "pro",
};

export async function checkFeatureAccess(
  userId: string,
  feature: Feature
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const requiredPlan = FEATURE_PLAN_MAP[feature];
  return user.plan === requiredPlan;
}
