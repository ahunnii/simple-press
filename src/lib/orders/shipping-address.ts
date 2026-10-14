export type ShippingAddress = {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
};

/**
 * The plain-text block "Copy address" puts on the clipboard. Pirate Ship's
 * "Paste Address" box parses exactly this shape, so keep the line order.
 */
export function formatAddressForCopy(address: ShippingAddress): string {
  // "City, Province ZIP" — comma only when there is a province.
  const cityProvinceZip = address.province
    ? `${address.city}, ${address.province} ${address.zip}`.trim()
    : `${address.city} ${address.zip}`.trim();

  return [
    `${address.firstName} ${address.lastName}`.trim(),
    address.company ?? null,
    address.address1,
    address.address2 ?? null,
    cityProvinceZip,
    address.country,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
