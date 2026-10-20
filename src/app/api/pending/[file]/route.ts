import path from "node:path";
import { prisma } from "@/lib/db";
import { FILE_RE, MIME, readPending, type ImageExt } from "@/lib/images";
import { getAccess } from "@/lib/session";

// Pending uploads are visible only to admins and the user who submitted them.
export async function GET(_req: Request, ctx: RouteContext<"/api/pending/[file]">) {
  const { file } = await ctx.params;
  const access = await getAccess();
  if (!access || !FILE_RE.test(file)) return new Response("Not found", { status: 404 });

  if (!access.isAdmin) {
    const own = await prisma.badgeRequest.findFirst({ where: { image: file, userId: access.user.id } });
    if (!own) return new Response("Not found", { status: 404 });
  }

  try {
    return new Response(await readPending(file), {
      headers: {
        "Content-Type": MIME[path.extname(file).slice(1) as ImageExt],
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
