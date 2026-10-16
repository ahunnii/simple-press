import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkEditBlock } from "./link-edit-block";

// The real picker fetches pages over tRPC; a button that picks `/contact` is
// all these tests need.
vi.mock("./site-link-picker", () => ({
  SiteLinkPicker: ({ onPick }: { onPick: (path: string) => void }) => (
    <button type="button" onClick={() => onPick("/contact")}>
      Pick contact
    </button>
  ),
}));

const urlBox = () => screen.getByPlaceholderText("/contact or https://…");
const newTabSwitch = () => screen.getByRole("switch");
const isOn = () => newTabSwitch().getAttribute("aria-checked") === "true";

function save() {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

describe("LinkEditBlock — Open in New Tab", () => {
  it("shows ON when editing an external link with no stored target", () => {
    render(
      <LinkEditBlock
        defaultUrl="https://example.com"
        defaultTarget={null}
        onSave={vi.fn()}
      />,
    );
    expect(isOn()).toBe(true);
  });

  it("shows OFF when editing an external link saved as same tab", () => {
    render(
      <LinkEditBlock
        defaultUrl="https://example.com"
        defaultTarget="_self"
        onSave={vi.fn()}
      />,
    );
    expect(isOn()).toBe(false);
  });

  it("shows OFF when editing an internal link with no stored target", () => {
    render(
      <LinkEditBlock defaultUrl="/contact" defaultTarget="" onSave={vi.fn()} />,
    );
    expect(isOn()).toBe(false);
  });

  it("follows the URL type for a new link until flipped by hand", () => {
    const onSave = vi.fn();
    render(<LinkEditBlock onSave={onSave} />);
    expect(isOn()).toBe(false);

    fireEvent.change(urlBox(), { target: { value: "https://example.com" } });
    expect(isOn()).toBe(true);

    fireEvent.change(urlBox(), { target: { value: "/about" } });
    expect(isOn()).toBe(false);

    fireEvent.click(newTabSwitch());
    expect(isOn()).toBe(true);

    // Chosen by hand: no longer follows the URL.
    fireEvent.change(urlBox(), { target: { value: "/faq" } });
    expect(isOn()).toBe(true);

    save();
    expect(onSave).toHaveBeenCalledWith("/faq", undefined, true, null);
  });

  it("turns the switch off when a page on the site is picked", () => {
    const onSave = vi.fn();
    render(<LinkEditBlock onSave={onSave} />);
    fireEvent.change(urlBox(), { target: { value: "https://example.com" } });
    expect(isOn()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Pick contact" }));
    expect(isOn()).toBe(false);

    save();
    expect(onSave).toHaveBeenCalledWith("/contact", undefined, false, null);
  });

  it("saves an external link with the switch off as same tab (isNewTab false)", () => {
    const onSave = vi.fn();
    render(
      <LinkEditBlock
        defaultUrl="https://example.com"
        defaultTarget={null}
        onSave={onSave}
      />,
    );
    fireEvent.click(newTabSwitch());
    save();
    expect(onSave).toHaveBeenCalledWith(
      "https://example.com",
      undefined,
      false,
      null,
    );
  });

  it("accepts an sms: link, defaulting a new one to the same tab", () => {
    const onSave = vi.fn();
    render(<LinkEditBlock onSave={onSave} />);
    fireEvent.change(urlBox(), { target: { value: "sms:+15551234567" } });
    expect(isOn()).toBe(false);
    save();
    expect(onSave).toHaveBeenCalledWith(
      "sms:+15551234567",
      undefined,
      false,
      null,
    );
  });
});
