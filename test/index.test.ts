import { Effect, TestClock } from "effect";
import { describe, it, expect, yieldFibers } from "../src/index.js";

describe("effect-bun-test", () => {
  it.effect("it.effect runs with TestContext", () =>
    Effect.gen(function* () {
      const before = yield* Effect.clockWith((clock) => clock.currentTimeMillis);
      yield* TestClock.adjust("1 second");
      const after = yield* Effect.clockWith((clock) => clock.currentTimeMillis);
      expect(after - before).toBe(1000);
    }),
  );

  it.scoped("it.scoped handles resources", () =>
    Effect.gen(function* () {
      let released = false;
      yield* Effect.acquireRelease(Effect.succeed("resource"), () =>
        Effect.sync(() => {
          released = true;
        }),
      );
      expect(released).toBe(false);
    }),
  );

  it.live("it.live uses real clock", () =>
    Effect.gen(function* () {
      const start = Date.now();
      yield* Effect.sleep("10 millis");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(10);
    }),
  );

  it.effect("yieldFibers allows forked effects to run", () =>
    Effect.gen(function* () {
      let ran = false;
      yield* Effect.fork(
        Effect.sync(() => {
          ran = true;
        }),
      );
      expect(ran).toBe(false);
      yield* yieldFibers;
      expect(ran).toBe(true);
    }),
  );
});
