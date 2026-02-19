import crypto from "crypto";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESULT_TTL_MS = 5 * 60 * 1000; // 5 minutes for results

interface PendingVerification {
  userId: string;
  code: string;
  expiresAt: number;
}

interface VerificationResult {
  chatId: string;
  expiresAt: number;
}

// In-memory store for pending verification codes
// In production with multiple instances, use DB instead
const pendingCodes = new Map<string, PendingVerification>();

// Store verified results so frontend can poll for chatId
const verifiedResults = new Map<string, VerificationResult>();

export function generateVerificationCode(userId: string): string {
  // Remove any existing code for this user
  for (const [code, entry] of pendingCodes) {
    if (entry.userId === userId) {
      pendingCodes.delete(code);
    }
  }

  const code = crypto.randomInt(100000, 999999).toString();

  pendingCodes.set(code, {
    userId,
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  });

  return code;
}

export function verifyCode(
  code: string
): { userId: string } | null {
  const entry = pendingCodes.get(code);
  if (!entry) return null;

  // Remove used code
  pendingCodes.delete(code);

  // Check expiration
  if (Date.now() > entry.expiresAt) return null;

  return { userId: entry.userId };
}

export function storeVerifiedChatId(userId: string, chatId: string): void {
  verifiedResults.set(userId, {
    chatId,
    expiresAt: Date.now() + RESULT_TTL_MS,
  });
}

export function getVerifiedChatId(userId: string): string | null {
  const result = verifiedResults.get(userId);
  if (!result) return null;

  if (Date.now() > result.expiresAt) {
    verifiedResults.delete(userId);
    return null;
  }

  // Consume the result
  verifiedResults.delete(userId);
  return result.chatId;
}

// Cleanup expired codes and results periodically
export function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [code, entry] of pendingCodes) {
    if (now > entry.expiresAt) {
      pendingCodes.delete(code);
    }
  }
  for (const [userId, result] of verifiedResults) {
    if (now > result.expiresAt) {
      verifiedResults.delete(userId);
    }
  }
}
