import { describe, expect, it } from "vitest";

import {
  MANUAL_REASONS,
  ORDER_LEDGER_REASONS,
  REASON_LABELS,
  reasonLabel,
} from "./reasons";

describe("inventory reasons", () => {
  it("no manual reason is a sales-counting reason (sale / oversell)", () => {
    // poolSalesWhere counts `sale` and `oversell` rows as sales. A manual
    // movement using either would silently change sales totals.
    const manual: readonly string[] = MANUAL_REASONS;
    expect(manual).not.toContain("sale");
    expect(manual).not.toContain("oversell");
  });

  it("every reason has a label", () => {
    for (const r of [...ORDER_LEDGER_REASONS, ...MANUAL_REASONS]) {
      expect(REASON_LABELS[r], r).toBeTruthy();
      expect(reasonLabel(r)).toBe(REASON_LABELS[r]);
    }
  });

  it("reasonLabel title-cases unknown reasons", () => {
    expect(reasonLabel("write_off")).toBe("Write Off");
    expect(reasonLabel("mystery")).toBe("Mystery");
    expect(reasonLabel("")).toBe("");
  });
});
