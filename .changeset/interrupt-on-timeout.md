---
"effect-bun-test": minor
---

A test that times out is interrupted, and its finalizers run. Every runner (`it.effect`, `it.scoped`, `it.live`, `it.scopedLive`, their `.layer` forms, in both the Effect 4 and `/v3` entries) runs the test's effect on a fiber of its own. Before, bun's timeout ended the test but not its fiber: its scope never closed, so its resources (a server, a browser, a child process) ran on beside later tests, and a failure it hit afterwards was reported as an unhandled error between tests. When the fiber is interrupted depends on how bun runs the test:

- **A test bun runs alone** (a plain file, `test.serial`, a runner's new `.serial` form): the test's `onTestFinished` hook interrupts the fiber when bun ends the test, and bun waits for its finalizers before the next test starts. The deadline is bun's own, however it was set.
- **A concurrent test** (a `concurrentTestGlob` file, `describe.concurrent`, `--concurrent`): bun refuses `onTestFinished` there, so the runner races the fiber against the test's deadline itself and interrupts it at that deadline. It can do so only when it holds the deadline: the runner's `timeout` argument, or the new `setDefaultTimeout` exported here, which sets bun's default too. The runner hands bun that same number, so the two deadlines are one. Bun does not wait for these finalizers: they run beside the tests still running. A concurrent test whose deadline comes from bun's `--timeout` alone, which a test cannot read, is not interrupted, as before.

Each deadline is in real time, so the TestClock never moves it, and no timeout changes. Once a test has ended, its promise never settles, so a late failure of the interrupted fiber is not reported again.

New: `setDefaultTimeout(ms)`, to use in place of bun's `--timeout` (in a preload, or at the top of a file), and `.serial` on each runner, which registers the test with `test.serial`. The `bun` peer range is now `>=1.3.2`, the first bun with `onTestFinished`.
