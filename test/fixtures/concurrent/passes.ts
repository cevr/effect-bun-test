// Every runner in a file bun runs concurrently, with no deadline of the runner's own.
import { passing } from "../cases.js";
import { describe } from "../entry.js";

describe("a concurrent test", passing);
