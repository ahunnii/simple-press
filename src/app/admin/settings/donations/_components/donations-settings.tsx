"use client";

import type { z } from "zod";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { createQrCodeSvgData } from "@better-auth-ui/core";
import { ArrowLeft, Info, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { PaymentsHealth } from "~/lib/stripe/payments-health";
import type { RouterOutputs } from "~/trpc/react";
import {
  cashAppUrl,
  normalizeCashAppHandle,
  normalizeVenmoHandle,
  venmoUrl,
} from "~/lib/donation-handles";
import {
  DEFAULT_DONATION_PRESETS_CENTS,
  MAX_DONATION_PRESETS,
} from "~/lib/donations/constants";
import type { DonationLabelKey } from "~/lib/donations/label";
import {
  DONATION_LABEL_KEYS,
  resolveDonationLabel,
} from "~/lib/donations/label";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { donationSettingsSchema } from "~/lib/validators/donation";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { InputFormField } from "~/components/inputs/input-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";

type Business = NonNullable<RouterOutputs["business"]["getWith"]>;

type Props = {
  business: Business;
  paymentsHealth: PaymentsHealth;
};

// `donationSettingsSchema` transforms `venmoHandle`/`cashAppHandle` (raw
// string in, normalized `string | null` out), so the form's FIELD type (what
// RHF stores while the owner types) and its SUBMIT type (what `handleSubmit`
// hands to the mutation) diverge — the three-generic `useForm` signature
// keeps both sides honest instead of forcing one type to paper over both.
type DonationSettingsInput = z.input<typeof donationSettingsSchema>;
type DonationSettingsOutput = z.output<typeof donationSettingsSchema>;

function parsePresetAmounts(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is number => typeof value === "number");
}

function isDonationLabelKey(value: string): value is DonationLabelKey {
  return (DONATION_LABEL_KEYS as string[]).includes(value);
}

function buildPresetInputs(cents: number[]): string[] {
  const dollars = cents.map((c) => centsToDollarsString(c));
  while (dollars.length < MAX_DONATION_PRESETS) dollars.push("");
  return dollars;
}

/**
 * Narrowed to just the six donation columns, not the full `Business` (which
 * carries every relation `getWith` can include). `donation.updateSettings`
 * returns a plain `ctx.db.business.update()` row — no relations — so a
 * `Business`-typed parameter here would reject that call site even though it
 * has every field this function actually reads.
 */
type DonationBusinessFields = Pick<
  Business,
  | "donationLabel"
  | "donationPresetAmounts"
  | "venmoHandle"
  | "cashAppHandle"
  | "donationShowInHeader"
  | "donationShowInFooter"
>;

function defaultValuesFor(
  business: DonationBusinessFields,
): DonationSettingsInput {
  return {
    donationLabel: isDonationLabelKey(business.donationLabel)
      ? business.donationLabel
      : "donate",
    presetAmounts: parsePresetAmounts(business.donationPresetAmounts),
    venmoHandle: business.venmoHandle ?? "",
    cashAppHandle: business.cashAppHandle ?? "",
    donationShowInHeader: business.donationShowInHeader,
    donationShowInFooter: business.donationShowInFooter,
  };
}

/**
 * Live venmo.com/cash.app deep link + scannable QR for a filled handle field.
 * Same `createQrCodeSvgData` approach as `OpenEmailButton` — memoized on the
 * URL, rendered as a black-on-white path pair inside a matching viewBox.
 */
function HandlePreview({ url }: { url: string }) {
  const qrCode = useMemo(() => createQrCodeSvgData(url), [url]);

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border p-3">
      <svg
        viewBox={`0 0 ${qrCode.size} ${qrCode.size}`}
        aria-hidden="true"
        focusable="false"
        className="size-16 shrink-0 rounded bg-white p-1"
      >
        <path fill="white" d={`M0 0h${qrCode.size}v${qrCode.size}H0z`} />
        <path fill="black" d={qrCode.path} shapeRendering="crispEdges" />
      </svg>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">
          Shoppers can scan this or open the link directly:
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium underline underline-offset-2"
        >
          {url}
        </a>
      </div>
    </div>
  );
}

export function DonationsSettings({ business, paymentsHealth }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<
    DonationSettingsInput,
    unknown,
    DonationSettingsOutput
  >({
    resolver: zodResolver(donationSettingsSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: defaultValuesFor(business),
  });

  const [presetInputs, setPresetInputs] = useState<string[]>(() =>
    buildPresetInputs(parsePresetAmounts(business.donationPresetAmounts)),
  );

  const updateSettingsMutation = api.donation.updateSettings.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      const nextValues = defaultValuesFor(data.business);
      form.reset(nextValues);
      setPresetInputs(buildPresetInputs(nextValues.presetAmounts));
      void utils.business.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update donation settings");
    },
    onMutate: () => toast.loading("Updating donation settings..."),
  });

  const handlePresetChange = (index: number, value: string) => {
    const next = [...presetInputs];
    next[index] = value;
    setPresetInputs(next);

    // Blank slots are simply skipped rather than submitted as 0 — the schema
    // (and the donate page reading `donationPresetAmounts`) only ever sees
    // the amounts an owner actually typed.
    const cents = next
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .map((v) => dollarsToCents(v));
    form.setValue("presetAmounts", cents, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };

  const handleSubmit = async (data: DonationSettingsOutput) => {
    updateSettingsMutation.mutate(data);
  };

  const handleReset = () => {
    const values = defaultValuesFor(business);
    form.reset(values);
    setPresetInputs(buildPresetInputs(values.presetAmounts));
  };

  const isSubmitting = updateSettingsMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, handleSubmit);
  useDirtyForm(isDirty);

  const rawVenmo = form.watch("venmoHandle") ?? "";
  const rawCashApp = form.watch("cashAppHandle") ?? "";
  const normalizedVenmo = normalizeVenmoHandle(rawVenmo);
  const normalizedCashApp = normalizeCashAppHandle(rawCashApp);

  // `paymentsHealth === "unknown"` (Stripe couldn't be reached just now) stays
  // quiet here too, matching every other consumer of `getPaymentsHealth` — a
  // transient lookup failure isn't proof charges are actually broken.
  const cardDonationsDisabled =
    paymentsHealth === "not-connected" || paymentsHealth === "charges-disabled";

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="bg-muted min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">Donations Settings</h1>
              <span
                className={`admin-status-badge ${
                  isDirty ? "isDirty" : "isPublished"
                }`}
              >
                {isDirty ? "Unsaved Changes" : "Saved"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={handleReset}
              className="hidden md:inline-flex"
            >
              Reset
            </Button>

            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Save changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="admin-container">
          <div className="space-y-6">
            {cardDonationsDisabled && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>
                  Card donations are disabled until Stripe is connected
                </AlertTitle>
                <AlertDescription>
                  Venmo/Cash App options will still be shown to shoppers.
                </AlertDescription>
                <AlertAction>
                  <Button variant="outline" asChild size="xs">
                    <Link href="/admin/settings/integrations">
                      Settings → Integrations
                    </Link>
                  </Button>
                </AlertAction>
              </Alert>
            )}

            {/* Label */}
            <Card>
              <CardHeader>
                <CardTitle>Label</CardTitle>
                <CardDescription>
                  Picks the wording used everywhere this feature appears —
                  the donate page title, nav links, and Stripe Checkout
                  button copy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioFormField
                  form={form}
                  name="donationLabel"
                  options={DONATION_LABEL_KEYS.map((key) => ({
                    value: key,
                    label: resolveDonationLabel(key).verb,
                  }))}
                  radioGroupClassName="flex flex-col gap-3 sm:flex-row sm:gap-6"
                />
              </CardContent>
            </Card>

            {/* Preset amounts */}
            <Card>
              <CardHeader>
                <CardTitle>Preset Amounts</CardTitle>
                <CardDescription>
                  Up to {MAX_DONATION_PRESETS} quick-pick amounts shown on the
                  donate page. Leave a slot blank to skip it — with none set,
                  shoppers see the defaults shown as placeholders below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {presetInputs.map((value, index) => {
                    const defaultCents = DEFAULT_DONATION_PRESETS_CENTS[index];
                    const placeholder =
                      defaultCents !== undefined
                        ? centsToDollarsString(defaultCents)
                        : "Custom";
                    return (
                      <div key={index} className="space-y-2">
                        <Label htmlFor={`preset-${index}`}>
                          Preset {index + 1}
                        </Label>
                        <div className="relative">
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                            $
                          </span>
                          <Input
                            id={`preset-${index}`}
                            inputMode="decimal"
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) =>
                              handlePresetChange(index, e.target.value)
                            }
                            className="pl-6"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {form.formState.errors.presetAmounts && (
                  <p className="text-destructive mt-3 text-sm">
                    {form.formState.errors.presetAmounts.message ??
                      "Check the preset amounts above."}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Venmo / Cash App */}
            <Card>
              <CardHeader>
                <CardTitle>Venmo &amp; Cash App</CardTitle>
                <CardDescription>
                  Optional peer-to-peer options shown alongside card
                  donations — these work even without a connected Stripe
                  account. Enter your username with or without the leading @
                  or $; either works.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <InputFormField
                    form={form}
                    name="venmoHandle"
                    label="Venmo Username"
                    placeholder="janedoe"
                    description={
                      <span className="inline-flex items-center gap-1.5">
                        <VenmoIcon className="h-4 w-4" /> venmo.com/u/…
                      </span>
                    }
                  />
                  {normalizedVenmo && (
                    <HandlePreview url={venmoUrl(normalizedVenmo)} />
                  )}
                </div>

                <div>
                  <InputFormField
                    form={form}
                    name="cashAppHandle"
                    label="Cash App Cashtag"
                    placeholder="janedoe"
                    description={
                      <span className="inline-flex items-center gap-1.5">
                        <CashAppIcon className="h-4 w-4" /> cash.app/$…
                      </span>
                    }
                  />
                  {normalizedCashApp && (
                    <HandlePreview url={cashAppUrl(normalizedCashApp)} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Placement */}
            <Card>
              <CardHeader>
                <CardTitle>Placement</CardTitle>
                <CardDescription>
                  Adds a link to your donate page to your site&apos;s header and footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SwitchFormField
                  form={form}
                  name="donationShowInHeader"
                  label="Show link in header navigation"
                />
                <SwitchFormField
                  form={form}
                  name="donationShowInFooter"
                  label="Show link in footer"
                />
                <p className="text-muted-foreground text-sm">
                  Automatic placement is supported on the Default and Pink
                  templates. On other templates, or if you&apos;d like the link
                  in a custom spot in your menu, add it yourself with the Donate
                  shortcut in{" "}
                  <Link
                    href="/admin/content/navigation"
                    className="underline underline-offset-2"
                  >
                    Content → Navigation
                  </Link>
                  &apos;s Quick Add panel.
                </p>
                <p className="text-muted-foreground text-sm">
                  This feature has its own master on/off switch in{" "}
                  <Link
                    href="/admin/settings/features"
                    className="underline underline-offset-2"
                  >
                    Settings → Features
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
