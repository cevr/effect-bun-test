---
"effect-bun-test": patch
---

Typechecked with TypeScript 7 (7.0.2) and tested against Effect 4.1.4. The Effect diagnostics now come from `@effect/tsgo` in place of `@effect/language-service`, which does not run on TypeScript 7. The published `tsconfig.json` keeps the same plugin options, with `importFromBarrel` and `preferSchemaOverJson` replaced by their successors `preferBarrelImport` (with `barrelImportPackages: ["effect"]`) and `globalJsonInEffect`. No runtime change.
