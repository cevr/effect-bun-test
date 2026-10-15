// Preloaded once for the run, as a consumer's bunfig `[test] preload` is:
// effect-bun-test's default timeout, which bun keeps for the first file only.
import { setDefaultTimeout } from "../entry.js";

setDefaultTimeout(200);
