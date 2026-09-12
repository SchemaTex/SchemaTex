import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("publishes the supported SDK entry points", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  expect(Object.keys(pkg.exports)).toEqual(
    expect.arrayContaining([".", "./react", "./interactive", "./ai", "./ai/sdk"]),
  );
});
