import { describe, expect, test } from "bun:test";

/** The lines a run of the fixture printed that tell the order of things. */
const ordered = (output: string) =>
  output
    .split("\n")
    // oxlint-disable-next-line no-control-regex -- bun colours its report
    .map((line) => line.replace(/\u001b\[[0-9;]*m/g, "").trim())
    .filter((line) => /^(acquired|released|ran after) |^\(fail\) |^# Unhandled/.test(line))
    .map((line) => line.replace(/ \[[\d.]+m?s\]$/, ""));

describe("a test bun times out", () => {
  test("is interrupted, its finalizers run before the next test starts, and nothing fails after it", () => {
    const run = Bun.spawnSync(["bun", "test", "./test/fixtures/times-out.ts"], {
      cwd: `${import.meta.dir}/..`,
      stdout: "pipe",
      stderr: "pipe",
    });
    // bun reports on stderr, where the fixture says what it did too.
    const output = run.stderr.toString();
    expect(run.exitCode).toBe(1);
    expect(ordered(output)).toEqual([
      "acquired scoped",
      "released scoped",
      "(fail) a test bun times out > scoped",
      "ran after scoped",
      "acquired effect",
      "released effect",
      "(fail) a test bun times out > effect",
      "ran after effect",
      "acquired scopedLive",
      "released scopedLive",
      "(fail) a test bun times out > scopedLive",
      "ran after scopedLive",
      "acquired live",
      "released live",
      "(fail) a test bun times out > live",
      "ran after live",
    ]);
  });
});
