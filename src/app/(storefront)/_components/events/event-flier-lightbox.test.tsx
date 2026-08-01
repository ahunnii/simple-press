import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EventFlierLightbox } from "./event-flier-lightbox";

const SRC = "https://storage.artisanalfutures.org/fliers/summer-jam.png";
const ALT = "Summer Jam";

function renderLightbox() {
  return render(
    <EventFlierLightbox src={SRC} alt={ALT}>
      <span>Flier thumbnail</span>
    </EventFlierLightbox>,
  );
}

describe("EventFlierLightbox", () => {
  it("renders the trigger's children with an accessible name", () => {
    renderLightbox();

    expect(screen.getByText("Flier thumbnail")).toBeInTheDocument();

    const trigger = screen.getByRole("button", {
      name: `View flier for ${ALT}`,
    });
    expect(trigger).toBeInTheDocument();
    // Focusable — no dialog is open yet.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a dialog with an accessible name when the trigger is activated", async () => {
    const user = userEvent.setup();
    renderLightbox();

    await user.click(
      screen.getByRole("button", { name: `View flier for ${ALT}` }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: `${ALT} — enlarged flier`,
    });
    expect(dialog).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderLightbox();

    await user.click(
      screen.getByRole("button", { name: `View flier for ${ALT}` }),
    );
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("moves focus into the dialog on open and restores it to the trigger on close", async () => {
    const user = userEvent.setup();
    renderLightbox();

    const trigger = screen.getByRole("button", {
      name: `View flier for ${ALT}`,
    });
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    // Radix moves focus into the dialog content on open.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(trigger).not.toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders no previous/next controls (single-image only, not the multi-image gallery lightbox)", async () => {
    const user = userEvent.setup();
    renderLightbox();

    await user.click(
      screen.getByRole("button", { name: `View flier for ${ALT}` }),
    );
    await screen.findByRole("dialog");

    expect(
      screen.queryByRole("button", { name: /previous/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /next/i }),
    ).not.toBeInTheDocument();
  });

  it("supports a custom closeLabel for the close control's accessible name", async () => {
    const user = userEvent.setup();
    render(
      <EventFlierLightbox src={SRC} alt={ALT} closeLabel="Dismiss flier">
        <span>Flier thumbnail</span>
      </EventFlierLightbox>,
    );

    await user.click(
      screen.getByRole("button", { name: `View flier for ${ALT}` }),
    );
    await screen.findByRole("dialog");

    expect(
      screen.getByRole("button", { name: "Dismiss flier" }),
    ).toBeInTheDocument();
  });
});
