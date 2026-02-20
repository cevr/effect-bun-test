# effect-bun-test

## 0.2.1

### Patch Changes

- [`e8fad2c`](https://github.com/cevr/effect-bun-test/commit/e8fad2c7320d814f557b050c5c4ba94cb08ad9a5) Thanks [@cevr](https://github.com/cevr)! - Move effect from dependencies to devDependencies to prevent nested copies conflicting with consumer's effect version

## 0.2.0

### Minor Changes

- [`5c54732`](https://github.com/cevr/effect-bun-test/commit/5c54732721bd31ed5cd934463616a409bd5a391f) Thanks [@cevr](https://github.com/cevr)! - Add Effect v4 support with dual v3/v4 exports
  - Default export (`.`) now targets Effect v4
  - v3 compat available via `./v3` export
  - Peer dependency widened to `effect >= 3.19.0`
