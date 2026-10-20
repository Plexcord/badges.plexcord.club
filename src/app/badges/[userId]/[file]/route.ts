import { readFile } from "node:fs/promises";
import path from "node:path";
import { BADGE_DIR, contentDisposition, FILE_RE, MIME, type ImageExt } from "@/lib/images";

// Files written at runtime are not served from /public in production, so serve them here.
export async function GET(req: Request, ctx: RouteContext<"/badges/[userId]/[file]">) {
  const { userId, file } = await ctx.params;
  if (!/^\d+$/.test(userId) || !FILE_RE.test(file)) return new Response("Not found", { status: 404 });

  const ext = path.extname(file).slice(1) as ImageExt;
  // ?download=<name> saves the file instead of opening it.
  const download = new URL(req.url).searchParams.get("download");

  try {
    const data = await readFile(path.join(BADGE_DIR, userId, file));
    return new Response(data, {
      headers: {
        "Content-Type": MIME[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
        ...(download !== null && { "Content-Disposition": contentDisposition(download, ext) }),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
