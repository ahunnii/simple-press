import { describe, expect, it } from "vitest";

import { MERCHANT_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { getMerchantTermsStatus } from "~/lib/legal/terms-status";

const OLD_VERSION = "2000-01-01";
const UPDATE_ID = "2027-01-merchant-fees";
const FIRST = new Date("2026-01-02T03:04:05.000Z");
const LATER = new Date("2026-06-01T00:00:00.000Z");
const ACK = new Date("2027-01-05T12:00:00.000Z");

const owner = (
  userId: string,
  merchantTermsAcceptedAt: Date | null,
  merchantTermsVersion: string | null,
) => ({ userId, merchantTermsAcceptedAt, merchantTermsVersion });

describe("getMerchantTermsStatus — columns only", () => {
  it("is none with no owners", () => {
    expect(getMerchantTermsStatus([])).toEqual({ state: "none" });
  });

  it("is none when no owner has accepted", () => {
    expect(getMerchantTermsStatus([owner("u1", null, null)])).toEqual({
      state: "none",
    });
  });

  it("is current when any owner accepted the current version", () => {
    expect(
      getMerchantTermsStatus([
        owner("u1", LATER, OLD_VERSION),
        owner("u2", FIRST, MERCHANT_TERMS_VERSION),
      ]),
    ).toEqual({
      state: "current",
      acceptedAt: FIRST,
      version: MERCHANT_TERMS_VERSION,
      via: "column",
    });
  });

  it("is outdated with the most recent stale acceptance otherwise", () => {
    expect(
      getMerchantTermsStatus([
        owner("u1", FIRST, OLD_VERSION),
        owner("u2", LATER, "2001-01-01"),
      ]),
    ).toEqual({ state: "outdated", acceptedAt: LATER, version: "2001-01-01" });
  });

  it("works without userId (legacy callers)", () => {
    expect(
      getMerchantTermsStatus([
        { merchantTermsAcceptedAt: FIRST, merchantTermsVersion: OLD_VERSION },
      ]),
    ).toEqual({ state: "outdated", acceptedAt: FIRST, version: OLD_VERSION });
  });
});

describe("getMerchantTermsStatus — with the PolicyAcceptance log", () => {
  it("counts a notice-ack of the latest material update as current", () => {
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, OLD_VERSION)], {
        latestUpdateId: UPDATE_ID,
        latestUpdateAnnouncedOn: null,
        rows: [{ userId: "u1", version: UPDATE_ID, acceptedAt: ACK }],
      }),
    ).toEqual({
      state: "current",
      acceptedAt: ACK,
      version: UPDATE_ID,
      via: "log",
    });
  });

  it("counts a clickwrap row at the current version as current", () => {
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, OLD_VERSION)], {
        latestUpdateId: null,
        latestUpdateAnnouncedOn: null,
        rows: [
          { userId: "u1", version: MERCHANT_TERMS_VERSION, acceptedAt: ACK },
        ],
      }),
    ).toMatchObject({ state: "current", via: "log", acceptedAt: ACK });
  });

  it("ignores an ack of an older (superseded) update", () => {
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, OLD_VERSION)], {
        latestUpdateId: UPDATE_ID,
        latestUpdateAnnouncedOn: null,
        rows: [{ userId: "u1", version: "2026-06-older", acceptedAt: ACK }],
      }),
    ).toMatchObject({ state: "outdated" });
  });

  it("ignores update-id rows when no material update is announced", () => {
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, OLD_VERSION)], {
        latestUpdateId: null,
        latestUpdateAnnouncedOn: null,
        rows: [{ userId: "u1", version: UPDATE_ID, acceptedAt: ACK }],
      }),
    ).toMatchObject({ state: "outdated" });
  });

  it("ignores rows from users who are not an owner with an acceptance on file", () => {
    expect(
      getMerchantTermsStatus(
        [owner("u1", FIRST, OLD_VERSION), owner("u2", null, null)],
        {
          latestUpdateId: UPDATE_ID,
          latestUpdateAnnouncedOn: null,
          rows: [
            { userId: "u2", version: UPDATE_ID, acceptedAt: ACK },
            { userId: "stranger", version: UPDATE_ID, acceptedAt: ACK },
          ],
        },
      ),
    ).toMatchObject({ state: "outdated" });
  });

  it("never upgrades none — an ack is not a first signature", () => {
    expect(
      getMerchantTermsStatus([owner("u1", null, null)], {
        latestUpdateId: UPDATE_ID,
        latestUpdateAnnouncedOn: null,
        rows: [{ userId: "u1", version: UPDATE_ID, acceptedAt: ACK }],
      }),
    ).toEqual({ state: "none" });
  });

  it("prefers the column when it is already current", () => {
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, MERCHANT_TERMS_VERSION)], {
        latestUpdateId: UPDATE_ID,
        latestUpdateAnnouncedOn: null,
        rows: [{ userId: "u1", version: UPDATE_ID, acceptedAt: ACK }],
      }),
    ).toMatchObject({ state: "current", via: "column", acceptedAt: FIRST });
  });
});

describe("getMerchantTermsStatus — clickwrap after a material update", () => {
  const ANNOUNCED = "2027-01-05";
  const log = {
    latestUpdateId: UPDATE_ID,
    latestUpdateAnnouncedOn: ANNOUNCED,
    rows: [],
  };

  it("counts a column version on/after announcedOn as current even if a later typo bump moved the version on", () => {
    // MERCHANT_TERMS_VERSION is whatever the pages say today; the owner
    // clickwrapped on the day of the announcement, which is not that version.
    expect(getMerchantTermsStatus([owner("u1", ACK, ANNOUNCED)], log)).toEqual({
      state: "current",
      acceptedAt: ACK,
      version: ANNOUNCED,
      via: "column",
    });
  });

  it("still flags an owner whose column version predates the announcement", () => {
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, "2027-01-04")], log),
    ).toMatchObject({ state: "outdated", version: "2027-01-04" });
  });

  it("keeps the exact-version rule when no material merchant update exists", () => {
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, "2099-01-01")], {
        latestUpdateId: null,
        latestUpdateAnnouncedOn: null,
        rows: [],
      }),
    ).toMatchObject({ state: "outdated" });
    expect(
      getMerchantTermsStatus([owner("u1", FIRST, "2099-01-01")]),
    ).toMatchObject({ state: "outdated" });
  });

  it("picks the most recent covering owner", () => {
    expect(
      getMerchantTermsStatus(
        [owner("u1", FIRST, ANNOUNCED), owner("u2", ACK, "2027-01-20")],
        log,
      ),
    ).toMatchObject({ state: "current", acceptedAt: ACK, via: "column" });
  });

  it("never upgrades none", () => {
    expect(getMerchantTermsStatus([owner("u1", null, ANNOUNCED)], log)).toEqual(
      { state: "none" },
    );
  });
});
