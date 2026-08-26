import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import type { ProductFormSchema } from "~/lib/validators/product";
import { Form } from "~/components/ui/form";

import { ProductSubscriptionCard } from "./product-subscription-card";

/** Minimal host: the card only reads/writes the three subscription fields,
 *  so `defaultValues` only needs to seed those (RHF's `DefaultValues<T>` is a
 *  deep-partial regardless of which fields the Zod schema marks required). */
function Host({
  defaultValues,
}: {
  defaultValues?: Partial<
    Pick<
      ProductFormSchema,
      | "subscriptionEnabled"
      | "subscriptionIntervals"
      | "subscriptionDiscountPercent"
    >
  >;
}) {
  const form = useForm<ProductFormSchema>({
    defaultValues: {
      subscriptionEnabled: false,
      subscriptionIntervals: [],
      subscriptionDiscountPercent: 0,
      ...defaultValues,
    },
  });
  return (
    <Form {...form}>
      <ProductSubscriptionCard form={form} />
    </Form>
  );
}

describe("ProductSubscriptionCard", () => {
  it("hides cadence and discount fields until the switch is on", () => {
    render(<Host defaultValues={{ subscriptionEnabled: false }} />);

    expect(screen.getByText("Offer as a subscription")).toBeInTheDocument();
    expect(screen.queryByText("Cadence")).not.toBeInTheDocument();
    expect(screen.queryByText("Subscribe & save")).not.toBeInTheDocument();
  });

  it("shows cadence checkboxes and the discount field once enabled", () => {
    render(<Host defaultValues={{ subscriptionEnabled: true }} />);

    expect(screen.getByText("Cadence")).toBeInTheDocument();
    expect(screen.getByText("Every week")).toBeInTheDocument();
    expect(screen.getByText("Every 2 weeks")).toBeInTheDocument();
    expect(screen.getByText("Every month")).toBeInTheDocument();
    expect(screen.getByText("Every 2 months")).toBeInTheDocument();
    expect(screen.getByText("Every 3 months")).toBeInTheDocument();
    expect(screen.getByText("Subscribe & save")).toBeInTheDocument();
  });

  it("shows a validation hint when enabled with no cadence selected", () => {
    render(
      <Host
        defaultValues={{
          subscriptionEnabled: true,
          subscriptionIntervals: [],
        }}
      />,
    );

    expect(screen.getByText("Choose at least one cadence")).toBeInTheDocument();
  });

  it("hides the validation hint once a cadence is selected", () => {
    render(
      <Host
        defaultValues={{
          subscriptionEnabled: true,
          subscriptionIntervals: ["month:1"],
        }}
      />,
    );

    expect(
      screen.queryByText("Choose at least one cadence"),
    ).not.toBeInTheDocument();
  });

  it("checks the box for an already-selected cadence", () => {
    render(
      <Host
        defaultValues={{
          subscriptionEnabled: true,
          subscriptionIntervals: ["month:1"],
        }}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Every month" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Every week" }),
    ).not.toBeChecked();
  });

  it("toggles a cadence checkbox on click and clears the validation hint", async () => {
    const user = userEvent.setup();
    render(<Host defaultValues={{ subscriptionEnabled: true }} />);

    expect(screen.getByText("Choose at least one cadence")).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", { name: "Every month" });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(
      screen.queryByText("Choose at least one cadence"),
    ).not.toBeInTheDocument();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("Choose at least one cadence")).toBeInTheDocument();
  });

  it("enabling the switch reveals the cadence and discount controls", async () => {
    const user = userEvent.setup();
    render(<Host defaultValues={{ subscriptionEnabled: false }} />);

    expect(screen.queryByText("Cadence")).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch"));

    expect(screen.getByText("Cadence")).toBeInTheDocument();
  });
});
