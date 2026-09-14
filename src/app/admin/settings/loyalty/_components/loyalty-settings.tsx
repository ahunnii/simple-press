"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { LoyaltyTierType } from "~/lib/loyalty/constants";
import type { LoyaltyProgramSettingsInput } from "~/lib/validators/loyalty";
import type { RouterOutputs } from "~/trpc/react";
import { LOYALTY_TIER_TYPES, MAX_LOYALTY_TIERS } from "~/lib/loyalty/constants";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { DISCOUNT_PERCENTAGE_MAX_ERROR } from "~/lib/validators/discounts";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { NumberFormField } from "~/components/inputs/number-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";

import { LoyaltyTiersEditor } from "./loyalty-tiers-editor";

type LoyaltySettingsData = RouterOutputs["loyalty"]["getSettings"];

type Props = {
  initial: LoyaltySettingsData;
};

/**
 * One redemption tier as edited in the form. Money/percent fields are kept
 * as raw display strings (`valueInput`, `minPurchaseDollars`) rather than
 * cents — same "dollars in the form, cents on the wire" approach as
 * `zone-weight-editor.tsx`'s `rateDollars` — bounds-checked here via
 * `superRefine` and converted to cents by `buildPayload` below at submit
 * time, since the real mutation input (`loyaltyProgramSettingsSchema` in
 * `src/lib/validators/loyalty.ts`) stores `value`/`minPurchase` in cents (or
 * whole percent for a percentage tier).
 *
 * Deliberately a validating `superRefine`, not a type-changing `.transform`:
 * RHF's shared field components (`SwitchFormField`/`NumberFormField`, used
 * throughout this form) are typed as `UseFormReturn<CurrentForm>` — a single
 * type for both what the form stores AND what `handleSubmit` hands back. A
 * `.transform()` that renames/retypes fields (as this one would, `valueInput:
 * string` -> `value: number`) makes the resolver's output NOT assignable
 * back to the input shape, which breaks every one of those shared
 * components' prop types. Keeping the schema's output identical in shape to
 * its input (only adding validation issues) avoids that trap entirely.
 */
const loyaltyTierFormSchema = z
  .object({
    id: z.string().cuid().optional(),
    label: z.string().trim().min(1, "Required").max(60),
    pointsCost: z.number().int().min(1, "Must be at least 1").max(1_000_000),
    type: z.enum(
      LOYALTY_TIER_TYPES as unknown as [LoyaltyTierType, ...LoyaltyTierType[]],
    ),
    valueInput: z.string(),
    minPurchaseDollars: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percentage") {
      const parsed = Number.parseInt(data.valueInput, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: DISCOUNT_PERCENTAGE_MAX_ERROR,
          path: ["valueInput"],
        });
      }
    } else {
      const cents = dollarsToCents(data.valueInput.trim() || "0");
      if (!Number.isFinite(cents) || cents < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fixed reward must be at least 1 cent",
          path: ["valueInput"],
        });
      }
    }

    const minTrimmed = data.minPurchaseDollars.trim();
    if (minTrimmed.length > 0) {
      const cents = dollarsToCents(minTrimmed);
      if (!Number.isFinite(cents) || cents < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid minimum purchase amount",
          path: ["minPurchaseDollars"],
        });
      }
    }
  });

const loyaltySettingsFormSchema = z.object({
  earnOnOrders: z.boolean(),
  pointsPerDollar: z.number().int().min(0).max(1000),
  signupEnabled: z.boolean(),
  signupBonus: z.number().int().min(0).max(1_000_000),
  firstOrderEnabled: z.boolean(),
  firstOrderBonus: z.number().int().min(0).max(1_000_000),
  birthdayEnabled: z.boolean(),
  birthdayBonus: z.number().int().min(0).max(1_000_000),
  socialEnabled: z.boolean(),
  socialFollowBonus: z.number().int().min(0).max(1_000_000),
  rewardCodeExpiryDays: z.number().int().min(1).max(365),
  tiers: z.array(loyaltyTierFormSchema).max(MAX_LOYALTY_TIERS),
});

export type LoyaltySettingsFormValues = z.infer<
  typeof loyaltySettingsFormSchema
>;
type LoyaltyTierFormValues = LoyaltySettingsFormValues["tiers"][number];

function tierToFormValues(
  tier: LoyaltySettingsData["tiers"][number],
): LoyaltyTierFormValues {
  const type: LoyaltyTierType =
    tier.type === "percentage" ? "percentage" : "fixed";
  return {
    id: tier.id,
    label: tier.label,
    pointsCost: tier.pointsCost,
    type,
    valueInput:
      type === "percentage"
        ? String(tier.value)
        : centsToDollarsString(tier.value),
    minPurchaseDollars:
      tier.minPurchase != null ? centsToDollarsString(tier.minPurchase) : "",
  };
}

function defaultValuesFor(
  data: LoyaltySettingsData,
): LoyaltySettingsFormValues {
  const p = data.program;
  return {
    earnOnOrders: p.earnOnOrders,
    pointsPerDollar: p.pointsPerDollar,
    signupEnabled: p.signupEnabled,
    signupBonus: p.signupBonus,
    firstOrderEnabled: p.firstOrderEnabled,
    firstOrderBonus: p.firstOrderBonus,
    birthdayEnabled: p.birthdayEnabled,
    birthdayBonus: p.birthdayBonus,
    socialEnabled: p.socialEnabled,
    socialFollowBonus: p.socialFollowBonus,
    rewardCodeExpiryDays: p.rewardCodeExpiryDays,
    tiers: data.tiers.map(tierToFormValues),
  };
}

/**
 * Converts the form's display shape (dollar/percent strings) into the
 * mutation's wire shape (cents/percent numbers). Kept separate from the zod
 * schema above so validation (which needs shared-component-friendly types)
 * and the actual dollars->cents conversion are two independent steps — see
 * the docblock on `loyaltyTierFormSchema`.
 */
function buildPayload(
  data: LoyaltySettingsFormValues,
): LoyaltyProgramSettingsInput {
  return {
    earnOnOrders: data.earnOnOrders,
    pointsPerDollar: data.pointsPerDollar,
    signupEnabled: data.signupEnabled,
    signupBonus: data.signupBonus,
    firstOrderEnabled: data.firstOrderEnabled,
    firstOrderBonus: data.firstOrderBonus,
    birthdayEnabled: data.birthdayEnabled,
    birthdayBonus: data.birthdayBonus,
    socialEnabled: data.socialEnabled,
    socialFollowBonus: data.socialFollowBonus,
    rewardCodeExpiryDays: data.rewardCodeExpiryDays,
    tiers: data.tiers.map((tier) => {
      const minTrimmed = tier.minPurchaseDollars.trim();
      return {
        id: tier.id,
        label: tier.label,
        pointsCost: tier.pointsCost,
        type: tier.type,
        value:
          tier.type === "percentage"
            ? Number.parseInt(tier.valueInput, 10)
            : dollarsToCents(tier.valueInput.trim() || "0"),
        minPurchase: minTrimmed.length > 0 ? dollarsToCents(minTrimmed) : null,
      };
    }),
  };
}

export function LoyaltySettings({ initial }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const form = useForm<LoyaltySettingsFormValues>({
    resolver: zodResolver(loyaltySettingsFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: defaultValuesFor(initial),
  });

  const updateSettingsMutation = api.loyalty.updateSettings.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Rewards settings saved");
      form.reset(defaultValuesFor(data));
      void utils.loyalty.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update rewards settings");
    },
    onMutate: () => toast.loading("Saving rewards settings..."),
  });

  const handleSubmit = async (data: LoyaltySettingsFormValues) => {
    updateSettingsMutation.mutate(buildPayload(data));
  };

  const handleReset = () => {
    form.reset(defaultValuesFor(initial));
  };

  const isDirty = form.formState.isDirty;
  const isSubmitting = updateSettingsMutation.isPending;
  const loyaltyDisabled = !initial.flags.loyalty;
  const saveDisabled = loyaltyDisabled || isSubmitting || !isDirty;

  useKeyboardEnter(form, handleSubmit);
  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
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
              <span
                className={`admin-status-badge ${
                  isDirty ? "isDirty" : "isPublished"
                }`}
              >
                {isDirty ? "Unsaved Changes" : "Saved"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions items-center">
            {loyaltyDisabled && (
              <span className="text-muted-foreground hidden text-xs sm:inline">
                Turn on the Rewards Program feature to save changes.
              </span>
            )}

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

            <Button type="submit" size="sm" disabled={saveDisabled}>
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
            <p className="text-muted-foreground text-sm">
              Changes apply to future orders only — points already awarded are
              never recalculated.
            </p>

            {/* Earning on orders */}
            <Card>
              <CardHeader>
                <CardTitle>Earning on orders</CardTitle>
                <CardDescription>
                  Award points automatically when a customer places an order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SwitchFormField
                  form={form}
                  name="earnOnOrders"
                  label="Earn points on orders"
                />
                <NumberFormField
                  form={form}
                  name="pointsPerDollar"
                  label="Points per dollar"
                  min={0}
                  description="Points per $1 of the order subtotal after discounts (shipping and tax excluded)."
                />
              </CardContent>
            </Card>

            {/* Bonuses */}
            <Card>
              <CardHeader>
                <CardTitle>Bonuses</CardTitle>
                <CardDescription>
                  One-time or recurring point bonuses beyond ordinary earning.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-lg border p-4">
                  <SwitchFormField
                    form={form}
                    name="signupEnabled"
                    label="Signup bonus"
                    className="border-none p-0"
                  />
                  <NumberFormField
                    form={form}
                    name="signupBonus"
                    label="Points"
                    min={0}
                    disabled={!form.watch("signupEnabled")}
                    description="Awarded once when a customer joins the program from their account page."
                  />
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <SwitchFormField
                    form={form}
                    name="firstOrderEnabled"
                    label="First order bonus"
                    className="border-none p-0"
                  />
                  <NumberFormField
                    form={form}
                    name="firstOrderBonus"
                    label="Points"
                    min={0}
                    disabled={!form.watch("firstOrderEnabled")}
                    description="Awarded once, on a customer's first completed order."
                  />
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <SwitchFormField
                    form={form}
                    name="birthdayEnabled"
                    label="Birthday bonus"
                    className="border-none p-0"
                  />
                  <NumberFormField
                    form={form}
                    name="birthdayBonus"
                    label="Points"
                    min={0}
                    disabled={!form.watch("birthdayEnabled")}
                    description="Customers add their birthday on the rewards page; awarded once a year."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social follows */}
            <Card>
              <CardHeader>
                <CardTitle>Social follows</CardTitle>
                <CardDescription>
                  Award points when a customer follows one of your social
                  accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SwitchFormField
                  form={form}
                  name="socialEnabled"
                  label="Award points for social follows"
                />
                <NumberFormField
                  form={form}
                  name="socialFollowBonus"
                  label="Points per network"
                  min={0}
                  disabled={!form.watch("socialEnabled")}
                  description="Honor system: awarded when the customer clicks Follow, then Claim."
                />

                {initial.socialNetworksAvailable.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {initial.socialNetworksAvailable.map((network) => (
                      <Badge key={network.network} variant="secondary">
                        {network.label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Add your social links in{" "}
                    <Link
                      href="/admin/content/branding"
                      className="underline underline-offset-2"
                    >
                      Branding
                    </Link>{" "}
                    to offer this reward.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Reward tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Reward tiers</CardTitle>
                <CardDescription>
                  What customers can redeem their points for — a percentage or
                  fixed-amount discount code. Percentage tiers cap at 100%.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoyaltyTiersEditor />
              </CardContent>
            </Card>

            {/* Reward codes */}
            <Card>
              <CardHeader>
                <CardTitle>Reward codes</CardTitle>
                <CardDescription>
                  Settings for the single-use discount codes redemption mints.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NumberFormField
                  form={form}
                  name="rewardCodeExpiryDays"
                  label="Code expiry (days)"
                  min={1}
                  max={365}
                  description="Redeemed codes are single-use and expire after this many days."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
