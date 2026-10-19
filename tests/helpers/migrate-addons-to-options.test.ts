import { describe, expect, it } from "vitest";

import {
  chainRules,
  charmRules,
  dbHostPort,
  describeRules,
  manifestStamp,
  parseArgs,
} from "../../scripts/glove/migrate-addons-lib";

describe("migrate-addons-to-options parseArgs", () => {
  it("defaults to today's behavior", () => {
    const a = parseArgs(["luvgluv"]);
    expect(a).toMatchObject({
      target: "luvgluv",
      apply: false,
      includedCount: 0,
      chainRequired: false,
      charmsMin: 0,
      charmsMax: 3,
      chainsSlug: null,
      charmsSlug: null,
      undo: null,
    });
  });

  it("parses every flag (space and = forms)", () => {
    const a = parseArgs([
      "demo",
      "--apply",
      "--chain-required",
      "--charms-min",
      "1",
      "--charms-max=2",
      "--included-count",
      "1",
      "--chains-slug",
      "c1",
      "--charms-slug=c2",
    ]);
    expect(a).toMatchObject({
      apply: true,
      chainRequired: true,
      charmsMin: 1,
      charmsMax: 2,
      includedCount: 1,
      chainsSlug: "c1",
      charmsSlug: "c2",
    });
  });

  it.each([
    [["x", "--charms-min", "4"]],
    [["x", "--charms-min", "-1"]],
    [["x", "--charms-min", "1.5"]],
    [["x", "--charms-min", "abc"]],
    [["x", "--charms-min"]],
    [["x", "--charms-max", "0"]],
    [["x", "--charms-max", "4"]],
    [["x", "--included-count", "4"]],
    [["x", "--nope"]],
    [["x", "y"]],
    [[]],
  ])("rejects %j", (argv) => {
    expect(() => parseArgs(argv)).toThrow();
  });

  it("rejects min > max", () => {
    expect(() =>
      parseArgs(["x", "--charms-min", "3", "--charms-max", "2"]),
    ).toThrow(/cannot be greater than --charms-max/);
  });

  it("rejects included-count above charms-max", () => {
    expect(() =>
      parseArgs(["x", "--charms-max", "1", "--included-count", "2"]),
    ).toThrow(/--included-count/);
  });

  it("allows --undo without a target, but not a bare empty call", () => {
    expect(parseArgs(["--undo", "m.json", "--apply"])).toMatchObject({
      undo: "m.json",
      apply: true,
      target: "",
    });
    expect(() => parseArgs(["--apply"])).toThrow();
  });
});

describe("migrate-addons-to-options rule mapping", () => {
  it("chain is optional pick-1 by default, required min 1 with the flag", () => {
    expect(chainRules({ chainRequired: false })).toEqual({
      required: false,
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
    });
    expect(chainRules({ chainRequired: true })).toEqual({
      required: true,
      minSelections: 1,
      maxSelections: 1,
      includedCount: 0,
    });
  });

  it("charms are required exactly when min > 0", () => {
    expect(
      charmRules({ charmsMin: 0, charmsMax: 3, includedCount: 0 }),
    ).toEqual({
      required: false,
      minSelections: 0,
      maxSelections: 3,
      includedCount: 0,
    });
    expect(
      charmRules({ charmsMin: 1, charmsMax: 3, includedCount: 1 }),
    ).toEqual({
      required: true,
      minSelections: 1,
      maxSelections: 3,
      includedCount: 1,
    });
    expect(
      charmRules({ charmsMin: 2, charmsMax: 2, includedCount: 0 }).required,
    ).toBe(true);
  });

  it("describes rules for the report", () => {
    expect(describeRules(chainRules({ chainRequired: true }))).toBe(
      "required, pick exactly 1, includedCount=0",
    );
    expect(
      describeRules(
        charmRules({ charmsMin: 0, charmsMax: 3, includedCount: 1 }),
      ),
    ).toBe("optional, pick 0-3, includedCount=1");
  });
});

describe("migrate-addons-to-options helpers", () => {
  it("never leaks credentials in the DB label", () => {
    const label = dbHostPort("postgres://user:s3cret@db.example.com:6543/app");
    expect(label).toBe("db.example.com:6543");
    expect(label).not.toMatch(/s3cret|user/);
    expect(dbHostPort("postgres://u:p@h/db")).toBe("h:5432");
    expect(dbHostPort(undefined)).toMatch(/not set/);
    expect(dbHostPort("not a url")).not.toMatch(/not a url/);
  });

  it("makes a filename-safe manifest stamp", () => {
    expect(manifestStamp(new Date("2026-10-19T17:22:17.062Z"))).toBe(
      "2026-10-19T17-22-17-062Z",
    );
  });
});
