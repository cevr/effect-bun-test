# effect-bun-test

## 0.5.0

### Minor Changes

- [#6](https://github.com/cevr/effect-bun-test/pull/6) [`171e394`](https://github.com/cevr/effect-bun-test/commit/171e394204e89b200aed17cbd338d48da47e9adb) Thanks [@cevr](https://github.com/cevr)! - A test that times out is interrupted, and its finalizers run. Every runner (`it.effect`, `it.scoped`, `it.live`, `it.scopedLive`, their `.layer` forms, in both the Effect 4 and `/v3` entries) runs the test's effect on a fiber of its own. Before, bun's timeout ended the test but not its fiber: its scope never closed, so its resources (a server, a browser, a child process) ran on beside later tests, and a failure it hit afterwards was reported as an unhandled error between tests. When the fiber is interrupted depends on how bun runs the test:
  - **A test bun runs alone** (a plain file, `test.serial`, a runner's new `.serial` form): the test's `onTestFinished` hook interrupts the fiber when bun ends the test, and bun waits for its finalizers before the next test starts, for up to the test's own timeout (bun's default when it has none). The deadline is bun's own, however it was set.
  - **A concurrent test** (a `concurrentTestGlob` file, `describe.concurrent`, `--concurrent`): bun refuses `onTestFinished` there, so the runner races the fiber against the test's deadline itself and interrupts it at that deadline, counted from when bun enters the test, as bun counts it. It can do so only when it holds the deadline: the runner's `timeout` argument, or the new `setDefaultTimeout` exported here. The runner hands bun that same number, so for a runner test the two deadlines are one. Bun does not wait for these finalizers: they run beside the tests still running.
  - **A concurrent test under any deadline the runner does not hold** (bun's 5 s default, `bun:test`'s own `setDefaultTimeout`, `--timeout` alone), which a test cannot read, or under a timeout past 2³¹−1 ms, which `setTimeout` cannot hold, is not interrupted by its timeout, as before: its finalizers run when its fiber ends on its own. A timeout under 1 ms is no deadline, to bun and to the runner alike.

  Each deadline is in real time, so the TestClock never moves it, and no test's timeout changes. Once a test has ended, its promise never settles, so a late failure of the interrupted fiber is not reported again.

  New: `setDefaultTimeout(ms)`, and `.serial` on each runner, which registers the test with `test.serial`. `setDefaultTimeout` sets the deadline the runners hold, for the rest of the process, and bun's default, which bun keeps for the current file only: call it in a preload and pass bun `--timeout` of the same milliseconds, so plain tests and hooks in later files keep it too. A call at the top of a file outlives that file for the runners wherever bun runs several files in one process. The `bun` peer range is now `>=1.3.2`, the first bun with `onTestFinished`.

## 0.4.0

### Minor Changes

- [`553bc47`](https://github.com/cevr/effect-bun-test/commit/553bc47ada7674db0fe1dd61b9a3fad936b8b80b) Thanks [@cevr](https://github.com/cevr)! - Requires Effect 4.0.0 for the default (v4) entry; the `effect-bun-test/v3` entry still supports Effect 3.19+. The peer range is now `^3.19.0 || ^4.0.0`.

## 0.3.0

### Minor Changes

- [`847b440`](https://github.com/cevr/effect-bun-test/commit/847b4402d263be276659338eddd7873e53bfe7b7) Thanks [@cevr](https://github.com/cevr)! - Add `.layer()` method to all `it` variants (`it.live.layer`, `it.effect.layer`, `it.scoped.layer`, `it.scopedLive.layer`). Returns a test function with the layer pre-provided, eliminating per-test `.pipe(Effect.provide(layer))` boilerplate.

## 0.2.1

### Patch Changes

- [`e8fad2c`](https://github.com/cevr/effect-bun-test/commit/e8fad2c7320d814f557b050c5c4ba94cb08ad9a5) Thanks [@cevr](https://github.com/cevr)! - Move effect from dependencies to devDependencies to prevent nested copies conflicting with consumer's effect version

## 0.2.0

### Minor Changes

- [`5c54732`](https://github.com/cevr/effect-bun-test/commit/5c54732721bd31ed5cd934463616a409bd5a391f) Thanks [@cevr](https://github.com/cevr)! - Add Effect v4 support with dual v3/v4 exports
  - Default export (`.`) now targets Effect v4
  - v3 compat available via `./v3` export
  - Peer dependency widened to `effect >= 3.19.0`
