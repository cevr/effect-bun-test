// A concurrent test whose effect starts with 300 ms of synchronous work, past
// its 200 ms deadline, then holds a resource and never ends. Bun starts the
// deadline when it enters the test, so the runner's clock starts there too:
// the test is interrupted as soon as the work yields, not 200 ms after it.
// Its sibling, entered once the work is done, looks at 100 ms.
import { Effect } from "effect";
import { resources } from "../cases.js";
import { describe, it } from "../entry.js";

const busy = (ms: number) =>
  Effect.sync(() => {
    const until = performance.now() + ms;
    while (performance.now() < until) {}
  });

describe("a concurrent test with a synchronous prefix", () => {
  const { held, report } = resources();
  it.scopedLive(
    "prefix",
    () => Effect.andThen(held("prefix"), Effect.andThen(busy(300), Effect.never)),
    200,
  );
  report("its sibling", 100);
});
