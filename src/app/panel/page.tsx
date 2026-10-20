/* eslint-disable @next/next/no-img-element -- Discord avatar */
import { Suspense } from "react";
import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { logout } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { BadgeManager } from "@/components/badge-manager";
import { DiscordLoginButton } from "@/components/discord-login";
import { prisma, usedSlots } from "@/lib/db";
import { avatarUrl, getAccess } from "@/lib/session";

export const metadata = { title: "Your badges · Plexcord Badges" };

export default function PanelPage({ searchParams }: PageProps<"/panel">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ground" />}>
      <Panel searchParams={searchParams} />
    </Suspense>
  );
}

// Signed-out and not-allowed states: one panel centred on the ground, the product named above it.
function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-ground px-4">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-4 block text-[15px] font-semibold">
          Plexcord Badges
        </Link>
        <div className="panel p-6">{children}</div>
      </div>
    </main>
  );
}

async function Panel({ searchParams }: Pick<PageProps<"/panel">, "searchParams">) {
  const [access, { error }] = await Promise.all([getAccess(), searchParams]);

  if (!access)
    return (
      <Gate>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Your badges</h1>
        <p className="mt-1 text-[14px] text-muted">Sign in with Discord to see and manage your badges.</p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-neg-bg px-3 py-2 text-[14px] text-negative">
            Login failed. Please try again.
          </p>
        )}
        <div className="mt-6">
          <DiscordLoginButton />
        </div>
      </Gate>
    );

  const { user, allowed, isAdmin, badgeLimit } = access;

  if (!allowed)
    return (
      <Gate>
        <div className="flex items-center gap-3">
          <img src={avatarUrl(user)} alt="" width={36} height={36} className="size-9 rounded-full" />
          <div className="mr-auto min-w-0">
            <p className="truncate text-[14px] font-medium">{user.username}</p>
            <p className="num text-[12px] text-muted">{user.id}</p>
          </div>
          <form action={logout}>
            <button className="btn btn-quiet !h-8 !px-2" aria-label="Log out" title="Log out">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
        <h1 className="mt-6 text-[20px] font-semibold">No badges yet</h1>
        <p className="mt-2 text-[14px] leading-relaxed">
          Rozet yönetimi için yetkiniz bulunmamaktadır. Bağış yaparak siz de özel rozet kazanabilirsiniz!
        </p>
        <a href={process.env.DONATE_URL ?? "#"} target="_blank" rel="noreferrer" className="btn btn-primary mt-6 w-full">
          Bağış Yap
        </a>
      </Gate>
    );

  const [badges, requests, used, pending] = await Promise.all([
    prisma.badge.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } }),
    prisma.badgeRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    usedSlots(user.id),
    isAdmin ? prisma.badgeRequest.count({ where: { status: "PENDING" } }) : 0,
  ]);
  const waiting = requests.filter((r) => r.status === "PENDING").length;
  const full = used >= badgeLimit;

  return (
    <AppShell user={user} isAdmin={isAdmin} pending={pending} current="/panel">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Your badges</h1>
            <p className="num mt-1 text-[15px] text-muted">
              {badges.length} worn{waiting ? ` · ${waiting} waiting for review` : ""} · {used} of {badgeLimit} slots used
              {full && " — delete or change one to make room"}
            </p>
          </div>
          {!full && (
            <a href="#request" className="btn btn-primary">
              <Plus className="size-4" /> Request a badge
            </a>
          )}
        </div>
        {/* Remount when server data changes (approval, reorder) instead of syncing state in an effect. */}
        <BadgeManager
          key={badges.map((b) => `${b.id}:${b.badge}:${b.tooltip}`).join()}
          limit={badgeLimit}
          used={used}
          badges={badges.map(({ id, tooltip, badge }) => ({ id, tooltip, badge }))}
          requests={requests.map(({ id, tooltip, image, status, badgeId, createdAt }) => ({
            id,
            tooltip,
            image,
            status,
            badgeId,
            createdAt: createdAt.toISOString(),
          }))}
        />
      </div>
    </AppShell>
  );
}
