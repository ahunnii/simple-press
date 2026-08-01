import { describe, expect, it } from "vitest";

import {
  assertDisposableTestDatabase,
  findTestDatabaseProblems,
} from "./assert-test-database";

/**
 * These cases are not hypothetical. Each "rejects" case below is a DSN shape
 * that really exists in or around this repo, and each one would have been
 * handed to `prisma db push --accept-data-loss` by the pre-guard global-setup.
 */
describe("findTestDatabaseProblems", () => {
  it("accepts the canonical local test DSN", () => {
    expect(
      findTestDatabaseProblems(
        "postgresql://test:test@localhost:5436/simplepress_test",
      ),
    ).toEqual([]);
  });

  it("accepts the historical 5433 port — the port is not what makes it safe", () => {
    // Worth pinning: this guard deliberately does NOT check the port. A wrong
    // port is a connection problem; a wrong database NAME or HOST is a data-loss
    // problem. Only the latter two are safety properties.
    expect(
      findTestDatabaseProblems(
        "postgresql://test:test@127.0.0.1:5433/simplepress_test",
      ),
    ).toEqual([]);
  });

  it("rejects the real .env DSN shape — remote host, database named `postgres`", () => {
    // Both .env and .env.local in this repo resolve to a remote server whose
    // database is literally named `postgres`. Nothing about that string looks
    // alarming at a glance, which is the whole reason this guard exists.
    const problems = findTestDatabaseProblems(
      "postgresql://user:pw@db.example.com:7676/postgres",
    );

    expect(problems).toHaveLength(2);
    expect(problems.join(" ")).toContain('"postgres" does not end in "_test"');
    expect(problems.join(" ")).toContain("is not loopback");
  });

  it("rejects a local database that is not name-suffixed _test", () => {
    const problems = findTestDatabaseProblems(
      "postgresql://test:test@localhost:5432/simplepress",
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('does not end in "_test"');
  });

  it("rejects a remote host even when the database name looks like a test DB", () => {
    const problems = findTestDatabaseProblems(
      "postgresql://test:test@10.0.0.5:5432/simplepress_test",
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("is not loopback");
  });

  it("waives the host check under ALLOW_REMOTE_TEST_DB but never the name check", () => {
    expect(
      findTestDatabaseProblems(
        "postgresql://test:test@postgres:5432/simplepress_test",
        { allowRemote: true },
      ),
    ).toEqual([]);

    // The escape hatch must not become a way to target a production database.
    const stillRejected = findTestDatabaseProblems(
      "postgresql://user:pw@db.example.com:5432/postgres",
      { allowRemote: true },
    );
    expect(stillRejected).toHaveLength(1);
    expect(stillRejected[0]).toContain('does not end in "_test"');
  });

  it("rejects a DSN with no database name", () => {
    expect(
      findTestDatabaseProblems("postgresql://test:test@localhost:5436"),
    ).toContainEqual(expect.stringContaining("no database name"));
  });

  it("rejects unparseable input instead of guessing", () => {
    expect(findTestDatabaseProblems("not a url")).toHaveLength(1);
  });
});

describe("assertDisposableTestDatabase", () => {
  it("throws when DATABASE_URL is unset", () => {
    // Must go through process.env rather than passing `undefined`: the
    // parameter has a default, and JS applies defaults to explicit `undefined`,
    // so `assertDisposableTestDatabase(undefined)` would silently read the env
    // var instead of testing the unset path.
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      expect(() => assertDisposableTestDatabase()).toThrow(
        /DATABASE_URL is not set/,
      );
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it("does not leak credentials from the DSN into the error message", () => {
    // The message is printed to stdout and CI logs.
    let message = "";
    try {
      assertDisposableTestDatabase(
        "postgresql://admin:sup3rs3cr3t@db.example.com:7676/postgres",
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).not.toContain("sup3rs3cr3t");
    expect(message).not.toContain("admin");
    expect(message).toContain("accept-data-loss");
  });

  it("passes silently for a valid disposable test DSN", () => {
    expect(() =>
      assertDisposableTestDatabase(
        "postgresql://test:test@localhost:5436/simplepress_test",
      ),
    ).not.toThrow();
  });
});
