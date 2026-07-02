"use client";

import { useId, useState } from "react";

import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { authClient } from "~/server/better-auth/client";

/**
 * The subset of a saved `ShippingAddress` record the picker works with.
 * Matches the rows returned by `customer.getMyProfile().shippingAddresses`.
 */
export type SavedCheckoutAddress = {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  country: string;
  zip: string;
  phone: string | null;
  isDefault: boolean;
};

/**
 * The slice of `useCheckoutForm`'s return value needed to prefill an address.
 * Every template checkout form already has these — pass the hook return (`f`)
 * directly, or the destructured setters.
 */
export type CheckoutAddressFormApi = {
  setName: (v: string) => void;
  setPhone: (v: string) => void;
  setAddressLine1: (v: string) => void;
  setAddressLine2: (v: string) => void;
  setCity: (v: string) => void;
  setState: (v: string) => void;
  setPostalCode: (v: string) => void;
  setCountry: (v: SupportedCountry) => void;
  allowedCountries: SupportedCountry[];
};

/** Normalize a stored province value ("MI" or "Michigan") to a region code. */
function toRegionCode(
  province: string | null,
  country: SupportedCountry,
): string {
  const raw = (province ?? "").trim();
  if (!raw) return "";
  const match = getRegionOptions(country).find(
    (opt) =>
      opt.code.toLowerCase() === raw.toLowerCase() ||
      opt.name.toLowerCase() === raw.toLowerCase(),
  );
  return match?.code ?? raw;
}

/**
 * Prefill checkout form fields from a saved address. Country is applied first
 * (it resets the state field), then the state code. If the saved country
 * isn't in the store's allowed sales countries, country/state are left
 * untouched so the shopper can choose a shippable destination.
 */
export function applySavedAddressToForm(
  form: CheckoutAddressFormApi,
  address: SavedCheckoutAddress,
): void {
  const fullName = [address.firstName, address.lastName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  if (fullName) form.setName(fullName);
  if (address.phone?.trim()) form.setPhone(address.phone.trim());

  form.setAddressLine1(address.address1);
  form.setAddressLine2(address.address2 ?? "");
  form.setCity(address.city);
  form.setPostalCode(address.zip);

  const country = address.country.trim().toUpperCase() as SupportedCountry;
  if (form.allowedCountries.includes(country)) {
    form.setCountry(country); // resets state
    form.setState(toRegionCode(address.province, country));
  }
}

const NEW_ADDRESS = "__new__";

type SavedAddressPickerProps = {
  /** Called with the chosen saved address so the form can prefill fields. */
  onSelect: (address: SavedCheckoutAddress) => void;
  /** Extra classes for the root fieldset (spacing, borders, fonts…). */
  className?: string;
  /** Extra classes for the legend ("Use a saved address"). */
  legendClassName?: string;
  /** Extra classes for each option row (label wrapping the radio). */
  optionClassName?: string;
  /** Radio accent color — pass the template's primary color if it has one. */
  accentColor?: string;
};

/**
 * "Use a saved address" selector for checkout forms.
 *
 * Renders nothing unless the visitor is logged in AND has a Customer record
 * with at least one saved shipping address — guests and first-time customers
 * see zero visual noise. Visually neutral: inherits the surrounding text
 * color, uses low-opacity `currentColor` borders, and accepts class/color
 * overrides so each template can blend it in.
 */
export function SavedAddressPicker({
  onSelect,
  className,
  legendClassName,
  optionClassName,
  accentColor,
}: SavedAddressPickerProps) {
  const { data: session, isPending } = authClient.useSession();
  const isLoggedIn = !isPending && !!session?.user;

  const { data: profile } = api.customer.getMyProfile.useQuery(undefined, {
    enabled: isLoggedIn,
    retry: false,
    staleTime: 60_000,
  });

  const groupName = useId();
  const [selectedId, setSelectedId] = useState<string>(NEW_ADDRESS);

  // getMyProfile returns null when the user has never had a Customer record.
  const addresses = profile?.shippingAddresses ?? [];
  if (!isLoggedIn || addresses.length === 0) return null;

  const rowClass = cn(
    "flex cursor-pointer items-start gap-3 rounded-md border border-current/25 p-3 transition-opacity",
    optionClassName,
  );
  const radioStyle = { accentColor: accentColor ?? "currentColor" };

  return (
    <fieldset className={cn("m-0 min-w-0 border-0 p-0", className)}>
      <legend
        className={cn("mb-2 p-0 text-sm font-medium", legendClassName)}
      >
        Use a saved address
      </legend>
      <div className="space-y-2">
        {addresses.map((address) => {
          const displayName = [address.firstName, address.lastName]
            .filter(Boolean)
            .join(" ");
          const regionLine = [
            address.city,
            [address.province, address.zip].filter(Boolean).join(" "),
          ]
            .filter(Boolean)
            .join(", ");
          const countryLabel =
            COUNTRY_LABELS[address.country as SupportedCountry] ??
            address.country;
          return (
            <label key={address.id} className={rowClass}>
              <input
                type="radio"
                name={groupName}
                value={address.id}
                checked={selectedId === address.id}
                onChange={() => {
                  setSelectedId(address.id);
                  onSelect(address);
                }}
                className="mt-0.5 size-4 shrink-0"
                style={radioStyle}
              />
              <span className="min-w-0 text-sm leading-snug">
                <span className="block font-medium">
                  {displayName || address.address1}
                  {address.isDefault && (
                    <span className="ml-1.5 text-xs font-normal opacity-70">
                      (Default)
                    </span>
                  )}
                </span>
                <span className="block opacity-70">
                  {address.address1}
                  {address.address2 ? `, ${address.address2}` : ""}
                </span>
                <span className="block opacity-70">
                  {regionLine}
                  {countryLabel ? `, ${countryLabel}` : ""}
                </span>
              </span>
            </label>
          );
        })}
        <label className={rowClass}>
          <input
            type="radio"
            name={groupName}
            value={NEW_ADDRESS}
            checked={selectedId === NEW_ADDRESS}
            onChange={() => setSelectedId(NEW_ADDRESS)}
            className="mt-0.5 size-4 shrink-0"
            style={radioStyle}
          />
          <span className="text-sm leading-snug">Enter a new address</span>
        </label>
      </div>
    </fieldset>
  );
}
