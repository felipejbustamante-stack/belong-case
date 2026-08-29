import Link from "next/link";
import { OpsNav } from "@/components/OpsNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BelongWordmark, SimulationBadge } from "@/components/ui";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-shell flex-wrap items-center gap-x-5 gap-y-3 px-6 py-3">
          <Link href="/" className="flex items-baseline gap-2.5">
            <BelongWordmark className="text-[17px]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink3">
              Field Operations
            </span>
          </Link>

          <OpsNav />

          <div className="ml-auto flex items-center gap-3">
            <SimulationBadge className="hidden lg:inline-flex" />
            <ThemeToggle />
            <Link
              href="/resident"
              className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-ink2 transition hover:border-brand hover:text-brand"
            >
              Resident view
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell px-6 py-8">{children}</main>
    </div>
  );
}
