/* eslint-disable @next/next/no-img-element -- badges are user-uploaded GIF/PNG files, often animated */

// One badge as Plexcord serves it: an image file (GIF, PNG, WEBP or JPG) and its optional hover text.
export type CardBadge = { id: string; iconUrl: string; title?: string };

// A Discord-style profile popout showing where badges sit: banner, avatar, name, then the badge rows.
export function ProfileCard({
  name,
  username,
  tag,
  avatarUrl,
  badges,
  className = "",
}: {
  name: string;
  username?: string;
  /** Server tag chip shown after the username, e.g. "PLEX". */
  tag?: string;
  avatarUrl?: string;
  badges: CardBadge[];
  className?: string;
}) {
  return (
    <div
      data-ui
      // A profile theme, as Discord draws it, in Plexcord's violet: two tones top to bottom.
      className={`w-[300px] max-w-full rounded-xl bg-[linear-gradient(#2a0f5c,#140726)] text-left text-white ${className}`}
    >
      <div className="h-[72px] rounded-t-xl bg-[#6c1beb]" aria-hidden />
      <div className="px-4 pb-4">
        <div className="relative -mt-10 size-[84px]">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" width={84} height={84} className="size-full rounded-full bg-[#1c0a3d] object-contain p-3 ring-[6px] ring-[#24104d]" />
          ) : (
            <span
              aria-hidden
              className="grid size-full place-items-center rounded-full bg-[#1c0a3d] text-3xl font-semibold ring-[6px] ring-[#24104d]"
            >
              {name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
          {/* Do Not Disturb: a red disc with a white bar. */}
          <span
            aria-label="Do Not Disturb"
            className="absolute right-0.5 bottom-0.5 grid size-6 place-items-center rounded-full bg-[#ed1b22] ring-[5px] ring-[#24104d]"
          >
            <span className="h-1 w-2.5 rounded-full bg-white" />
          </span>
        </div>

        <p className="mt-3 bg-[linear-gradient(90deg,#b994ff,#ff4d55)] bg-clip-text text-[22px] leading-tight font-bold text-transparent">
          {name || "Your name"}
        </p>
        {(username || tag) && (
          <p className="mt-0.5 flex items-center gap-2 text-[14px] text-white/85">
            {username}
            {tag && (
              <span className="inline-flex h-5 items-center gap-1 rounded-md bg-[#3b2470] px-1.5 text-[12px] font-semibold text-[#e3d8ff]">
                <span aria-hidden className="text-[#b18cff]">♥</span> {tag}
              </span>
            )}
          </p>
        )}

        {badges.length > 0 && (
          <ul className="mt-3 flex flex-row flex-wrap items-center gap-1.5" aria-label="Badges">
            {badges.map((b) => (
              <li key={b.id} className="group relative inline-flex" tabIndex={b.title ? 0 : undefined} aria-label={b.title}>
                {/* An <img> keeps GIF animation, which next/image would need extra config to preserve. */}
                <img src={b.iconUrl} alt={b.title ?? ""} width={20} height={20} className="size-5 object-contain" />
                {b.title && (
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111214] px-2.5 py-1 text-[13px] font-medium text-white shadow-lg invisible opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100`}
                  >
                    {b.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
