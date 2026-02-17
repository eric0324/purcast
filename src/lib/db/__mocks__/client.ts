import { beforeEach } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@/generated/prisma/client";

export const prisma = mockDeep<PrismaClient>();
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prisma);
});
