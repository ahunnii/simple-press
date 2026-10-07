import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { DeliveryReturnsFormValues } from "~/lib/validators/shipping";
import {
  deliveryReturnsFormDefaults,
  deliveryReturnsFormSchema,
} from "~/lib/validators/shipping";
import { Form } from "~/components/ui/form";

import { DeliveryReturnsCards } from "./delivery-returns-cards";

function Host({
  row = {},
  onValid = () => undefined,
}: {
  row?: Parameters<typeof deliveryReturnsFormDefaults>[0];
  onValid?: (v: DeliveryReturnsFormValues) => void;
}) {
  const form = useForm<DeliveryReturnsFormValues>({
    resolver: zodResolver(deliveryReturnsFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: deliveryReturnsFormDefaults(row),
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onValid)}>
        <DeliveryReturnsCards form={form} />
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

describe("DeliveryReturnsCards", () => {
  it("renders both cards with returns 'Not set' and no accept-mode fields", () => {
    render(<Host />);

    expect(screen.getByText("Delivery times")).toBeInTheDocument();
    expect(screen.getByText("Handling time")).toBeInTheDocument();
    expect(screen.getByText("Transit time")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Not set" })).toBeChecked();
    expect(screen.queryByText("Return window (days)")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Who pays return shipping"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Returns & Refunds policy/ }),
    ).toHaveAttribute("href", "/admin/content/policies");
  });

  it("hydrates saved values and shows the accept-mode fields", () => {
    render(
      <Host
        row={{
          handlingDaysMin: 1,
          handlingDaysMax: 3,
          returnWindowDays: 30,
          returnFees: "flat_fee",
          returnShippingFeeCents: 699,
          returnMethod: "by_mail",
        }}
      />,
    );

    expect(screen.getByRole("radio", { name: "Accept returns" })).toBeChecked();
    expect(screen.getByLabelText("Return window (days)")).toHaveValue(30);
    expect(screen.getByLabelText("Return fee (USD)")).toHaveValue("6.99");
    expect(screen.getByText("How customers return items")).toBeInTheDocument();
  });

  it("shows accept-mode fields only after choosing 'Accept returns', and hides them again for 'No returns'", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByRole("radio", { name: "Accept returns" }));
    expect(screen.getByText("Return window (days)")).toBeInTheDocument();
    expect(screen.getByText("Who pays return shipping")).toBeInTheDocument();
    // flat-fee amount only appears for the flat-fee option
    expect(screen.queryByText("Return fee (USD)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "No returns" }));
    expect(screen.queryByText("Return window (days)")).not.toBeInTheDocument();
  });

  it("surfaces inline errors and blocks submit for an incomplete range", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Host onValid={onValid} />);

    await user.type(screen.getAllByLabelText("Min (days)")[0]!, "2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Add a maximum for handling time"),
    ).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("requires the accept-mode fields before submitting", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Host onValid={onValid} />);

    await user.click(screen.getByRole("radio", { name: "Accept returns" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Enter how many days customers have"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose who pays for return shipping"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose how customers return items"),
    ).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("submits a valid blank form", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Host onValid={onValid} />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
  });
});
