"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { copyOf, type Locale } from "@/lib/copy";
import { LanguageToggle } from "@/components/LanguageToggle";

const LINKS = [
  { href: "/", key: "home" },
  { href: "/add", key: "add" },
  { href: "/history", key: "history" },
  { href: "/insights", key: "insights" },
  { href: "/settings", key: "settings" },
] as const;

export function Shell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const pathname = usePathname();
  const copy = copyOf(locale);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 z-20 hidden h-screen flex-col border-e border-line bg-[#faf6ee]/90 px-5 py-7 backdrop-blur lg:flex">
        <Link href="/" className="num text-3xl italic text-ink">
          {copy.appName}
        </Link>
        <p className="mt-1 text-sm text-muted">{copy.tagline}</p>
        <nav className="mt-10 flex flex-col gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className={`rounded-2xl px-3 py-2.5 text-[15px] ${active ? "bg-moss text-white" : "text-ink hover:bg-white"}`}
              >
                {copy[link.key]}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <LanguageToggle locale={locale} />
        </div>
      </aside>
      <div className="pb-24 lg:pb-10">
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 lg:px-10 lg:pt-8">{children}</div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[#faf6ee]/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${active ? "text-moss" : "text-muted"}`}
                >
                  <span className={`h-1 w-1 rounded-full ${active ? "bg-moss" : "bg-transparent"}`} />
                  {copy[link.key]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
