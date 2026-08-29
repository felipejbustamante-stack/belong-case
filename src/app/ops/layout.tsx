import Link from "next/link";

const NAV = [
  { href: "/ops", label: "Inbox" },
  { href: "/ops/board", label: "Case board" },
  { href: "/ops/me", label: "My cases" },
  { href: "/ops/metrics", label: "Metrics" },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1300px] flex-wrap items-baseline gap-6 px-6 py-4">
          <Link href="/" className="font-cond text-lg font-bold">
            Belong Operations
          </Link>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="border border-transparent px-4 py-2 font-cond text-[12.5px] font-semibold uppercase tracking-wider text-ink3 hover:border-line hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/resident"
            className="ml-auto font-cond text-[12px] uppercase tracking-wider text-ink3 hover:text-accent"
          >
            Resident view →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1300px] px-6 py-8">{children}</main>
    </div>
  );
}
