// Each fixture runs as a `bun test` of its own (`bun test` finds no
// `*.test.ts` in `test/fixtures`, so the suite does not run them directly),
// against both entries: `src` on Effect 4, and `src-v3` on Effect 3.
import { describe, expect, test } from "bun:test";

const fixtures = `${import.meta.dir}/fixtures`;

const ENTRIES = ["v4", "v3"] as const;
type Entry = (typeof ENTRIES)[number];

/** Run one fixture; answer its exit code and its stderr's lines, cleaned. */
const run = async (
  entry: Entry,
  path: string,
  options: { readonly dir?: string; readonly args?: ReadonlyArray<string> } = {},
) => {
  const child = Bun.spawn(
    [
      "bun",
      "test",
      ...(entry === "v3" ? ["--preload", `${fixtures}/effect-v3.ts`] : []),
      ...(options.args ?? []),
      path,
    ],
    {
      cwd: options.dir === undefined ? fixtures : `${fixtures}/${options.dir}`,
      env: { ...process.env, EFFECT_BUN_TEST_ENTRY: entry },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  // bun reports on stderr, where the fixtures say what they did too.
  const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
  const lines = stderr
    .split("\n")
    // oxlint-disable-next-line no-control-regex -- bun colours its report
    .map((line) => line.replace(/\u001b\[[0-9;]*m/g, "").trim())
    .map((line) => line.replace(/ \[[\d.]+m?s\]$/, ""));
  const count = (word: string) =>
    Number(lines.find((line) => line.endsWith(` ${word}`))?.split(" ")[0] ?? 0);
  return {
    exitCode,
    lines,
    /** The lines that tell the order of things. */
    ordered: lines.filter((line) => /^(acquired|released|ran after) |^\(fail\) /.test(line)),
    failed: lines.filter((line) => line.startsWith("(fail) ")).sort(),
    passed: count("pass"),
    released: lines.find((line) => line.startsWith("released by then:")),
    /** A runner refused, or an error bun saw between tests. */
    broken: lines.filter((line) => /Cannot call onTestFinished|^# Unhandled/.test(line)),
  };
};

const timedOut = (group: string) =>
  ["default", "effect", "live", "scoped", "scopedLive"].map((name) => `(fail) ${group} > ${name}`);

const ALL_RELEASED = "released by then: default effect live scoped scopedLive";

for (const entry of ENTRIES)
  describe.concurrent(`on the ${entry} entry`, () => {
    test("a test bun times out is interrupted, its finalizers run before the next test starts, and nothing fails after it", async () => {
      const result = await run(entry, "./times-out.ts");
      expect(result.exitCode).toBe(1);
      expect(result.ordered).toEqual(
        ["scoped", "effect", "scopedLive", "live"].flatMap((name) => [
          `acquired ${name}`,
          `released ${name}`,
          `(fail) a test bun times out > ${name}`,
          `ran after ${name}`,
        ]),
      );
      expect(result.broken).toEqual([]);
    });

    test("a timed-out test's finalizers have its own timeout to run in, not bun's default", async () => {
      // bun's default (30 ms) is shorter than a release (50 ms); each test's own is 200 ms.
      const result = await run(entry, "./times-out.ts", { args: ["--timeout", "30"] });
      expect(result.exitCode).toBe(1);
      expect(result.ordered).toEqual(
        ["scoped", "effect", "scopedLive", "live"].flatMap((name) => [
          `acquired ${name}`,
          `released ${name}`,
          `(fail) a test bun times out > ${name}`,
          `ran after ${name}`,
        ]),
      );
      expect(result.broken).toEqual([]);
    });

    test("in one process, bun keeps setDefaultTimeout's ms for the first file only; with --timeout of the same ms, every test has it", async () => {
      const twoFiles = (args: ReadonlyArray<string>) =>
        run(entry, "./b.ts", {
          dir: "two-files",
          args: ["--preload", "./preload.ts", ...args, "./a.ts"],
        });
      const [preloadAlone, paired] = await Promise.all([
        twoFiles([]),
        twoFiles(["--timeout", "200"]),
      ]);
      // The later file's plain test has bun's 5 s default; the runner tests, the preload's 200 ms.
      expect(preloadAlone.failed).toEqual([
        "(fail) a: plain",
        "(fail) a: runner",
        "(fail) b: runner",
      ]);
      expect(preloadAlone.passed).toBe(1);
      expect(paired.failed).toEqual([
        "(fail) a: plain",
        "(fail) a: runner",
        "(fail) b: plain",
        "(fail) b: runner",
      ]);
    });

    test("every runner passes in a file bun runs concurrently, and a failure still fails", async () => {
      const result = await run(entry, "./passes.ts", { dir: "concurrent" });
      expect(result.broken).toEqual([]);
      expect(result.failed).toEqual(["(fail) a concurrent test > fails"]);
      expect(result.passed).toBe(8);
      expect(result.lines).toContain("released scoped");
      expect(result.lines).toContain("released scopedLive");
    });

    test("a concurrent test bun times out under the runner's deadline is interrupted, and its finalizers run while the file still runs", async () => {
      const result = await run(entry, "./times-out.ts", { dir: "concurrent" });
      expect(result.broken).toEqual([]);
      expect(result.failed).toEqual(timedOut("a concurrent test bun times out"));
      expect(result.released).toBe(ALL_RELEASED);
      expect(result.passed).toBe(1);
    });

    test("a concurrent test whose timeout bun reads as none (under 1 ms) or as its longest (past setTimeout's range) passes, as on 0.4.0", async () => {
      const result = await run(entry, "./out-of-range.ts", { dir: "concurrent" });
      expect(result.exitCode).toBe(0);
      expect(result.broken).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(result.passed).toBe(5);
      expect(result.lines).not.toContain("hung");
    });

    test("a concurrent test is interrupted on the clock bun starts when it enters the test, synchronous work included", async () => {
      const result = await run(entry, "./sync-prefix.ts", { dir: "concurrent" });
      expect(result.broken).toEqual([]);
      expect(result.failed).toEqual([
        "(fail) a concurrent test with a synchronous prefix > prefix",
      ]);
      expect(result.released).toBe("released by then: prefix");
    });

    test("a thunk that throws is reported at its own line, not the runner's", async () => {
      const result = await run(entry, "./thunk-throws.ts");
      expect(result.failed).toEqual(["(fail) a thunk that throws > throws"]);
      expect(result.lines.some((line) => /thunk-throws\.ts:7:\d+/.test(line))).toBe(true);
    });

    test("a concurrent test under bun's --timeout alone runs on as it did in 0.4.0", async () => {
      const result = await run(entry, "./no-deadline.ts", {
        dir: "concurrent",
        args: ["--timeout", "200"],
      });
      expect(result.broken).toEqual([]);
      expect(result.failed).toEqual([
        "(fail) a concurrent test with no deadline the runner holds > scoped",
      ]);
      expect(result.released).toBe("released by then:");
      expect(result.passed).toBe(1);
    });

    test("a runner's .serial form in a concurrent file runs alone: interrupted, its finalizers run before the next test starts", async () => {
      const result = await run(entry, "./serial.ts", { dir: "concurrent" });
      expect(result.broken).toEqual([]);
      expect(result.ordered).toEqual(
        ["scoped", "effect", "scopedLive", "live"].flatMap((name) => [
          `acquired ${name}`,
          `released ${name}`,
          `(fail) a serial test in a concurrent file > ${name}`,
          `ran after ${name}`,
        ]),
      );
    });

    test("every runner passes and times out in a describe.concurrent block as in a concurrent file", async () => {
      const result = await run(entry, "./describe-concurrent.ts");
      expect(result.broken).toEqual([]);
      expect(result.failed).toEqual(
        [
          "(fail) passing in describe.concurrent > fails",
          ...timedOut("timed out in describe.concurrent"),
        ].sort(),
      );
      expect(result.released).toBe(ALL_RELEASED);
      expect(result.passed).toBe(9);
    });
  });
