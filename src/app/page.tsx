import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";
import { SiteBar } from "@/components/site-bar";
import { SiteFooter } from "@/components/site-footer";

// Demo badges drawn as tiny SVGs; real badges are uploaded GIF/PNG files.
const svg = (body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">${body}</svg>`)}`;
const DEMO_BADGES = [
  { id: "pc", title: "Plexcord Donor", iconUrl: "/favicon.png" },
  { id: "dev", title: "Plexcord Developer", iconUrl: svg('<rect x="2" y="2" width="16" height="16" rx="4" fill="#6c1beb"/><path d="M8 7l-3 3 3 3M12 7l3 3-3 3" stroke="#fff" stroke-width="1.6" fill="none"/>') },
  { id: "eye", title: "Early Supporter", iconUrl: svg('<circle cx="10" cy="10" r="8" fill="#3ba55c"/><circle cx="10" cy="10" r="3.5" fill="#0b3d1d"/>') },
  { id: "shield", title: "Plexcord Contributor", iconUrl: svg('<path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z" fill="#8e6be8"/><path d="M6 8l4 3 4-3" stroke="#fff" stroke-width="1.6" fill="none"/>') },
  { id: "gem", title: "Server Booster", iconUrl: svg('<path d="M10 2l7 8-7 8-7-8z" fill="#ff73fa"/><path d="M10 2l3 8-3 8-3-8z" fill="#ffb3fd"/>') },
  { id: "hash", title: "Translator", iconUrl: svg('<circle cx="10" cy="10" r="8" fill="#1abc9c"/><path d="M8 5l-1 10M13 5l-1 10M5.5 8.5h9M5 12h9" stroke="#fff" stroke-width="1.5"/>') },
  { id: "leaf", title: "Bug Hunter", iconUrl: svg('<path d="M4 16C4 8 9 4 17 4c0 8-4 13-12 13z" fill="#3ba55c"/><path d="M5 15l8-8" stroke="#0b3d1d" stroke-width="1.4"/>') },
];

// Quiet page: one narrow column, small exact demonstration, plain links.
export default function Home() {
  return (
    <>
      <SiteBar />
      <main className="mx-auto max-w-[640px] px-5">
        <section className="pt-24">
          <h1 className="text-[clamp(36px,6vw,52px)] font-semibold leading-[1.05] tracking-[-0.03em]">Plexcord Badges</h1>
          <p className="mt-5 max-w-[44ch] text-[19px] leading-relaxed">
            This domain serves the small badges Plexcord donors wear next to their name. You can get your own by{" "}
            <a href={process.env.DONATE_URL ?? "#"} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
              donating
            </a>
            .
          </p>
          <Link href="/panel" className="btn btn-primary mt-8 !h-10 !px-4">
            Get your badge
          </Link>
          <div className="mt-14">
            <ProfileCard name="Plexcord" username="plexcord" tag="PLEX" avatarUrl="/favicon.png" badges={DEMO_BADGES} />
          </div>
        </section>

        <section className="pt-20" aria-labelledby="links-title">
          <h2 id="links-title" className="sr-only">
            Links
          </h2>
          <ul className="space-y-3">
            <li>
              <Link href="/explorer" className="underline-offset-4 hover:underline">
                Badge Explorer
              </Link>
              <span className="text-muted"> — every badge served right now</span>
            </li>
            <li>
              <a href="/badges.json" className="underline-offset-4 hover:underline">
                badges.plexcord.club/badges.json
              </a>
              <span className="text-muted"> — the list Plexcord reads</span>
            </li>
            <li>
              <Link href="/panel" className="underline-offset-4 hover:underline">
                Your panel
              </Link>
              <span className="text-muted"> — sign in to manage your badges</span>
            </li>
          </ul>
        </section>

        <section id="how" className="pt-20" aria-labelledby="how-title">
          <h2 id="how-title" className="text-[20px] font-semibold">
            How it works
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-muted">
            <li>Donate to Plexcord.</li>
            <li>Sign in to your panel with Discord and send a picture with a tooltip.</li>
            <li>A person checks it.</li>
            <li>Once approved, it shows next to your name in Plexcord.</li>
          </ol>
          <p className="mt-4 text-muted">
            PNG, GIF, WEBP or JPG, up to 10 MB. Each donor has a limit, usually 5. You can reorder, change or delete your
            badges at any time.
          </p>
        </section>

        <section id="dmca" className="pt-20" aria-labelledby="dmca-title">
          <h2 id="dmca-title" className="text-[20px] font-semibold">
            DMCA
          </h2>
          <p className="mt-4 text-muted">
            All content hosted on this subdomain is user-uploaded. If something here is yours, contact the Plexcord team
            and it will be removed.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
