/**
 * Safety guard for destructive test bootstrapping.
 *
 * `tests/helpers/global-setup.ts` runs
 * `prisma db push --skip-generate --accept-data-loss` against whatever
 * `DATABASE_URL` happens to be in the environment. That command silently drops
 * columns and tables to make the target match `schema.prisma` — it is exactly
 * what you want against a disposable container, and catastrophic against
 * anything else.
 *
 * The realistic ways this goes wrong are not exotic:
 *   - a shell that already exported a real `DATABASE_URL`
 *   - a tool that auto-loads `.env` (this repo's `.env` and `.env.local` both
 *     point at REMOTE servers, and the database there is named `postgres` —
 *     not something obviously production-shaped that a human would catch)
 *   - the configured test port being occupied by an unrelated project's
 *     Postgres, which has genuinely happened on a dev machine here
 *
 * So rather than trusting the DSN, we assert two independent properties that a
 * throwaway test database always has and a real one essentially never does:
 * the database NAME ends in `_test`, and the HOST is loopback. Either check
 * alone would have caught the misdirected-push scenarios above; requiring both
 * means a single wrong value can't slip through.
 *
 * This is deliberately a hard failure with no "continue anyway" prompt. A test
 * run that cannot find its sandbox should stop, not improvise.
 */

/** Hostnames we accept as "this machine". */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);

/**
 * Set `ALLOW_REMOTE_TEST_DB=1` to waive the loopback requirement.
 *
 * This exists for CI runners that reach Postgres over a service hostname
 * (e.g. `postgres` on a Docker network) rather than loopback. It deliberately
 * does NOT waive the `_test` database-name requirement — that one is never
 * legitimate to skip, and keeping it unwaivable means this escape hatch cannot
 * be used to point the suite at a production database.
 */
const REMOTE_OPT_OUT = "ALLOW_REMOTE_TEST_DB";

export type TestDatabaseProblem = string;

/**
 * Returns the reasons `dsn` does not look like a disposable test database.
 * Empty array means it passed. Exported separately from the throwing wrapper
 * so it can be unit-tested without manipulating `process.env`.
 */
export function findTestDatabaseProblems(
  dsn: string,
  opts: { allowRemote?: boolean } = {},
): TestDatabaseProblem[] {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return [`DATABASE_URL is not a parseable URL: ${JSON.stringify(dsn)}`];
  }

  const problems: TestDatabaseProblem[] = [];

  // Leading slash only — a bare `/name`. Anything deeper isn't a Postgres DSN
  // shape we recognise, and we'd rather reject than guess.
  const databaseName = url.pathname.replace(/^\//, "");

  if (!databaseName) {
    problems.push("no database name in DATABASE_URL");
  } else if (!databaseName.endsWith("_test")) {
    problems.push(
      `database name "${databaseName}" does not end in "_test" — refusing to ` +
        `run a destructive schema push against it`,
    );
  }

  if (!opts.allowRemote && !LOCAL_HOSTS.has(url.hostname)) {
    problems.push(
      `host "${url.hostname}" is not loopback — refusing to run a destructive ` +
        `schema push against a remote server (set ${REMOTE_OPT_OUT}=1 if this ` +
        `is a CI service host)`,
    );
  }

  return problems;
}

/**
 * Throws unless `DATABASE_URL` looks like a disposable test database.
 * Called by `global-setup.ts` immediately before the destructive push.
 */
export function assertDisposableTestDatabase(
  databaseUrl = process.env.DATABASE_URL,
): void {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Integration tests need a disposable test " +
        "database — see docs/testing.md.",
    );
  }

  const problems = findTestDatabaseProblems(databaseUrl, {
    allowRemote: process.env[REMOTE_OPT_OUT] === "1",
  });

  if (problems.length === 0) return;

  // Never interpolate the DSN itself — it carries credentials, and this
  // message goes to stdout and CI logs.
  throw new Error(
    [
      "",
      "Refusing to run `prisma db push --accept-data-loss`.",
      "",
      "The configured DATABASE_URL does not look like a disposable test database:",
      ...problems.map((p) => `  - ${p}`),
      "",
      "That command drops tables and columns to match schema.prisma. Pointing it",
      "at a real database would destroy data.",
      "",
      "Start the test database and point at it explicitly, e.g.:",
      "  pnpm test:db:up",
      '  DATABASE_URL="postgresql://test:test@localhost:5436/simplepress_test" pnpm test',
      "",
      "See docs/testing.md.",
      "",
    ].join("\n"),
  );
}
