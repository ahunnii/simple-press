import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatFromAddress, sendEmail } from "./send";

const mocks = vi.hoisted(() => ({
  sendResendEmail: vi.fn(),
}));

vi.mock("~/env", () => ({ env: {} }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("./resend", () => ({ sendResendEmail: mocks.sendResendEmail }));

const ADDRESS = "noreply@test.dev";

describe("formatFromAddress", () => {
  it("quotes a plain display name", () => {
    expect(formatFromAddress("Bloom & Co via SimplePress", ADDRESS)).toBe(
      '"Bloom & Co via SimplePress" <noreply@test.dev>',
    );
  });

  it("quotes a name containing a comma", () => {
    expect(
      formatFromAddress("Smith, Jones & Co via SimplePress", ADDRESS),
    ).toBe('"Smith, Jones & Co via SimplePress" <noreply@test.dev>');
  });

  it("escapes double quotes and backslashes inside the name", () => {
    expect(
      formatFromAddress('Joe "the Shop" \\ Co via SimplePress', ADDRESS),
    ).toBe('"Joe \\"the Shop\\" \\\\ Co via SimplePress" <noreply@test.dev>');
  });

  it("neutralizes a CRLF header-injection attempt", () => {
    const result = formatFromAddress(
      "Acme\r\nBcc: victim@evil.test\r\nX-Injected: 1",
      ADDRESS,
    );
    expect(result).not.toMatch(/[\r\n]/);
    expect(result).toBe(
      '"Acme Bcc: victim@evil.test X-Injected: 1" <noreply@test.dev>',
    );
  });

  it("strips other control characters and collapses/trims whitespace", () => {
    expect(formatFromAddress("  Acme\u0000\t  Shop\u007f  ", ADDRESS)).toBe(
      '"Acme Shop" <noreply@test.dev>',
    );
  });

  it("returns the bare address when the name is empty or whitespace-only", () => {
    expect(formatFromAddress("", ADDRESS)).toBe(ADDRESS);
    expect(formatFromAddress(" \r\n\t ", ADDRESS)).toBe(ADDRESS);
  });
});

describe("sendEmail From header", () => {
  beforeEach(() => {
    mocks.sendResendEmail.mockReset();
    mocks.sendResendEmail.mockResolvedValue({
      data: { id: "msg_1" },
      error: null,
    });
  });

  it("builds the quoted From with the SimplePress suffix when fromName is set", async () => {
    await sendEmail({
      from: ADDRESS,
      fromName: "Smith, Jones <Co>",
      to: "buyer@test.dev",
      subject: "Hi",
      react: null as never,
    });
    expect(mocks.sendResendEmail.mock.calls[0]?.[0]).toMatchObject({
      from: '"Smith, Jones <Co> via SimplePress" <noreply@test.dev>',
    });
  });

  it("passes the bare address through when fromName is absent", async () => {
    await sendEmail({
      from: ADDRESS,
      to: "buyer@test.dev",
      subject: "Hi",
      react: null as never,
    });
    expect(mocks.sendResendEmail.mock.calls[0]?.[0]).toMatchObject({
      from: ADDRESS,
    });
  });
});
