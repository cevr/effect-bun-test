// @effect-diagnostics strictEffectProvide:off
/**
 * Effect testing utilities for Bun.
 *
 * @example
 * ```ts
 * import { describe, it, expect } from "effect-bun-test";
 *
 * describe("my test", () => {
 *   it.effect("runs with TestContext", () =>
 *     Effect.gen(function* () {
 *       yield* TestClock.adjust("1 second");
 *       expect(true).toBe(true);
 *     })
 *   );
 *
 *   it.scoped("runs scoped effect", () =>
 *     Effect.gen(function* () {
 *       const resource = yield* Effect.acquireRelease(...);
 *       // auto-released after test
 *     })
 *   );
 *
 *   it.live("runs with real clock", () =>
 *     Effect.gen(function* () {
 *       yield* Effect.sleep("10 millis");
 *     })
 *   );
 *
 *   // Layer variants — pre-provide a layer to all tests
 *   const test = it.live.layer(MyService.Test());
 *   test("creates something", () =>
 *     Effect.gen(function* () {
 *       const svc = yield* MyService;
 *       // layer is automatically provided
 *     })
 *   );
 * });
 * ```
 *
 * @module
 */
import type { Scope } from "effect";
import { Effect, Fiber, Layer } from "effect";
import type { TestClock } from "effect/testing";
import { TestClock as TestClockImpl } from "effect/testing";
import {
  describe as bunDescribe,
  expect,
  onTestFinished,
  setDefaultTimeout as bunSetDefaultTimeout,
  test as bunTest,
} from "bun:test";

type TestEnv = TestClock.TestClock;

/** The deadline the runners hold for a test with no `timeout` of its own. */
let defaultTimeout: number | undefined;

/**
 * Set the default timeout, in milliseconds, of the tests registered after it:
 * bun's own (`setDefaultTimeout` from `bun:test`), and the deadline the
 * runners hold, at which they interrupt a concurrent test. Use it in place of
 * bun's `--timeout`, which a test cannot read: in a preload, or at the top of
 * a file.
 */
export const setDefaultTimeout = (milliseconds: number): void => {
  defaultTimeout = milliseconds;
  bunSetDefaultTimeout(milliseconds);
};

// Real time: a test's fake timers never move the runner's deadline.
const { setTimeout: startTimer, clearTimeout: stopTimer } = globalThis;

const never = new Promise<void>(() => {});

/**
 * Run a test's effect on a fiber of its own, and interrupt it when bun ends
 * the test, its timeout included, so the test closes its scope (its servers,
 * browsers, child processes) instead of running on beside later tests.
 *
 * - A test bun runs alone: the test's `onTestFinished` hook interrupts the
 *   fiber, and bun waits for its finalizers before the next test starts.
 * - A concurrent test, where bun refuses the hook (it cannot tell which test
 *   is running): the runner races the fiber against `deadline` in real time,
 *   the test's own timeout, which it handed bun, and interrupts it there. Bun
 *   does not wait for those finalizers; they run beside the tests still
 *   running. With no deadline (bun's `--timeout` alone), the fiber runs on,
 *   as it did before 0.5.0.
 *
 * Once the test has ended, its promise never settles: bun reports the
 * timeout, and whatever the interrupted fiber does after is not a result.
 */
const run = <E>(effect: Effect.Effect<void, E>, deadline: number | undefined): Promise<void> => {
  let ended = false;
  let hooked = true;
  try {
    onTestFinished(() => end());
  } catch {
    hooked = false;
  }
  const fiber = Effect.runFork(effect);
  const end = () => {
    ended = true;
    return Effect.runPromise(Fiber.interrupt(fiber));
  };
  const timer =
    !hooked && deadline !== undefined && deadline > 0 ? startTimer(end, deadline) : undefined;
  return Effect.runPromise(Fiber.join(fiber)).then(
    () => {
      stopTimer(timer);
      return ended ? never : undefined;
    },
    (error: unknown) => {
      stopTimer(timer);
      if (ended) return never;
      throw error;
    },
  );
};

/**
 * Register a test that runs `effect` (`test` or `test.serial`), its deadline
 * its own `timeout`, else `setDefaultTimeout`'s, which bun is handed too.
 */
const register =
  (test: typeof bunTest) =>
  <E>(name: string, effect: () => Effect.Effect<void, E>, timeout: number | undefined): void => {
    const deadline = timeout ?? defaultTimeout;
    test(name, () => run(effect(), deadline), deadline);
  };

const asTest = register(bunTest);
const asSerial = register(bunTest.serial);

/** A runner, and its `.serial` form, over `prepare`. */
const runner = <R>(prepare: <E>(effect: Effect.Effect<void, E, R>) => Effect.Effect<void, E>) => {
  const on =
    (as: typeof asTest) =>
    <E>(name: string, fn: () => Effect.Effect<void, E, R>, timeout?: number) =>
      as(name, () => prepare(fn()), timeout);
  return { test: on(asTest), serial: on(asSerial) };
};

/**
 * Yield to allow forked fibers to process.
 * Use after `send()` or when waiting for async effects.
 * Multiple yields handle delay timer registration.
 */
export const yieldFibers = Effect.yieldNow.pipe(Effect.repeat({ times: 9 }));

/** Test function returned by `.layer()` */
type LayeredTest<R> = <E>(
  name: string,
  fn: () => Effect.Effect<void, E, R>,
  timeout?: number,
) => void;

const effect = runner(<E>(self: Effect.Effect<void, E, TestEnv>) =>
  self.pipe(Effect.scoped, Effect.provide(TestClockImpl.layer())),
);
const scoped = runner(<E>(self: Effect.Effect<void, E, TestEnv | Scope.Scope>) =>
  self.pipe(Effect.scoped, Effect.provide(TestClockImpl.layer())),
);
const live = runner(<E>(self: Effect.Effect<void, E>) => self);
const scopedLive = runner(<E>(self: Effect.Effect<void, E, Scope.Scope>) =>
  self.pipe(Effect.scoped),
);

/**
 * Effect-aware test helpers.
 *
 * Each variant has a `.layer(layer)` method that returns a test function
 * with the layer pre-provided — eliminating per-test `.pipe(Effect.provide(layer))`,
 * and a `.serial` form that runs the test alone, as `test.serial` does.
 *
 * - `it.effect` - Run with TestClock
 * - `it.scoped` - Run scoped effect with TestClock
 * - `it.live` - Run with real clock (no TestClock)
 * - `it.scopedLive` - Run scoped effect with real clock
 */
export const it = {
  /**
   * Run effect with TestClock.
   * Use for tests that need time control.
   */
  effect: Object.assign(effect.test, {
    serial: effect.serial,
    layer:
      <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut | TestEnv> =>
      (name, fn, timeout) =>
        asTest(
          name,
          () => fn().pipe(Effect.scoped, Effect.provide(Layer.merge(TestClockImpl.layer(), layer))),
          timeout,
        ),
  }),

  /**
   * Run scoped effect with TestClock.
   * Use for tests with resources that need cleanup.
   */
  scoped: Object.assign(scoped.test, {
    serial: scoped.serial,
    layer:
      <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut | TestEnv | Scope.Scope> =>
      (name, fn, timeout) =>
        asTest(
          name,
          () => fn().pipe(Effect.scoped, Effect.provide(Layer.merge(TestClockImpl.layer(), layer))),
          timeout,
        ),
  }),

  /**
   * Run effect with real clock (no TestClock).
   * Use for tests that need actual time delays.
   */
  live: Object.assign(live.test, {
    serial: live.serial,
    layer:
      <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut> =>
      (name, fn, timeout) =>
        asTest(name, () => fn().pipe(Effect.provide(layer)), timeout),
  }),

  /**
   * Run scoped effect with real clock.
   * Use for tests with resources that need real time.
   */
  scopedLive: Object.assign(scopedLive.test, {
    serial: scopedLive.serial,
    layer:
      <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut | Scope.Scope> =>
      (name, fn, timeout) =>
        asTest(name, () => fn().pipe(Effect.scoped, Effect.provide(layer)), timeout),
  }),
};

/** Re-export bun:test primitives */
export const test = bunTest;
export const describe = bunDescribe;
export { expect };
