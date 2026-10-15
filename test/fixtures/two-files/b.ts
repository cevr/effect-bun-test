// The other of two files bun runs in one process after `preload.ts` (`a.ts`).
import { test } from "bun:test";
import { Effect } from "effect";
import { it } from "../entry.js";

test("b: plain", () => Bun.sleep(400));
it.live("b: runner", () => Effect.sleep("400 millis"));
