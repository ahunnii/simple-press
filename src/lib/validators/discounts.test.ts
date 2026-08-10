import { describe, expect, it } from "vitest";

import { getDiscountStatus } from "./discounts";

/**
 * `getDiscountStatus` returns the mechanical state of a discount code for the
 * admin Discounts list. Priority is **expired ▸ inactive ▸ scheduled ▸ active**,
 * checked in that order. The `expiresAt < now` / `startsAt > now` comparisons
 * are raw-instant (not calendar-day), matching the materializer's rule.
 *
 * All tests use a fixed `now` and derive past/future dates from it to ensure
 * boundary conditions and priority ordering are correct.
 */
describe("getDiscountStatus", () => {
  const now = new Date("2026-08-07T12:00:00Z");
  const pastDate = new Date("2026-08-06T12:00:00Z"); // One day before now
  const futureDate = new Date("2026-08-08T12:00:00Z"); // One day after now

  describe("active discount with no date constraints", () => {
    it("returns 'active' when active=true and no dates are set", () => {
      const discount = {
        active: true,
        startsAt: null,
        expiresAt: null,
      };
      expect(getDiscountStatus(discount, now)).toBe("active");
    });
  });

  describe("inactive discount with no date constraints", () => {
    it("returns 'inactive' when active=false and no dates are set", () => {
      const discount = {
        active: false,
        startsAt: null,
        expiresAt: null,
      };
      expect(getDiscountStatus(discount, now)).toBe("inactive");
    });
  });

  describe("scheduled discounts", () => {
    it("returns 'scheduled' when active=true and startsAt is in the future", () => {
      const discount = {
        active: true,
        startsAt: futureDate,
        expiresAt: null,
      };
      expect(getDiscountStatus(discount, now)).toBe("scheduled");
    });

    it("returns 'inactive' (not 'scheduled') when active=false and startsAt is in the future", () => {
      const discount = {
        active: false,
        startsAt: futureDate,
        expiresAt: null,
      };
      expect(getDiscountStatus(discount, now)).toBe("inactive");
    });
  });

  describe("expired discounts", () => {
    it("returns 'expired' when expiresAt is in the past, even if active=true", () => {
      const discount = {
        active: true,
        startsAt: null,
        expiresAt: pastDate,
      };
      expect(getDiscountStatus(discount, now)).toBe("expired");
    });

    it("returns 'expired' when expiresAt is in the past and active=false", () => {
      const discount = {
        active: false,
        startsAt: null,
        expiresAt: pastDate,
      };
      expect(getDiscountStatus(discount, now)).toBe("expired");
    });

    it("returns 'expired' (not 'scheduled') when expiresAt is past and startsAt is future", () => {
      const discount = {
        active: true,
        startsAt: futureDate,
        expiresAt: pastDate,
      };
      expect(getDiscountStatus(discount, now)).toBe("expired");
    });
  });

  describe("boundary: expiresAt equal to now", () => {
    it("returns 'active' when expiresAt equals now (strict < rule means not expired)", () => {
      const discount = {
        active: true,
        startsAt: null,
        expiresAt: now,
      };
      expect(getDiscountStatus(discount, now)).toBe("active");
    });
  });

  describe("boundary: startsAt equal to now", () => {
    it("returns 'active' when startsAt equals now (strict > rule means not scheduled)", () => {
      const discount = {
        active: true,
        startsAt: now,
        expiresAt: null,
      };
      expect(getDiscountStatus(discount, now)).toBe("active");
    });
  });

  describe("discounts with past start dates", () => {
    it("returns 'active' when active=true and startsAt is in the past", () => {
      const discount = {
        active: true,
        startsAt: pastDate,
        expiresAt: null,
      };
      expect(getDiscountStatus(discount, now)).toBe("active");
    });
  });

  describe("discounts with future expiry dates", () => {
    it("returns 'active' when active=true and expiresAt is in the future", () => {
      const discount = {
        active: true,
        startsAt: null,
        expiresAt: futureDate,
      };
      expect(getDiscountStatus(discount, now)).toBe("active");
    });
  });

  describe("discounts with both start and expiry dates", () => {
    it("returns 'active' when active=true with valid start and expiry windows", () => {
      const discount = {
        active: true,
        startsAt: pastDate,
        expiresAt: futureDate,
      };
      expect(getDiscountStatus(discount, now)).toBe("active");
    });

    it("returns 'scheduled' when active=true with a future start and future expiry", () => {
      const farFutureDate = new Date("2026-08-09T12:00:00Z");
      const discount = {
        active: true,
        startsAt: futureDate,
        expiresAt: farFutureDate,
      };
      expect(getDiscountStatus(discount, now)).toBe("scheduled");
    });
  });

  describe("priority ordering", () => {
    it("prefers 'expired' over 'inactive' (expired wins)", () => {
      const discount = {
        active: false,
        startsAt: null,
        expiresAt: pastDate,
      };
      expect(getDiscountStatus(discount, now)).toBe("expired");
    });

    it("prefers 'inactive' over 'scheduled' when active=false", () => {
      const discount = {
        active: false,
        startsAt: futureDate,
        expiresAt: null,
      };
      expect(getDiscountStatus(discount, now)).toBe("inactive");
    });
  });
});
