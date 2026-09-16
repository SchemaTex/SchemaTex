import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Anything importable from outside the package is a promise to its consumers.
// Dropping one of these subpaths breaks every app that imports it, and nothing
// else in the suite would notice.
it("publishes the supported SDK entry points", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  expect(Object.keys(pkg.exports)).toEqual(
    expect.arrayContaining([".", "./react", "./interactive", "./ai", "./ai/sdk"]),
  );
});
