import { Text } from "@react-email/components";

import { orderItemOptionLines } from "~/lib/customizer/display";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

/**
 * Product customizer choices under an order line ("Charms: Heart (included),
 * Star +$8.00"), read from the stored `OrderItem.customization` snapshot.
 * Renders nothing for a plain line. Prices are per unit.
 */
export function OrderItemOptions({
  customization,
}: {
  customization?: unknown;
}) {
  const lines = orderItemOptionLines(customization);
  if (lines.length === 0) return null;
  return (
    <>
      {lines.map((line, index) => (
        <Text key={index} style={optionText}>
          {line.label}: {line.value}
          {line.price > 0 ? ` +${formatPrice(line.price)}` : ""}
        </Text>
      ))}
    </>
  );
}

const optionText = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 2px 0",
};
