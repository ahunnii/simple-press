import { describe, expect, it } from "vitest";

import {
  resolveUmscFulfillmentLine,
  UMSC_FULFILLMENT_LINE_DEFAULT,
} from "./umsc-fulfillment-line";

describe("resolveUmscFulfillmentLine", () => {
  const d = UMSC_FULFILLMENT_LINE_DEFAULT;

  it("builds the sentence from settings while the line is the default", () => {
    expect(resolveUmscFulfillmentLine(d, {})).toBe(
      "We ship your order right to your door.",
    );
    expect(resolveUmscFulfillmentLine(d, { offersInStorePickup: true })).toBe(
      "Local pickup and shipping are available.",
    );
    expect(resolveUmscFulfillmentLine(d, { offersLocalDelivery: true })).toBe(
      "Local delivery and shipping are available.",
    );
    expect(
      resolveUmscFulfillmentLine(d, {
        offersInStorePickup: true,
        offersLocalDelivery: true,
      }),
    ).toBe("Local pickup, local delivery and shipping are available.");
  });

  it("keeps owner text and a blank (hidden) line as typed", () => {
    expect(
      resolveUmscFulfillmentLine("Pickup Saturdays only.", {
        offersInStorePickup: true,
      }),
    ).toBe("Pickup Saturdays only.");
    expect(resolveUmscFulfillmentLine("", { offersInStorePickup: true })).toBe(
      "",
    );
  });
});
