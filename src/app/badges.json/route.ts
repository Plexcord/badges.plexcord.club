import { connection } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  await connection(); // DB reads are request-time; without this Next tries to prerender them
  const badges = await prisma.badge.findMany({
    orderBy: [{ userId: "asc" }, { position: "asc" }],
    select: { userId: true, tooltip: true, badge: true },
  });

  const out: Record<string, { tooltip: string; badge: string }[]> = {};
  for (const { userId, tooltip, badge } of badges) (out[userId] ??= []).push({ tooltip, badge });

  return Response.json(out, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
