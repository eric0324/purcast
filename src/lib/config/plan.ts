export const PLAN_LIMITS = {
  free: Number(process.env.NEXT_PUBLIC_PLAN_LIMIT_FREE) || 3,
  pro: Number(process.env.NEXT_PUBLIC_PLAN_LIMIT_PRO) || 30,
} as const;

/** Hard limits for cost control — not configurable via env */
export const HARD_LIMITS = {
  /** Max target podcast duration in minutes */
  targetMinutesMax: 20,
  /** Max articles per job run */
  maxArticles: 8,
  /** Max user text input in characters */
  contentMaxLength: 10_000,
  /** Min user text input in characters */
  contentMinLength: 100,
  /** Max article content sent to LLM per article (chars) */
  articleTruncateLength: 3_000,
  /** Max links extracted by URL monitor */
  urlMonitorMaxLinks: 20,
  /** Max AI filter prompt length in characters */
  aiPromptMaxLength: 200,
  /** Max dialogue line length in characters (TTS cost control) */
  dialogueLineMaxLength: 500,
  /** Reddit: max posts per fetch */
  redditMaxPosts: 15,
  /** Reddit: max comments per post */
  redditMaxComments: 5,
} as const;
