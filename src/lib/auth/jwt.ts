import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = "7d";

interface JWTPayload {
  userId: string;
  email: string;
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function generateResetToken(): string {
  return randomUUID();
}
