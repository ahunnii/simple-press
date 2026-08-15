import { describe, expect, it } from "vitest";

import { getInviteStatus, getTestimonialStatus } from "./testimonials";

/**
 * `getTestimonialStatus` returns the display status of a testimonial for the
 * admin Testimonials list. Priority is **hidden ▸ published ▸ pending**,
 * checked in that order — hidden wins even when `isApproved` is true, per
 * the ordering documented on the `Testimonial` model in schema.prisma.
 */
describe("getTestimonialStatus", () => {
  it("returns 'hidden' when isApproved=true and isHidden=true (hidden outranks approved)", () => {
    const testimonial = { isApproved: true, isHidden: true };
    expect(getTestimonialStatus(testimonial)).toBe("hidden");
  });

  it("returns 'hidden' when isApproved=false and isHidden=true", () => {
    const testimonial = { isApproved: false, isHidden: true };
    expect(getTestimonialStatus(testimonial)).toBe("hidden");
  });

  it("returns 'published' when isApproved=true and isHidden=false", () => {
    const testimonial = { isApproved: true, isHidden: false };
    expect(getTestimonialStatus(testimonial)).toBe("published");
  });

  it("returns 'pending' when isApproved=false and isHidden=false", () => {
    const testimonial = { isApproved: false, isHidden: false };
    expect(getTestimonialStatus(testimonial)).toBe("pending");
  });
});

/**
 * `getInviteStatus` returns the display status of a testimonial invite for
 * the admin Testimonials "invites" tab. Priority is
 * **completed ▸ expired ▸ pending**, checked in that order — `used` wins
 * outright regardless of `expiresAt`.
 *
 * All tests use a fixed `now` and derive past/future dates from it. The
 * boundary test covers the `cancelInvite` soft-expire contract: cancelling
 * an invite sets `expiresAt = now`, and the comparison must be `<=` so the
 * invite reads "expired" immediately, not on some later render.
 */
describe("getInviteStatus", () => {
  const now = new Date("2026-08-07T12:00:00Z");
  const pastDate = new Date("2026-08-06T12:00:00Z"); // One day before now
  const futureDate = new Date("2026-08-08T12:00:00Z"); // One day after now

  describe("completed invites", () => {
    it("returns 'completed' when used=true and expiresAt is in the future", () => {
      const invite = { used: true, expiresAt: futureDate };
      expect(getInviteStatus(invite, now)).toBe("completed");
    });

    it("returns 'completed' (not 'expired') when used=true and expiresAt is in the past", () => {
      const invite = { used: true, expiresAt: pastDate };
      expect(getInviteStatus(invite, now)).toBe("completed");
    });
  });

  describe("pending invites", () => {
    it("returns 'pending' when used=false and expiresAt is in the future", () => {
      const invite = { used: false, expiresAt: futureDate };
      expect(getInviteStatus(invite, now)).toBe("pending");
    });
  });

  describe("expired invites", () => {
    it("returns 'expired' when used=false and expiresAt is in the past", () => {
      const invite = { used: false, expiresAt: pastDate };
      expect(getInviteStatus(invite, now)).toBe("expired");
    });
  });

  describe("boundary: expiresAt exactly equal to now (cancelInvite soft-expire contract)", () => {
    it("returns 'expired' (not 'pending') when used=false and expiresAt equals now", () => {
      const invite = { used: false, expiresAt: now };
      expect(getInviteStatus(invite, now)).toBe("expired");
    });
  });
});
