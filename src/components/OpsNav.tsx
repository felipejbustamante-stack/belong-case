"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/ops", label: "Inbox" },
  { href: "/ops/board", label: "Case board" },
  { href: "/ops/me", label: "My cases" },
  { href: "/ops/metrics", label: "Metrics" },
];

export function OpsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Operations">
      {NAV.map((n) => {
        const active = n.href === "/ops" ? pathname === "/ops" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
              active
                ? "bg-brandWash text-brand"
                : "text-ink3 hover:bg-surface2 hover:text-ink"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
