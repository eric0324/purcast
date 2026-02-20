export const PLAN_LIMITS = {
  free: Number(process.env.NEXT_PUBLIC_PLAN_LIMIT_FREE) || 5,
  pro: Number(process.env.NEXT_PUBLIC_PLAN_LIMIT_PRO) || 100,
} as const;
