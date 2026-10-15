// Every runner in a `describe.concurrent` block of a plain file: passing, and
// timed out under a deadline the runner holds.
import { passing, timingOut } from "./cases.js";
import { describe, setDefaultTimeout } from "./entry.js";

setDefaultTimeout(300);

describe.concurrent("passing in describe.concurrent", passing);
describe.concurrent("timed out in describe.concurrent", timingOut);
