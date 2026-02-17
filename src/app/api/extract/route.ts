import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getExtractor } from "@/lib/content/extractors";
import { ExtractError, type ExtractErrorCode } from "@/lib/content/extractors/web";

const ERROR_MAP: Record<ExtractErrorCode, { status: number; errorKey: string }> = {
  TIMEOUT: { status: 408, errorKey: "extract.timeout" },
  HTML_TOO_LARGE: { status: 413, errorKey: "extract.htmlTooLarge" },
  FETCH_FAILED: { status: 400, errorKey: "extract.fetchFailed" },
  PARSE_FAILED: { status: 422, errorKey: "extract.parseFailed" },
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { errorKey: "unauthorized" },
        { status: 401 }
      );
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { errorKey: "extract.urlRequired" },
        { status: 400 }
      );
    }

    if (!/^https?:\/\/.+/.test(url)) {
      return NextResponse.json(
        { errorKey: "extract.invalidUrl" },
        { status: 400 }
      );
    }

    const extractor = getExtractor(url);
    if (!extractor) {
      return NextResponse.json(
        { errorKey: "extract.invalidUrl" },
        { status: 400 }
      );
    }

    const result = await extractor.extract(url);

    return NextResponse.json({
      title: result.title,
      content: result.content,
      url: result.sourceUrl,
      truncated: result.truncated,
    });
  } catch (err) {
    if (err instanceof ExtractError) {
      const mapped = ERROR_MAP[err.code];
      return NextResponse.json(
        { errorKey: mapped.errorKey },
        { status: mapped.status }
      );
    }

    return NextResponse.json(
      { errorKey: "extract.failed" },
      { status: 500 }
    );
  }
}
