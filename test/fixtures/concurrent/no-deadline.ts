// Run with bun's `--timeout` alone, which the runner cannot read: a concurrent
// test it times out runs on as it did in 0.4.0, and is not interrupted.
import { Effect } from "effect";
import { resources } from "../cases.js";
import { describe, it } from "../entry.js";

describe("a concurrent test with no deadline the runner holds", () => {
  const { held, report } = resources();
  it.scoped("scoped", () => Effect.andThen(held("scoped"), Effect.never));
  report("still running after its deadline", 600);
});
