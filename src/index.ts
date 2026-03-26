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
import { Effect, Layer } from "effect";
import type { TestClock } from "effect/testing";
import { TestClock as TestClockImpl } from "effect/testing";
import { describe as bunDescribe, expect, test as bunTest } from "bun:test";

type TestEnv = TestClock.TestClock;

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

/**
 * Effect-aware test helpers.
 *
 * Each variant has a `.layer(layer)` method that returns a test function
 * with the layer pre-provided — eliminating per-test `.pipe(Effect.provide(layer))`.
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
  effect: Object.assign(
    <E>(name: string, fn: () => Effect.Effect<void, E, TestEnv>, timeout?: number) =>
      bunTest(
        name,
        () => Effect.runPromise(fn().pipe(Effect.scoped, Effect.provide(TestClockImpl.layer()))),
        timeout,
      ),
    {
      layer:
        <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut | TestEnv> =>
        (name, fn, timeout) =>
          bunTest(
            name,
            () =>
              Effect.runPromise(
                fn().pipe(Effect.scoped, Effect.provide(Layer.merge(TestClockImpl.layer(), layer))),
              ),
            timeout,
          ),
    },
  ),

  /**
   * Run scoped effect with TestClock.
   * Use for tests with resources that need cleanup.
   */
  scoped: Object.assign(
    <E>(name: string, fn: () => Effect.Effect<void, E, TestEnv | Scope.Scope>, timeout?: number) =>
      bunTest(
        name,
        () => Effect.runPromise(fn().pipe(Effect.scoped, Effect.provide(TestClockImpl.layer()))),
        timeout,
      ),
    {
      layer:
        <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut | TestEnv | Scope.Scope> =>
        (name, fn, timeout) =>
          bunTest(
            name,
            () =>
              Effect.runPromise(
                fn().pipe(Effect.scoped, Effect.provide(Layer.merge(TestClockImpl.layer(), layer))),
              ),
            timeout,
          ),
    },
  ),

  /**
   * Run effect with real clock (no TestClock).
   * Use for tests that need actual time delays.
   */
  live: Object.assign(
    <E>(name: string, fn: () => Effect.Effect<void, E, never>, timeout?: number) =>
      bunTest(name, () => Effect.runPromise(fn()), timeout),
    {
      layer:
        <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut> =>
        (name, fn, timeout) =>
          bunTest(name, () => Effect.runPromise(fn().pipe(Effect.provide(layer))), timeout),
    },
  ),

  /**
   * Run scoped effect with real clock.
   * Use for tests with resources that need real time.
   */
  scopedLive: Object.assign(
    <E>(name: string, fn: () => Effect.Effect<void, E, Scope.Scope>, timeout?: number) =>
      bunTest(name, () => Effect.runPromise(fn().pipe(Effect.scoped)), timeout),
    {
      layer:
        <ROut, EL>(layer: Layer.Layer<ROut, EL>): LayeredTest<ROut | Scope.Scope> =>
        (name, fn, timeout) =>
          bunTest(
            name,
            () => Effect.runPromise(fn().pipe(Effect.scoped, Effect.provide(layer))),
            timeout,
          ),
    },
  ),
};

/** Re-export bun:test primitives */
export const test = bunTest;
export const describe = bunDescribe;
export { expect };
