// Cases the fixtures register, each where its fixture puts it: a plain file,
// a file bun runs concurrently (`concurrent/bunfig.toml`), a
// `describe.concurrent`. Each says what it did on stderr, where bun reports,
// so the order of the two reads in one stream.
import { Effect, Layer } from "effect";
import { it } from "./entry.js";

export const say = (line: string) => Effect.sync(() => console.error(line));

/** Resources that say when they are taken, and keep a list of those released. */
export const resources = () => {
  const released: Array<string> = [];
  return {
    held: (name: string) =>
      Effect.acquireRelease(say(`acquired ${name}`), () =>
        Effect.andThen(
          Effect.sync(() => released.push(name)),
          say(`released ${name}`),
        ),
      ),
    /** A test that outlives the others' deadlines, then says what was released by then. */
    report: (name: string, after: number) =>
      it.live(
        name,
        () =>
          Effect.andThen(
            Effect.sleep(`${after} millis`),
            Effect.suspend(() => say(`released by then: ${[...released].sort().join(" ")}`)),
          ),
        5000,
      ),
  };
};

/** Every runner, each layer form, and a failure, which still fails. */
export const passing = () => {
  const released = (name: string) =>
    Effect.acquireRelease(Effect.void, () => say(`released ${name}`));
  it.effect("effect", () => say("ran effect"));
  it.scoped("scoped", () => Effect.andThen(released("scoped"), say("ran scoped")));
  it.live("live", () => Effect.andThen(Effect.sleep("10 millis"), say("ran live")));
  it.scopedLive("scopedLive", () =>
    Effect.andThen(released("scopedLive"), Effect.sleep("10 millis")),
  );
  it.effect.layer(Layer.empty)("effect.layer", () => say("ran effect.layer"));
  it.scoped.layer(Layer.empty)("scoped.layer", () => say("ran scoped.layer"));
  it.live.layer(Layer.empty)("live.layer", () => say("ran live.layer"));
  it.scopedLive.layer(Layer.empty)("scopedLive.layer", () => say("ran scopedLive.layer"));
  it.live("fails", () => Effect.fail("boom"));
};

/**
 * Every runner holds a resource and never ends, under a deadline the runner
 * holds: its own `timeout`, or (`default`) effect-bun-test's
 * `setDefaultTimeout`, which the fixture sets. The TestClock never moves on
 * its own, so only a real-time deadline ends `effect`.
 */
export const timingOut = () => {
  const { held, report } = resources();
  it.scoped("scoped", () => Effect.andThen(held("scoped"), Effect.never), 200);
  it.effect(
    "effect",
    () => Effect.scoped(Effect.andThen(held("effect"), Effect.sleep("1 hour"))),
    200,
  );
  it.scopedLive("scopedLive", () => Effect.andThen(held("scopedLive"), Effect.never), 200);
  it.live("live", () => Effect.scoped(Effect.andThen(held("live"), Effect.never)), 200);
  it.scopedLive("default", () => Effect.andThen(held("default"), Effect.never));
  report("still running after their deadlines", 800);
};
