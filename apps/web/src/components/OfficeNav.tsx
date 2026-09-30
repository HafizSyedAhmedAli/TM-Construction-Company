"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";

const LINKS = [
  { href: "/office/leads", label: "1 · Leads" },
  { href: "/office", label: "2 · Projects", exact: true },
  { href: "/office/rates", label: "Rates" },
];

export function OfficeNav() {
  const pathname = usePathname();
  const active = (l: (typeof LINKS)[number]) =>
    l.exact
      ? pathname === l.href ||
        (pathname.startsWith("/office/") &&
          !pathname.startsWith("/office/leads") &&
          !pathname.startsWith("/office/rates"))
      : pathname.startsWith(l.href);
  return (
    <header className="print:hidden bg-white/90 backdrop-blur border-b border-stone-100">
      <div className="max-w-6xl mx-auto px-4 h-[72px] flex items-center justify-between gap-4">
        <Link href="/office/leads" className="flex items-center gap-2">
          <Image
            src="/tmcc-logo-full.png"
            alt="TM Construction Company"
            width={520}
            height={119}
            className="h-11 w-auto"
            priority
          />
          <span className="hidden sm:inline text-xs font-medium text-stone-500 border-l border-stone-200 pl-2">
            Office dashboard
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-1 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg font-medium ${active(l) ? "bg-brand text-white" : "text-stone-600 hover:bg-stone-100"}`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/"
              target="_blank"
              className="ml-2 px-3 py-1.5 text-stone-500 hover:text-brand"
            >
              Client form ↗
            </Link>
          </nav>
          <a
            href="tel:03003212117"
            className="hidden md:flex items-center gap-2 text-sm font-semibold text-brand-black"
          >
            <Phone className="size-4 text-brand" />
            0300-3212117
          </a>
        </div>
      </div>
    </header>
  );
}
