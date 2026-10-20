"use client";
/* eslint-disable @next/next/no-img-element -- badges are tiny arbitrary images */

import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";

export type GridBadge = { id: number; userId: string; tooltip: string; badge: string };

type Shape = "round" | "square";
const KEY = "explorer-shape";

// A 17-20 digit query is a Discord ID; anything else matches badge names, ignoring case.
function matches(b: GridBadge, q: string) {
  if (/^\d{17,20}$/.test(q)) return b.userId === q;
  return b.tooltip.toLocaleLowerCase().includes(q.toLocaleLowerCase());
}

// Badge gallery: live search, a round/square preview (Discord shows badges round) and a download per badge.
export function BadgeGrid({ badges, initialQuery }: { badges: GridBadge[]; initialQuery: string }) {
  const [shape, setShape] = useState<Shape>("round");
  const [q, setQ] = useState(initialQuery);

  // Remembered per viewer; storage can be missing or blocked, so every access is guarded.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a stored preference after hydration
      if (saved === "round" || saved === "square") setShape(saved);
    } catch {}
  }, []);
  const choose = (s: Shape) => {
    setShape(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {}
  };

  const query = q.trim();
  const shown = query ? badges.filter((b) => matches(b, query)) : badges;
  const byId = /^\d{17,20}$/.test(query);

  const search = (value: string) => {
    setQ(value);
    // Keep the URL shareable without a navigation per keystroke.
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      {/* The form only matters without JavaScript: Enter then searches on the server. */}
      <form action="/explorer" className="mt-10" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="relative block">
          <span className="sr-only">Badge name or Discord ID</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            name="q"
            type="search"
            value={q}
            onChange={(e) => search(e.target.value)}
            placeholder="Search by badge name or Discord ID"
            autoComplete="off"
            className="field num !pl-9"
          />
        </label>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="num text-[15px] text-muted" aria-live="polite">
          {!query
            ? `${badges.length} badges in total.`
            : shown.length
              ? `${shown.length} badge${shown.length > 1 ? "s" : ""} ${byId ? "for this ID" : `named like “${query}”`}.`
              : byId
                ? "This ID has no badges."
                : `No badge names match “${query}”.`}
        </p>
        <div className="inline-flex rounded-lg bg-surface p-1 text-[14px]" role="radiogroup" aria-label="Badge shape">
          {(["round", "square"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={shape === s}
              onClick={() => choose(s)}
              className={`h-8 rounded-md px-3 transition-colors ${shape === s ? "bg-panel font-medium text-ink" : "text-muted hover:text-ink"}`}
            >
              {s === "round" ? "Round" : "Square"}
            </button>
          ))}
        </div>
      </div>

      {shown.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {shown.map((b) => (
            <li key={b.id} className="flex flex-col items-center gap-3 rounded-xl bg-panel p-4 ring-1 ring-line">
              <img
                src={b.badge}
                alt={b.tooltip}
                width={96}
                height={96}
                loading="lazy"
                className={`size-24 object-cover transition-[border-radius] duration-200 ${shape === "round" ? "rounded-full" : "rounded-none"}`}
              />
              <p className="w-full truncate text-center text-[14px]" title={b.tooltip}>
                {b.tooltip}
              </p>
              <a href={`${b.badge}?download=${encodeURIComponent(b.tooltip)}`} download className="btn btn-ghost !h-8 w-full text-[13px]">
                <Download className="size-3.5" /> Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
