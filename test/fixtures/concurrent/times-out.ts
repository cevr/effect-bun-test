// Every runner in a file bun runs concurrently, timed out under a deadline the runner holds.
import { timingOut } from "../cases.js";
import { describe, setDefaultTimeout } from "../entry.js";

setDefaultTimeout(300);

describe("a concurrent test bun times out", timingOut);
