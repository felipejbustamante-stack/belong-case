import { Card, Label } from "@/components/ui";

export default function Page() {
  return (
    <Card className="p-10">
      <Label>Not built yet</Label>
      <h1 className="mt-2 font-display text-2xl font-semibold">Case board</h1>
      <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-ink2">
        The 19 open cases with their reassessed priority, owner, next action and the risks to the plan. See{" "}
        <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12.5px]">
          docs/EXECUTION-PLAN.md
        </code>{" "}
        for what this screen owns. The domain logic it needs already exists in{" "}
        <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12.5px]">
          src/lib
        </code>
        .
      </p>
    </Card>
  );
}
