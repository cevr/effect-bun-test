// The entry a fixture runs against: `src` (Effect 4), or `src-v3` (Effect 3)
// when EFFECT_BUN_TEST_ENTRY is `v3`, with `effect-v3.ts` preloaded so that
// `effect` is Effect 3 for the fixture and the entry alike. The path is a
// value, so the Effect 4 typecheck does not follow it into `src-v3`.
import type * as Entry from "../../src/index.js";

const path =
  process.env["EFFECT_BUN_TEST_ENTRY"] === "v3" ? "../../src-v3/index.js" : "../../src/index.js";

export const { describe, it, setDefaultTimeout } = (await import(path)) as typeof Entry;
