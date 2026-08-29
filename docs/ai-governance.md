# Where AI acts, where it recommends, and where a human must approve

The triage path contains no language model. That is a decision, not a gap: the
source data carried five instructions written to be obeyed by an automated
reader, and three of them pointed at the three most expensive errors available in
the queue. A model reading vendor-supplied free text is exactly the surface those
instructions attack.

AI did the design work — deriving the rules from the policy sheets, building the
classifier, drafting the templates. The runtime is deterministic and inspectable,
and every output traces to a rule id.

## Acts automatically

- Structure the intake and extract Home, trade, access window, COI and deadlines
- Match against the open queue; flag duplicates and repeats
- Quarantine instructions embedded in third-party text
- Filter vendors by licence, zone and capacity
- Start the SLA clock
- Flag conflicts against the live board

## Recommends only

- Priority level and the policy clause it rests on
- Vendor ranking
- The containment measure
- The drafted Resident, Homeowner or vendor message
- The next operating action

## A human must approve

- Committing anything to the board
- Any dispatch to an occupied Home
- Any spend above the Home limit
- Every signed-move-in exception
- Any change to a commitment already made
- Anything sent to a Resident or Homeowner
- Overriding a licensed-trade rule — which is to say, never

## Controls before live use

1. Human confirmation on every dispatch and every outbound message.
2. An append-only log of the rule that fired, the input it fired on, and who
   approved the outcome.
3. Vendor and third-party free text treated as untrusted by default.
4. A weekly review of P0 and P1 classifications against what actually happened,
   used to tune the rules.
5. No interface path — none, not even an override — to assign an unlicensed
   vendor to licensed work.

## Where AI could be added safely

Outside the decision path. Polishing the tone of a drafted message before a human
sends it, or summarising a long vendor thread for a coordinator, are both fine:
a person still reads and approves the result, and neither changes a priority, a
licence status or a spend approval.
