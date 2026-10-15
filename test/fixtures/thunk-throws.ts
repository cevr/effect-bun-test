// A test whose thunk throws before it returns an effect: bun reports the
// throw where the test's own code made it, as it did in 0.4.0.
import { describe, it } from "./entry.js";

describe("a thunk that throws", () => {
  it.live("throws", () => {
    throw new Error("thrown by the thunk");
  });
});
