"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, usedSlots } from "@/lib/db";
import { fetchImage, publishPending, removeBadgeFile, removePending, savePending } from "@/lib/images";
import { clearSession, getAccess } from "@/lib/session";

export type FormState = { ok?: string; error?: string };

async function requireAllowed() {
  const access = await getAccess();
  if (!access?.allowed) throw new Error("Unauthorized");
  return access;
}

async function requireAdmin() {
  const access = await getAccess();
  if (!access?.isAdmin) throw new Error("Unauthorized");
  return access;
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function reorderBadges(ids: number[]) {
  const { user } = await requireAllowed();
  const own = await prisma.badge.findMany({ where: { userId: user.id }, select: { id: true } });
  const ownIds = new Set(own.map((b) => b.id));
  if (ids.length !== ownIds.size || !ids.every((id) => ownIds.has(id))) throw new Error("Invalid order");

  await prisma.$transaction(ids.map((id, position) => prisma.badge.update({ where: { id }, data: { position } })));
}

// Tooltip and image (upload or URL) from a badge form; the image lands in pending storage.
async function readBadgeForm(form: FormData): Promise<{ tooltip: string; image: string } | { error: string }> {
  const tooltip = String(form.get("tooltip") ?? "").trim();
  if (!tooltip || tooltip.length > 100) return { error: "Tooltip must be 1–100 characters." };

  const file = form.get("image");
  const url = String(form.get("imageUrl") ?? "").trim();
  try {
    const buf =
      file instanceof File && file.size > 0
        ? new Uint8Array(await file.arrayBuffer())
        : url
          ? await fetchImage(url)
          : null;
    if (!buf) return { error: "Upload an image or paste an image URL." };
    return { tooltip, image: await savePending(buf) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not read the image." };
  }
}

// max+1, not count: deletions leave gaps in positions.
async function nextPosition(userId: string) {
  const { _max } = await prisma.badge.aggregate({ where: { userId }, _max: { position: true } });
  return (_max.position ?? -1) + 1;
}

export async function submitRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const { user, badgeLimit } = await requireAllowed();

  const target = String(form.get("badgeId") ?? "");
  const badgeId = target ? Number(target) : null;
  if (badgeId !== null && !Number.isSafeInteger(badgeId)) return { error: "Invalid badge." };
  if (badgeId !== null && !(await prisma.badge.findFirst({ where: { id: badgeId, userId: user.id } })))
    return { error: "That badge does not belong to you." };
  if (badgeId === null && (await usedSlots(user.id)) >= badgeLimit)
    return { error: `You've reached your limit of ${badgeLimit} badges.` };

  const read = await readBadgeForm(form);
  if ("error" in read) return read;
  const { tooltip, image } = read;

  await prisma.badgeRequest.create({ data: { userId: user.id, badgeId, tooltip, image } });

  // Only the latest change request per badge stays pending; older ones are dropped with their images.
  let replaced = 0;
  if (badgeId !== null) {
    const stale = await prisma.badgeRequest.findMany({
      where: { userId: user.id, badgeId, status: "PENDING", image: { not: image } },
    });
    for (const r of stale) {
      // status guard: skip one an admin is approving right now
      const { count } = await prisma.badgeRequest.deleteMany({ where: { id: r.id, status: "PENDING" } });
      if (count) await removePending(r.image);
      replaced += count;
    }
  }

  refresh();
  return {
    ok: replaced
      ? "Request updated! Your previous request for this badge was replaced."
      : "Request sent! An admin will review it soon.",
  };
}

export async function approveRequest(id: number) {
  const { user } = await requireAdmin();
  const req = await prisma.badgeRequest.findUnique({ where: { id }, include: { badgeRef: true } });
  if (!req) return;

  // Claim the request first so a double click can't approve it twice.
  const claimed = await prisma.badgeRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "APPROVED", reviewedBy: user.id, reviewedAt: new Date() },
  });
  if (claimed.count === 0) return;

  try {
    const badge = await publishPending(req.image, req.userId);
    if (req.badgeRef) {
      await prisma.badge.update({ where: { id: req.badgeRef.id }, data: { tooltip: req.tooltip, badge } });
      await removeBadgeFile(req.badgeRef.badge);
    } else {
      const position = await nextPosition(req.userId);
      await prisma.badge.create({ data: { userId: req.userId, tooltip: req.tooltip, badge, position } });
    }
  } catch (e) {
    await prisma.badgeRequest.update({ where: { id }, data: { status: "PENDING", reviewedBy: null, reviewedAt: null } });
    throw e;
  }
  refresh();
}

export async function rejectRequest(id: number) {
  const { user } = await requireAdmin();
  const req = await prisma.badgeRequest.findUnique({ where: { id } });
  const claimed = await prisma.badgeRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", reviewedBy: user.id, reviewedAt: new Date() },
  });
  if (req && claimed.count) await removePending(req.image);
  refresh();
}

// Admins add a badge to anyone directly: no review and no limit, it is their call.
export async function adminAddBadge(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = String(form.get("userId") ?? "").trim();
  if (!/^\d{17,20}$/.test(userId)) return { error: "That is not a valid Discord user ID." };

  const read = await readBadgeForm(form);
  if ("error" in read) return read;

  const badge = await publishPending(read.image, userId);
  await prisma.badge.create({ data: { userId, tooltip: read.tooltip, badge, position: await nextPosition(userId) } });
  refresh();
  return { ok: `Added “${read.tooltip}” to ${userId}.` };
}

// Owners can delete their own badges, admins any badge.
export async function deleteBadge(id: number) {
  const access = await getAccess();
  const badge = await prisma.badge.findUnique({ where: { id }, select: { userId: true } });
  if (!access || !badge || (!access.isAdmin && badge.userId !== access.user.id)) throw new Error("Unauthorized");
  await purgeBadge(id);
  refresh();
}

async function purgeBadge(id: number) {
  const badge = await prisma.badge.findUnique({
    where: { id },
    include: { requests: { where: { status: "PENDING" } } },
  });
  if (!badge) return;
  await prisma.badge.delete({ where: { id } }); // cascades to its change requests
  await Promise.all([removeBadgeFile(badge.badge), ...badge.requests.map((r) => removePending(r.image))]);
}

const parseLimit = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : null;
};

export async function addAllowedUser(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "").trim();
  if (!/^\d{17,20}$/.test(id)) return { error: "That is not a valid Discord user ID." };
  const badgeLimit = parseLimit(form.get("limit"));
  if (badgeLimit === null) return { error: "Limit must be a whole number between 0 and 100." };
  await prisma.allowedUser.upsert({ where: { id }, create: { id, badgeLimit }, update: { badgeLimit } });
  refresh();
  return { ok: `Added ${id} with a limit of ${badgeLimit}.` };
}

export async function setBadgeLimit(id: string, form: FormData) {
  const { user } = await requireAdmin();
  const badgeLimit = parseLimit(form.get("limit"));
  if (badgeLimit === null) throw new Error("Invalid limit");
  await prisma.allowedUser.update({ where: { id }, data: { badgeLimit } });

  // Over the new limit: drop badges from the end of the user's order (5, 4, 3 … keeps 1..limit).
  const extra = await prisma.badge.findMany({
    where: { userId: id },
    orderBy: { position: "asc" },
    skip: badgeLimit,
    select: { id: true },
  });
  for (const b of extra) await purgeBadge(b.id);

  // Then reject pending new-badge requests that no longer fit, newest first.
  const kept = await prisma.badge.count({ where: { userId: id } });
  const overflow = await prisma.badgeRequest.findMany({
    where: { userId: id, status: "PENDING", badgeId: null },
    orderBy: { createdAt: "asc" },
    skip: Math.max(0, badgeLimit - kept),
  });
  for (const r of overflow) {
    const { count } = await prisma.badgeRequest.updateMany({
      where: { id: r.id, status: "PENDING" },
      data: { status: "REJECTED", reviewedBy: user.id, reviewedAt: new Date() },
    });
    if (count) await removePending(r.image);
  }

  refresh();
}

export async function removeAllowedUser(id: string) {
  const { user } = await requireAdmin();
  if (id === user.id) throw new Error("You can't remove yourself.");
  await prisma.allowedUser.deleteMany({ where: { id } });
  refresh();
}
