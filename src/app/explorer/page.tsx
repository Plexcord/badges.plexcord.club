import { Suspense } from "react";
import { connection } from "next/server";
import { BadgeGrid } from "@/components/badge-grid";
import { SiteBar } from "@/components/site-bar";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/db";

export const metadata = { title: "Badge Explorer · Plexcord Badges" };

export default function ExplorerPage({ searchParams }: PageProps<"/explorer">) {
  return (
    <>
      <SiteBar current="/explorer" />
      <main className="mx-auto max-w-[640px] px-5 pt-24">
        <h1 className="text-[clamp(32px,5vw,44px)] font-semibold leading-[1.05] tracking-[-0.03em]">Badge Explorer</h1>
        <p className="mt-4 text-[18px] text-muted">Browse the badges Plexcord serves. Search by badge name or by Discord ID.</p>
        <Suspense fallback={<p className="mt-8 text-muted">Loading badges…</p>}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/explorer">, "searchParams">) {
  await connection(); // DB reads are request-time; without this Next tries to prerender them
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 100) ?? "";

  // Every badge goes to the page and the search filters as you type; ?q= only sets the starting text.
  const badges = await prisma.badge.findMany({
    orderBy: [{ userId: "asc" }, { position: "asc" }],
    select: { id: true, userId: true, tooltip: true, badge: true },
  });
  return <BadgeGrid badges={badges} initialQuery={q} />;
}
