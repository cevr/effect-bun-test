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
 * });
 * ```
 *
 * @module
 */
import type { Scope, TestServices } from "effect";
import { Effect, TestContext } from "effect";
import { describe as bunDescribe, expect, test as bunTest } from "bun:test";

type TestEnv = TestServices.TestServices;

/**
 * Yield to allow forked fibers to process.
 * Use after `send()` or when waiting for async effects.
 * Multiple yields handle delay timer registration.
 */
export const yieldFibers = Effect.yieldNow().pipe(Effect.repeatN(9));

/**
 * Effect-aware test helpers.
 *
 * - `it.effect` - Run with TestContext (includes TestClock)
 * - `it.scoped` - Run scoped effect with TestContext
 * - `it.live` - Run with real clock (no TestContext)
 * - `it.scopedLive` - Run scoped effect with real clock
 */
export const it = {
  /**
   * Run effect with TestContext (includes TestClock).
   * Use for tests that need time control.
   */
  effect: <E>(name: string, fn: () => Effect.Effect<void, E, TestEnv>, timeout?: number) =>
    bunTest(
      name,
      () => Effect.runPromise(fn().pipe(Effect.provide(TestContext.TestContext))),
      timeout,
    ),

  /**
   * Run scoped effect with TestContext.
   * Use for tests with resources that need cleanup.
   */
  scoped: <E>(
    name: string,
    fn: () => Effect.Effect<void, E, TestEnv | Scope.Scope>,
    timeout?: number,
  ) =>
    bunTest(
      name,
      () => Effect.runPromise(fn().pipe(Effect.scoped, Effect.provide(TestContext.TestContext))),
      timeout,
    ),

  /**
   * Run effect with real clock (no TestContext).
   * Use for tests that need actual time delays.
   */
  live: <E>(name: string, fn: () => Effect.Effect<void, E, never>, timeout?: number) =>
    bunTest(name, () => Effect.runPromise(fn()), timeout),

  /**
   * Run scoped effect with real clock.
   * Use for tests with resources that need real time.
   */
  scopedLive: <E>(name: string, fn: () => Effect.Effect<void, E, Scope.Scope>, timeout?: number) =>
    bunTest(name, () => Effect.runPromise(fn().pipe(Effect.scoped)), timeout),
};

/** Re-export bun:test primitives */
export const test = bunTest;
export const describe = bunDescribe;
export { expect };
