import type { Metadata } from "next";
import { Albert_Sans } from "next/font/google";
import "./globals.css";

const albert = Albert_Sans({
  variable: "--font-albert",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Plexcord Badges",
  description: "The small pictures Plexcord donors wear next to their name, reviewed by hand and served from one badges.json.",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${albert.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
