import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: Update channel name
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.channel.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ errorKey: "channels.notFound" }, { status: 404 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { errorKey: "channels.nameRequired" },
      { status: 400 }
    );
  }

  const channel = await prisma.channel.update({
    where: { id },
    data: { name: name.trim() },
  });

  return NextResponse.json({ channel: { id: channel.id, name: channel.name } });
}

// DELETE: Delete channel and clean up Job references
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.channel.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ errorKey: "channels.notFound" }, { status: 404 });
  }

  // Remove this channel from any Job outputConfig that references it
  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    select: { id: true, outputConfig: true },
  });

  for (const job of jobs) {
    const bindings = job.outputConfig as unknown as Array<{ channelId: string; format: string }>;
    if (Array.isArray(bindings)) {
      const filtered = bindings.filter((b) => b.channelId !== id);
      if (filtered.length !== bindings.length) {
        await prisma.job.update({
          where: { id: job.id },
          data: { outputConfig: JSON.parse(JSON.stringify(filtered)) },
        });
      }
    }
  }

  await prisma.channel.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
