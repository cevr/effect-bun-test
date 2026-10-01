# effect-bun-test

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
