// Preloaded (`--preload`) when a fixture runs against the `/v3` entry: the
// `effect` module, the fixture's and `src-v3`'s alike, is Effect 3 (the
// `effect-v3` dev dependency), as it is for a consumer on Effect 3. The
// package name is a value, so the Effect 4 typecheck does not load Effect 3.
import { plugin } from "bun";

const EFFECT_V3 = "effect-v3";
const v3: Record<string, unknown> = await import(EFFECT_V3);

plugin({
  name: "effect-v3",
  setup(build) {
    build.module("effect", () => ({ exports: v3, loader: "object" }));
  },
});
