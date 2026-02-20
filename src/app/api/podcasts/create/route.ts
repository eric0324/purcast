import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { cleanContent, validateContent } from "@/lib/content/clean";
import { checkUsageLimit, incrementUsage } from "@/lib/billing/usage";

const VALID_SOURCE_TYPES = ["text", "url"] as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { errorKey: "unauthorized" },
        { status: 401 }
      );
    }

    const { sourceType, sourceContent, sourceUrl } =
      await request.json();

    if (!VALID_SOURCE_TYPES.includes(sourceType)) {
      return NextResponse.json(
        { errorKey: "podcast.invalidSourceType" },
        { status: 400 }
      );
    }

    if (!sourceContent) {
      return NextResponse.json(
        { errorKey: "podcast.contentRequired" },
        { status: 400 }
      );
    }

    const { text: cleanedContent } = cleanContent(sourceContent);
    const validation = validateContent(cleanedContent);

    if (!validation.valid) {
      return NextResponse.json(
        { errorKey: "podcast.contentTooShort" },
        { status: 400 }
      );
    }

    // Check usage limit before creating podcast
    const usageCheck = await checkUsageLimit(user.id);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { errorKey: "usage.limitReached" },
        { status: 403 }
      );
    }

    // Temp title from content preview — AI will replace it during script generation
    const tempTitle = cleanedContent.slice(0, 50).replace(/\s+/g, " ").trim() + (cleanedContent.length > 50 ? "..." : "");

    const podcast = await prisma.podcast.create({
      data: {
        userId: user.id,
        title: tempTitle,
        sourceType,
        sourceContent: cleanedContent,
        sourceUrl: sourceType === "url" ? sourceUrl : null,
        status: "pending",
        shareToken: nanoid(12),
      },
    });

    // Increment usage count after successful podcast creation
    await incrementUsage(user.id);

    return NextResponse.json({ podcast: { id: podcast.id } });
  } catch {
    return NextResponse.json(
      { errorKey: "podcast.createFailed" },
      { status: 500 }
    );
  }
}
