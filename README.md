# effect-bun-test

Effect testing utilities for Bun.

## Install

```bash
bun add -d effect-bun-test
```

## Usage

```ts
import { Effect, TestClock } from "effect";
import { describe, it, expect, yieldFibers } from "effect-bun-test";

describe("my feature", () => {
  // Run with TestContext (includes TestClock)
  it.effect("handles time-based logic", () =>
    Effect.gen(function* () {
      yield* TestClock.adjust("1 second");
      expect(true).toBe(true);
    }),
  );

  // Run scoped effect with TestContext
  it.scoped("cleans up resources", () =>
    Effect.gen(function* () {
      const resource = yield* Effect.acquireRelease(Effect.succeed("handle"), () =>
        Effect.log("released"),
      );
      // resource auto-released after test
    }),
  );

  // Run with real clock (no TestContext)
  it.live("uses actual delays", () =>
    Effect.gen(function* () {
      yield* Effect.sleep("10 millis");
    }),
  );

  // Yield to forked fibers
  it.effect("waits for async work", () =>
    Effect.gen(function* () {
      let done = false;
      yield* Effect.fork(
        Effect.sync(() => {
          done = true;
        }),
      );
      yield* yieldFibers;
      expect(done).toBe(true);
    }),
  );
});
```

## API

### Test Runners

| Method          | TestContext | Scope | Use Case                      |
| --------------- | ----------- | ----- | ----------------------------- |
| `it.effect`     | ✓           |       | Time-controlled tests         |
| `it.scoped`     | ✓           | ✓     | Tests with resource cleanup   |
| `it.live`       |             |       | Real clock tests              |
| `it.scopedLive` |             | ✓     | Real clock + resource cleanup |

### Utilities

- `yieldFibers` - Yield to allow forked fibers to process (use after `fork` or `send`)
- `describe`, `test`, `expect` - Re-exported from `bun:test`

## License

MIT
