---
"effect-bun-test": minor
---

A test that times out is interrupted, and its finalizers run before the next test starts. Every runner (`it.effect`, `it.scoped`, `it.live`, `it.scopedLive` and their `.layer` forms, in both the Effect 4 and `/v3` entries) runs the test's effect on a fiber of its own, and the test's `onTestFinished` hook interrupts that fiber and waits for it when bun ends the test. Before, bun's timeout ended the test but not its fiber: its scope never closed, so its resources (a server, a browser, a child process) ran on beside later tests, and a failure it hit afterwards was reported as an unhandled error between tests. The deadline is bun's own, in real time, however it was set, so the TestClock never moves it, and no timeout changes. A fiber's failure after that interrupt is not reported again.
