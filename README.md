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

Each runner takes an optional `timeout` (milliseconds) after the test, has a
`.layer(layer)` form that provides `layer` to every test it registers, and a
`.serial` form (`it.live.serial(...)`) that registers the test with
`test.serial`, so it runs alone even in a concurrent file.

### Timeouts

Every runner runs the test's effect on a fiber of its own and interrupts it
when the test times out, so the test closes its scope (its servers, browsers,
child processes) instead of running on beside the tests after it. Deadlines
are in real time: the `TestClock` an `it.effect` test runs on never moves
them. How the fiber is interrupted depends on how bun runs the test:

| The test                                                                                                                                                                                        | Interrupted                                                                                                                            | Its finalizers                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Runs alone: a plain file, `test.serial`, a runner's `.serial` form                                                                                                                              | When bun ends it, by the test's `onTestFinished` hook; the deadline is bun's, however it was set                                       | Run before the next test starts, for up to the test's own timeout (bun's default when it has none); past that, bun moves on |
| Concurrent (`concurrentTestGlob`, `describe.concurrent`, `--concurrent`), with a deadline the runner holds: its `timeout`, or `setDefaultTimeout` below                                         | At that deadline, by the runner's own timer, counted from when bun enters the test (bun refuses `onTestFinished` in a concurrent test) | Run beside the tests still running; bun does not wait for them                                                              |
| Concurrent, under any deadline the runner does not hold: bun's 5 s default, `bun:test`'s own `setDefaultTimeout`, `--timeout` alone; or a timeout past 2³¹−1 ms, which `setTimeout` cannot hold | Not interrupted by its timeout: a test cannot read bun's deadline, so the fiber runs on, as before 0.5.0                               | Run when the fiber ends on its own                                                                                          |

A timeout under 1 ms (or `NaN`) is no deadline, to bun and to the runner
alike. Once a test has ended its promise never settles: bun has reported the
timeout, and a late failure of the interrupted fiber is not reported again.
Requires bun 1.3.2 or later.

So in a concurrent file, set the default timeout with this package's
`setDefaultTimeout`, in a preload, and pass bun `--timeout` of the same
milliseconds:

```ts
// preload.ts, named in bunfig.toml's [test] preload
import { setDefaultTimeout } from "effect-bun-test";

setDefaultTimeout(20_000);
```

```sh
bun test --timeout 20000
```

The call sets two things, which last differently:

- **The runners' deadline** lasts for the rest of the process. The runners
  hand bun that same number for each test they register, so for a runner
  test bun's deadline and the runner's are one.
- **Bun's default** (`setDefaultTimeout` from `bun:test`) lasts for the
  current file only. Where bun runs several files in one process (its
  default, or `--no-isolate`), it resets its default after each file, so
  plain `test(...)` calls and hooks in the later files fall back to
  `--timeout`, else 5 s. A `--timeout` of the same milliseconds keeps them
  on it.

For the same reason a call at the top of a file outlives that file for the
runners: in a shared process, every runner test in the files after it gets
its deadline too. The preload is the place for it.

### Utilities

- `setDefaultTimeout(ms)` - The default timeout of the tests registered after it: the deadline the runners hold, for the process, and bun's, for the current file (pair it with `--timeout <ms>`)
- `yieldFibers` - Yield to allow forked fibers to process (use after `fork` or `send`)
- `describe`, `test`, `expect` - Re-exported from `bun:test`

## License

MIT
