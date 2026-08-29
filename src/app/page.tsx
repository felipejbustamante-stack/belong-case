import Link from "next/link";

/** Entry point. Two surfaces, one engine behind both. */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="label">Belong Field Operations</p>
      <h1 className="mt-3 font-cond text-4xl font-bold leading-tight">
        Two surfaces, one operating model
      </h1>
      <p className="mt-4 max-w-prose text-[15px] text-ink2">
        A Resident reports a problem. The same triage engine the operations team
        works from reads it, matches it against the open queue, and produces a
        structured work order. Nothing is dispatched without a person.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/resident"
          className="block border border-line bg-surface p-6 transition hover:border-accent"
        >
          <p className="label">Resident</p>
          <h2 className="mt-2 font-cond text-xl font-bold">Report a problem</h2>
          <p className="mt-2 text-[14px] text-ink2">
            The intake surface, across the channels a Resident actually uses.
          </p>
        </Link>

        <Link
          href="/ops"
          className="block border border-line bg-surface p-6 transition hover:border-accent"
        >
          <p className="label">Operations</p>
          <h2 className="mt-2 font-cond text-xl font-bold">Back office</h2>
          <p className="mt-2 text-[14px] text-ink2">
            Inbox, triage, case board, conflicts and the decision log.
          </p>
        </Link>
      </div>
    </main>
  );
}
