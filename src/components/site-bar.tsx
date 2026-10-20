import Link from "next/link";
import { Mark } from "./mark";

// A plain bar: the name and a few links.
export function SiteBar({ current }: { current?: string }) {
  const links = [
    ["/explorer", "Explorer"],
    ["/panel", "Panel"],
  ];
  return (
    <header className="mx-auto flex max-w-[640px] items-center gap-6 px-5 pt-8 text-[15px]">
      <Link href="/" className="mr-auto flex items-center gap-2.5 font-semibold">
        <Mark /> Plexcord Badges
      </Link>
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
          className={current === href ? "text-ink" : "text-muted transition-colors hover:text-ink"}
        >
          {label}
        </Link>
      ))}
    </header>
  );
}
