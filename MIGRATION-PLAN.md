# Effect v4 Migration Plan

## Strategy: Dual v3/v4 Support

Same pattern as effect-machine:

- Rename `src/` → `src-v3/` (frozen v3)
- Copy to `src/` (becomes v4 target)
- Exports: `"."` → v4, `"./v3"` → v3

## Current Source (1 file)

`src/index.ts` — ~100 lines. 6 changes needed.

## API Changes

### 1. `TestContext.TestContext` → `TestClock.layer()`

v3 had a unified `TestContext.TestContext` layer providing all test services.
v4 has no `TestContext` — individual layers compose instead.

```ts
// v3
import type { TestServices } from "effect";
import { Effect, TestContext } from "effect";
type TestEnv = TestServices.TestServices;
// ...
Effect.provide(TestContext.TestContext);

// v4
import { Effect } from "effect";
import { TestClock } from "effect/testing";
type TestEnv = TestClock.TestClock;
// ...
Effect.provide(TestClock.layer());
```

For `it.scoped`, just merge the layers:

```ts
// v4
fn().pipe(Effect.scoped, Effect.provide(TestClock.layer()));
```

### 2. `Effect.yieldNow()` → `Effect.yieldNow`

Value, not function call.

```ts
// v3
export const yieldFibers = Effect.yieldNow().pipe(Effect.repeatN(9));

// v4
export const yieldFibers = Effect.yieldNow.pipe(Effect.repeat({ times: 9 }));
```

### 3. `Effect.repeatN(n)` → `Effect.repeat({ times: n })`

`repeatN` removed in v4.

### 4. `Scope.Scope` type

`Scope.Scope` is still a `ServiceMap.Service` — works the same way in `it.scoped`/`it.scopedLive`.

### 5. `Effect.scoped`

Still exists, same API. No change.

## v4 Source (complete)

```ts
// @effect-diagnostics strictEffectProvide:off
import type { Scope } from "effect";
import { Effect } from "effect";
import type { TestClock } from "effect/testing";
import { TestClock as TestClockImpl } from "effect/testing";
import { describe as bunDescribe, expect, test as bunTest } from "bun:test";

type TestEnv = TestClock.TestClock;

export const yieldFibers = Effect.yieldNow.pipe(Effect.repeat({ times: 9 }));

export const it = {
  effect: <E>(name: string, fn: () => Effect.Effect<void, E, TestEnv>, timeout?: number) =>
    bunTest(
      name,
      () => Effect.runPromise(fn().pipe(Effect.provide(TestClockImpl.layer()))),
      timeout,
    ),

  scoped: <E>(
    name: string,
    fn: () => Effect.Effect<void, E, TestEnv | Scope.Scope>,
    timeout?: number,
  ) =>
    bunTest(
      name,
      () => Effect.runPromise(fn().pipe(Effect.scoped, Effect.provide(TestClockImpl.layer()))),
      timeout,
    ),

  live: <E>(name: string, fn: () => Effect.Effect<void, E, never>, timeout?: number) =>
    bunTest(name, () => Effect.runPromise(fn()), timeout),

  scopedLive: <E>(name: string, fn: () => Effect.Effect<void, E, Scope.Scope>, timeout?: number) =>
    bunTest(name, () => Effect.runPromise(fn().pipe(Effect.scoped)), timeout),
};

export const test = bunTest;
export const describe = bunDescribe;
export { expect };
```

## package.json Changes

```jsonc
{
  "files": ["src", "src-v3", "tsconfig.json", "tsconfig.v3.json"],
  "exports": {
    ".": "./src/index.ts", // v4 (default)
    "./v3": "./src-v3/index.ts", // v3 compat
  },
  "dependencies": {
    "effect": "4.0.0-beta.5",
  },
  "devDependencies": {
    "effect-v3": "npm:effect@^3.19.15",
    // ... rest unchanged
  },
  "peerDependencies": {
    "bun": "*",
    "effect": ">=3.19.0",
  },
}
```

## Execution

1. `mv src src-v3 && cp -r src-v3 src`
2. Apply v4 changes to `src/index.ts` (from "v4 Source" above)
3. Update `package.json` (deps + exports)
4. Add `tsconfig.v3.json` (paths `"effect"` → `"effect-v3"`)
5. `bun install`
6. `bun run typecheck`
7. Commit + publish

~10 min job. Blocker for effect-machine test migration.
