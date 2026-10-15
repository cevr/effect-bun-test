// The runners' `.serial` forms in a file bun runs concurrently: each runs
// alone, so a timed-out one is interrupted and its finalizers run before the
// next test starts, as in a plain file.
import { Effect } from "effect";
import { resources, say } from "../cases.js";
import { describe, it } from "../entry.js";

describe("a serial test in a concurrent file", () => {
  const { held } = resources();
  it.live("a concurrent test before them", () => Effect.sleep("50 millis"));

  it.scoped.serial("scoped", () => Effect.andThen(held("scoped"), Effect.never), 200);
  it.scoped.serial("after scoped", () => say("ran after scoped"));

  it.effect.serial(
    "effect",
    () => Effect.scoped(Effect.andThen(held("effect"), Effect.sleep("1 hour"))),
    200,
  );
  it.effect.serial("after effect", () => say("ran after effect"));

  it.scopedLive.serial("scopedLive", () => Effect.andThen(held("scopedLive"), Effect.never), 200);
  it.live.serial("after scopedLive", () => say("ran after scopedLive"));

  it.live.serial("live", () => Effect.scoped(Effect.andThen(held("live"), Effect.never)), 200);
  it.live.serial("after live", () => say("ran after live"));
});
