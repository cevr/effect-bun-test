---
"effect-bun-test": minor
---

Add `.layer()` method to all `it` variants (`it.live.layer`, `it.effect.layer`, `it.scoped.layer`, `it.scopedLive.layer`). Returns a test function with the layer pre-provided, eliminating per-test `.pipe(Effect.provide(layer))` boilerplate.
