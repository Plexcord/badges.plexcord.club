/* eslint-disable @next/next/no-img-element -- Discord avatar */
import type { ReactNode } from "react";
import Link from "next/link";
import { Compass, Inbox, LayoutList, LogOut, Menu } from "lucide-react";
import { logout } from "@/app/actions";
import type { SessionUser } from "@/lib/token";
import { avatarUrl } from "@/lib/session";
import { Mark } from "./mark";

type Nav = { href: string; label: string; icon: ReactNode; count?: number };

// Open-plane shell: a labelled sidebar on the page ground, no top bar; folds to a 48px bar on the phone.
export function AppShell({
  user,
  isAdmin,
  pending,
  current,
  children,
}: {
  user: SessionUser;
  isAdmin: boolean;
  pending?: number;
  current: "/panel" | "/admin";
  children: ReactNode;
}) {
  const nav: Nav[] = [
    { href: "/panel", label: "Your badges", icon: <LayoutList className="size-4" /> },
    ...(isAdmin ? [{ href: "/admin", label: "Requests", icon: <Inbox className="size-4" />, count: pending }] : []),
    { href: "/explorer", label: "Badge Explorer", icon: <Compass className="size-4" /> },
  ];
  const navList = (
    <ul className="space-y-0.5">
      {nav.map((n) => (
        <li key={n.href}>
          <Link
            href={n.href}
            aria-current={current === n.href ? "page" : undefined}
            className={`flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors ${current === n.href ? "bg-accent-50 font-medium text-accent-dark" : "text-muted hover:bg-rule hover:text-ink"}`}
          >
            <span className={current === n.href ? "text-accent" : ""}>{n.icon}</span>
            <span className="mr-auto">{n.label}</span>
            {!!n.count && <span className="num pill bg-accent-100 text-accent-dark">{n.count}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
  const account = (
    <div className="flex items-center gap-2.5 px-2.5">
      <img src={avatarUrl(user)} alt="" width={28} height={28} className="size-7 rounded-full" />
      <div className="mr-auto min-w-0">
        <p className="truncate text-[14px] font-medium">{user.username}</p>
        <p className="num truncate text-[12px] text-muted">{user.id}</p>
      </div>
      <form action={logout}>
        <button className="btn btn-quiet !h-8 !px-2" aria-label="Log out" title="Log out">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
  const mark = (
    <Link href="/" className="flex items-center gap-2.5 px-2.5 text-[15px] font-semibold tracking-[-0.01em]">
      <Mark /> Plexcord Badges
    </Link>
  );

  return (
    <div className="min-h-screen bg-ground lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 px-2 py-5 lg:flex">
        {mark}
        <nav aria-label="App">{navList}</nav>
        <div className="mt-auto">{account}</div>
      </aside>

      {/* phone: 48px bar with the screen's name and a menu sheet */}
      <details className="group sticky top-0 z-20 bg-ground lg:hidden">
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-[15px] font-semibold">
            <Mark /> {nav.find((n) => n.href === current)?.label}
          </span>
          <Menu className="size-5 text-muted" aria-label="Menu" />
        </summary>
        <div className="fixed inset-x-0 top-12 bottom-0 space-y-6 bg-ground px-2 pt-2 pb-6">
          <nav aria-label="App menu">{navList}</nav>
          {account}
        </div>
      </details>

      <main className="min-w-0 px-4 pt-4 pb-16 lg:px-8 lg:pt-9">{children}</main>
    </div>
  );
}
