/* eslint-disable @next/next/no-img-element -- badges are small user images served by our own route */
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Check, Trash2, X } from "lucide-react";
import { approveRequest, rejectRequest, removeAllowedUser } from "@/app/actions";
import { AddUserForm } from "@/components/add-user-form";
import { AdminBadgeForm } from "@/components/admin-badge-form";
import { AppShell } from "@/components/app-shell";
import { DeleteBadgeButton } from "@/components/delete-badge-button";
import { LimitForm } from "@/components/limit-form";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/db";
import { getAccess } from "@/lib/session";

export const metadata = { title: "Requests · Plexcord Badges" };

const TABS = [
  ["requests", "Waiting for review"],
  ["donors", "Donors"],
  ["badges", "All badges"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ground" />}>
      <Admin searchParams={searchParams} />
    </Suspense>
  );
}

// "How long ago" in words for recency, from the server's clock.
function ago(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

async function Admin({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const [access, params] = await Promise.all([getAccess(), searchParams]);
  if (!access?.isAdmin)
    return (
      <main className="grid min-h-screen place-items-center bg-ground px-4">
        <div className="panel max-w-[400px] p-6">
          <h1 className="text-[20px] font-semibold">Admins only</h1>
          <p className="mt-2 text-[14px] text-muted">This screen is for reviewing badge requests.</p>
          <Link href="/panel" className="btn btn-ghost mt-5">
            Back to your badges
          </Link>
        </div>
      </main>
    );

  const tab: Tab = TABS.some(([t]) => t === params.tab) ? (params.tab as Tab) : "requests";
  const [requests, users, badges] = await Promise.all([
    prisma.badgeRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { badgeRef: true } }),
    prisma.allowedUser.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.badge.findMany({ orderBy: [{ userId: "asc" }, { position: "asc" }] }),
  ]);
  const badgesByUser = Map.groupBy(badges, (b) => b.userId);
  const counts: Record<Tab, number> = { requests: requests.length, donors: users.length, badges: badges.length };
  const oldest = requests[0];

  return (
    <AppShell user={access.user} isAdmin pending={requests.length} current="/admin">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Requests</h1>
        <p className="num mt-1 text-[15px] text-muted">
          {requests.length
            ? `${requests.length} waiting for review · oldest sent ${ago(oldest.createdAt)}`
            : "Nothing waiting for review"}{" "}
          · {badges.length} badges served to {badgesByUser.size} people
        </p>

        <nav aria-label="Sections" className="mt-6 flex gap-6 overflow-x-auto border-b border-line">
          {TABS.map(([t, label]) => (
            <Link
              key={t}
              href={t === "requests" ? "/admin" : `/admin?tab=${t}`}
              aria-current={tab === t ? "page" : undefined}
              className={`-mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 text-[14px] transition-colors ${tab === t ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {label}
              <span className="num text-[13px] text-muted">{counts[t]}</span>
            </Link>
          ))}
        </nav>

        {tab === "requests" && (
          <section aria-label="Waiting for review" className="mt-4">
            {requests.length === 0 ? (
              <p className="rounded-lg border border-dashed border-control px-4 py-3 text-[14px] text-muted">
                Every request has been reviewed. New ones appear here as donors send them.
              </p>
            ) : (
              <ul className="panel">
                {requests.map((r, i) => (
                  <li key={r.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 ${i ? "border-t border-rule" : ""}`}>
                    <div className="flex w-[124px] shrink-0 items-center gap-2">
                      {r.badgeRef ? (
                        <>
                          <img src={r.badgeRef.badge} alt={`Current: ${r.badgeRef.tooltip}`} title={r.badgeRef.tooltip} width={40} height={40} className="size-10 rounded-md bg-surface object-contain opacity-70" />
                          <ArrowRight className="size-4 text-muted" aria-hidden />
                        </>
                      ) : (
                        <span className="w-[64px]" />
                      )}
                      <img src={`/api/pending/${r.image}`} alt="Requested picture" width={48} height={48} className="size-12 rounded-md bg-surface object-contain ring-2 ring-accent-200" />
                    </div>
                    <div className="mr-auto min-w-0">
                      <p className="truncate text-[14px] font-medium">{r.tooltip}</p>
                      <p className="num text-[13px] text-muted">
                        {r.badgeRef ? `Change of “${r.badgeRef.tooltip}”` : "New badge"} · {r.userId} · {ago(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={rejectRequest.bind(null, r.id)}>
                        <SubmitButton className="btn btn-ghost">
                          <X className="size-4" /> Reject
                        </SubmitButton>
                      </form>
                      <form action={approveRequest.bind(null, r.id)}>
                        <SubmitButton className="btn btn-primary">
                          <Check className="size-4" /> Approve
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "donors" && (
          <section aria-label="Donors" className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="panel overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="px-5 pt-3 pb-2 font-normal">Discord ID</th>
                    <th className="px-3 pt-3 pb-2 text-right font-normal">Badges</th>
                    <th className="px-3 pt-3 pb-2 font-normal">Limit</th>
                    <th className="px-5 pt-3 pb-2" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const n = badgesByUser.get(u.id)?.length ?? 0;
                    return (
                      <tr key={u.id} className="border-t border-rule">
                        <td className="num px-5 py-2.5">
                          {u.id}
                          {u.isAdmin && <span className="pill ml-2 bg-accent-100 text-accent-dark">admin</span>}
                        </td>
                        <td className="num px-3 py-2.5 text-right">{n}</td>
                        <td className="px-3 py-2.5">
                          <LimitForm key={u.badgeLimit} userId={u.id} limit={u.badgeLimit} badgeCount={n} />
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {u.id !== access.user.id && (
                            <form action={removeAllowedUser.bind(null, u.id)}>
                              <SubmitButton className="btn btn-quiet !h-8 !px-2 hover:!bg-neg-bg hover:!text-negative" aria-label={`Remove ${u.id}`} title="Remove from the allow list">
                                <Trash2 className="size-4" />
                              </SubmitButton>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="panel p-5">
              <h2 className="text-[16px] font-semibold">Add a donor</h2>
              <p className="mt-1 mb-4 text-[13px] text-muted">They can sign in and send pictures right away. Lowering a limit later deletes their last badges.</p>
              <AddUserForm />
            </div>
          </section>
        )}

        {tab === "badges" && (
          <section aria-label="All badges" className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              {badges.length === 0 ? (
                <p className="rounded-lg border border-dashed border-control px-4 py-3 text-[14px] text-muted">No badges are being served yet.</p>
              ) : (
                <ul className="panel">
                  {[...badgesByUser].map(([userId, list], i) => (
                    <li key={userId} className={`flex flex-wrap items-center gap-4 px-5 py-3 ${i ? "border-t border-rule" : ""}`}>
                      <span className="num w-[180px] shrink-0 text-[14px]">{userId}</span>
                      <div className="flex flex-wrap gap-2">
                        {list.map((b) => (
                          <span key={b.id} className="flex items-center gap-2 rounded-lg bg-surface py-1 pr-0.5 pl-1">
                            <img src={b.badge} alt="" width={28} height={28} className="size-7 rounded object-contain" />
                            <span className="max-w-[220px] truncate text-[13px]">{b.tooltip}</span>
                            <DeleteBadgeButton id={b.id} />
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="panel p-5">
              <h2 className="text-[16px] font-semibold">Add a badge</h2>
              <p className="mt-1 mb-4 text-[13px] text-muted">Goes live right away for any Discord ID, without review or a limit.</p>
              <AdminBadgeForm />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
