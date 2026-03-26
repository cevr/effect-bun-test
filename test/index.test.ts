import { Effect, Layer, ServiceMap } from "effect";
import { TestClock } from "effect/testing";
import { describe, it, expect, yieldFibers } from "../src/index.js";

describe("effect-bun-test", () => {
  it.effect("it.effect runs with TestClock", () =>
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
      yield* Effect.forkChild(
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

// Test service for .layer() tests
interface CounterService {
  readonly count: Effect.Effect<number>;
}

class Counter extends ServiceMap.Service<Counter, CounterService>()("test/Counter") {
  static Test = () => Layer.succeed(Counter, Counter.of({ count: Effect.succeed(42) }));
}

describe("it.live.layer", () => {
  const test = it.live.layer(Counter.Test());

  test("provides layer to test body", () =>
    Effect.gen(function* () {
      const counter = yield* Counter;
      const n = yield* counter.count;
      expect(n).toBe(42);
    }));

  test("works across multiple tests", () =>
    Effect.gen(function* () {
      const counter = yield* Counter;
      const n = yield* counter.count;
      expect(n).toBe(42);
    }));
});

describe("it.effect.layer", () => {
  const test = it.effect.layer(Counter.Test());

  test("provides layer + TestClock", () =>
    Effect.gen(function* () {
      const counter = yield* Counter;
      const n = yield* counter.count;
      expect(n).toBe(42);

      const before = yield* Effect.clockWith((clock) => clock.currentTimeMillis);
      yield* TestClock.adjust("1 second");
      const after = yield* Effect.clockWith((clock) => clock.currentTimeMillis);
      expect(after - before).toBe(1000);
    }));
});

describe("it.scoped.layer", () => {
  const test = it.scoped.layer(Counter.Test());

  test("provides layer + TestClock + Scope", () =>
    Effect.gen(function* () {
      let released = false;
      yield* Effect.acquireRelease(Effect.succeed("resource"), () =>
        Effect.sync(() => {
          released = true;
        }),
      );
      expect(released).toBe(false);

      const counter = yield* Counter;
      const n = yield* counter.count;
      expect(n).toBe(42);
    }));
});

describe("it.scopedLive.layer", () => {
  const test = it.scopedLive.layer(Counter.Test());

  test("provides layer + Scope with real clock", () =>
    Effect.gen(function* () {
      let released = false;
      yield* Effect.acquireRelease(Effect.succeed("resource"), () =>
        Effect.sync(() => {
          released = true;
        }),
      );
      expect(released).toBe(false);

      const counter = yield* Counter;
      const n = yield* counter.count;
      expect(n).toBe(42);
    }));
});

describe("merged layers", () => {
  interface LoggerService {
    readonly log: (msg: string) => Effect.Effect<void>;
  }

  class Logger extends ServiceMap.Service<Logger, LoggerService>()("test/Logger") {
    static Test = () => Layer.succeed(Logger, Logger.of({ log: () => Effect.void }));
  }

  const test = it.live.layer(Layer.mergeAll(Counter.Test(), Logger.Test()));

  test("provides multiple services", () =>
    Effect.gen(function* () {
      const counter = yield* Counter;
      const logger = yield* Logger;
      const n = yield* counter.count;
      expect(n).toBe(42);
      yield* logger.log("hello");
    }));
});
