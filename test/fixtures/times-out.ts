// Run by `test/timeout.test.ts` as a test file of its own (`bun test` finds
// no `*.test.ts` here, so the suite does not run it directly). Each case
// takes a resource whose release says so, then never ends, so bun times it
// out; the case after each says it ran. Each says it on stderr, where bun
// reports, so the order of the two reads in one stream.
import { Effect } from "effect";
import { describe, it } from "../../src/index.js";

const say = (line: string) => Effect.sync(() => console.error(line));

const held = (name: string) =>
  Effect.acquireRelease(say(`acquired ${name}`), () => say(`released ${name}`));

describe("a test bun times out", () => {
  it.scoped("scoped", () => Effect.andThen(held("scoped"), Effect.never), 200);
  it.scoped("after scoped", () => say("ran after scoped"));

  // The TestClock never moves on its own: only bun's real-time deadline ends this one.
  it.effect(
    "effect",
    () => Effect.scoped(Effect.andThen(held("effect"), Effect.sleep("1 hour"))),
    200,
  );
  it.effect("after effect", () => say("ran after effect"));

  it.scopedLive("scopedLive", () => Effect.andThen(held("scopedLive"), Effect.never), 200);
  it.live("after scopedLive", () => say("ran after scopedLive"));

  it.live("live", () => Effect.scoped(Effect.andThen(held("live"), Effect.never)), 200);
  it.live("after live", () => say("ran after live"));
});
