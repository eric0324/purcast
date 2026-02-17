import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkUsageLimit } from "@/lib/billing/usage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ errorKey: "unauthorized" }, { status: 401 });
    }

    const { used, limit, plan } = await checkUsageLimit(user.id);

    return NextResponse.json({ used, limit, plan });
  } catch {
    return NextResponse.json(
      { errorKey: "usage.fetchFailed" },
      { status: 500 }
    );
  }
}
