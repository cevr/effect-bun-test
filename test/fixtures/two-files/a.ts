// One of two files bun runs in one process after `preload.ts`: a plain bun
// test and a runner test, each 400 ms long, past the preload's 200 ms.
import { test } from "bun:test";
import { Effect } from "effect";
import { it } from "../entry.js";

test("a: plain", () => Bun.sleep(400));
it.live("a: runner", () => Effect.sleep("400 millis"));
