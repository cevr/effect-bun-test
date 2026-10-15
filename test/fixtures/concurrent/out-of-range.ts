// Concurrent tests whose own timeout bun turns into no deadline (0.5, NaN,
// -1: under 1 ms) or into its longest one (Infinity, 2^31 ms: past
// setTimeout's range, which fires such a timer at once). Each finishes in
// 100 ms and passes, as on 0.4.0. A watchdog ends the run if it hangs.
import { afterAll } from "bun:test";
import { Effect } from "effect";
import { say } from "../cases.js";
import { describe, it } from "../entry.js";

const watchdog = setTimeout(() => {
  console.error("hung");
  process.exit(3);
}, 3000);
afterAll(() => clearTimeout(watchdog));

describe("a concurrent test whose timeout setTimeout cannot hold", () => {
  for (const [name, timeout] of [
    ["Infinity", Infinity],
    ["2^31", 2 ** 31],
    ["0.5", 0.5],
    ["NaN", NaN],
    ["-1", -1],
  ] as const)
    it.live(
      name,
      () => Effect.ensuring(Effect.sleep("100 millis"), say(`released ${name}`)),
      timeout,
    );
});
