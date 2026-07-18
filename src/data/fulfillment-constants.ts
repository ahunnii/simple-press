export const CARRIERS = [
  {
    value: "usps",
    label: "USPS",
    trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
  },
  {
    value: "ups",
    label: "UPS",
    trackingUrl: "https://www.ups.com/track?tracknum=",
  },
  {
    value: "fedex",
    label: "FedEx",
    trackingUrl: "https://www.fedex.com/fedextrack/?tracknumbers=",
  },
  {
    value: "dhl",
    label: "DHL",
    trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB=",
  },
  { value: "other", label: "Other", trackingUrl: "" },
];

/** Detects the carrier from a tracking number. Returns a CARRIERS value or null. */
export function detectCarrier(trackingNumber: string): string | null {
  const tn = trackingNumber.replace(/\s+/g, "").toUpperCase();
  if (/^1Z[A-Z0-9]{16}$/.test(tn)) return "ups";
  if (/^[A-Z]{2}\d{9}US$/.test(tn)) return "usps"; // S10 international
  if (/^9[1-5]\d{18,20}$/.test(tn)) return "usps"; // 20-22 digits, 91-95 prefix
  if (/^96\d{18,20}$/.test(tn)) return "fedex"; // 20-22 digits, 96 prefix
  if (/^\d{15}$/.test(tn)) return "fedex";
  if (/^\d{12}$/.test(tn)) return "fedex";
  if (/^\d{10}$/.test(tn)) return "dhl"; // DHL Express AWB
  return null;
}

/** Builds a tracking URL from a known carrier's URL prefix; "" when unknown or "other". */
export function buildTrackingUrl(
  carrier?: string,
  trackingNumber?: string,
): string {
  if (!carrier || !trackingNumber) return "";
  const match = CARRIERS.find((c) => c.value === carrier);
  return match?.trackingUrl ? `${match.trackingUrl}${trackingNumber}` : "";
}

/** Maps a stored carrier value ("usps") to its label ("USPS"); falls back to the raw value for legacy free-form strings. */
export function carrierLabel(carrier: string | null | undefined): string {
  if (!carrier) return "";
  return CARRIERS.find((c) => c.value === carrier)?.label ?? carrier;
}
