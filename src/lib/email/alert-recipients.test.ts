import { describe, expect, it } from "vitest";

import {
  dedupeAlertRecipients,
  getBusinessAlertRecipients,
} from "./alert-recipients";

describe("dedupeAlertRecipients", () => {
  it("keeps order, drops null/empty/blank and dedupes case-insensitively", () => {
    expect(
      dedupeAlertRecipients([
        "Owner@Shop.com",
        null,
        "",
        "  ",
        "manager@shop.com",
        "owner@shop.COM",
        undefined,
        " manager@shop.com ",
      ]),
    ).toEqual(["Owner@Shop.com", "manager@shop.com"]);
  });

  it("returns an empty list when nothing usable is given", () => {
    expect(dedupeAlertRecipients([null, undefined, ""])).toEqual([]);
  });
});

describe("getBusinessAlertRecipients", () => {
  it("puts ownerEmail first, then members, deduped", async () => {
    const db = {
      businessMembership: {
        findMany: () =>
          Promise.resolve([
            { user: { email: "OWNER@shop.com" } },
            { user: { email: "mgr@shop.com" } },
            { user: { email: null } },
          ]),
      },
    };
    await expect(
      getBusinessAlertRecipients(db, "biz_1", "owner@shop.com"),
    ).resolves.toEqual(["owner@shop.com", "mgr@shop.com"]);
  });

  it("only asks for OWNER and MANAGER members of that business", async () => {
    let args: unknown;
    const db = {
      businessMembership: {
        findMany: (a: unknown) => {
          args = a;
          return Promise.resolve([]);
        },
      },
    };
    await getBusinessAlertRecipients(db as never, "biz_1", "o@shop.com");
    expect(args).toMatchObject({
      where: { businessId: "biz_1", role: { in: ["OWNER", "MANAGER"] } },
    });
  });

  it("falls back to ownerEmail alone when the read fails", async () => {
    const db = {
      businessMembership: {
        findMany: () => Promise.reject(new Error("db down")),
      },
    };
    await expect(
      getBusinessAlertRecipients(db, "biz_1", "owner@shop.com"),
    ).resolves.toEqual(["owner@shop.com"]);
  });
});
