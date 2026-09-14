"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { LoyaltyLedgerType } from "~/lib/loyalty/constants";
import type { AdjustPointsInput } from "~/lib/validators/loyalty";
import { formatDate } from "~/lib/format-date";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { LOYALTY_LEDGER_TYPE_LABELS } from "~/lib/loyalty/constants";
import { cn } from "~/lib/utils";
import { adjustPointsSchema } from "~/lib/validators/loyalty";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

type Props = {
  customerId: string;
  /** true for OWNER/MANAGER (and PLATFORM_ADMIN); false for STAFF. */
  canAdjust: boolean;
};

type DiscountCodeSummary = {
  code: string;
  expiresAt: Date | null;
  usageCount: number;
  active: boolean;
};

// Year-agnostic month/day formatting — a stored birthday has no year, so a
// scratch leap year (2000) is used purely so Feb 29 formats without throwing.
const MONTH_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

function formatBirthday(month: number, day: number): string {
  return MONTH_DAY_FORMAT.format(new Date(2000, month - 1, day));
}

/** `LoyaltyLedger.type` is a plain `String` column, so an unrecognized value
 *  (future type, or drift) falls back to the raw string rather than showing
 *  nothing. */
function activityLabel(type: string): string {
  const labels: Record<string, string | undefined> = LOYALTY_LEDGER_TYPE_LABELS;
  return labels[type as LoyaltyLedgerType] ?? type;
}

function CodeStatusBadge({ code }: { code: DiscountCodeSummary }) {
  if (!code.active) return <Badge variant="secondary">Inactive</Badge>;
  if (code.usageCount >= 1) return <Badge variant="outline">Used</Badge>;
  if (code.expiresAt && code.expiresAt.getTime() < Date.now())
    return <Badge variant="destructive">Expired</Badge>;
  return <Badge variant="success">Active</Badge>;
}

function AdjustPointsDialog({ customerId }: { customerId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const defaultValues: AdjustPointsInput = {
    customerId,
    points: 0,
    reason: "",
  };

  const form = useForm<AdjustPointsInput>({
    resolver: zodResolver(adjustPointsSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });

  const adjustPoints = api.loyalty.adjustPoints.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Points adjusted");
      setOpen(false);
      form.reset(defaultValues);
      void utils.loyalty.getCustomerLedger.invalidate({ customerId });
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      // The only BAD_REQUEST this mutation throws ("Customer has no points to
      // deduct") mentions "points", so the fieldMap routes it onto the Points
      // field instead of a generic toast.
      applyTrpcErrorToForm(form, err, {
        fieldMap: { points: "points" },
        fallbackMessage: "Failed to adjust points",
      });
    },
    onMutate: () => {
      toast.loading("Adjusting points...");
    },
  });

  const onSubmit = (data: AdjustPointsInput) => {
    adjustPoints.mutate(data);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaultValues);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Adjust points
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust points</DialogTitle>
          <DialogDescription>
            Manually grant or deduct loyalty points for this customer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={1}
                      name={field.name}
                      ref={field.ref}
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormDescription>
                    Use a negative number to deduct.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      maxLength={200}
                      rows={3}
                      placeholder="Why is this adjustment being made?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={adjustPoints.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adjustPoints.isPending}>
                {adjustPoints.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerLoyaltyCard({ customerId, canAdjust }: Props) {
  const { data, isPending, isError } = api.loyalty.getCustomerLedger.useQuery({
    customerId,
  });

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Loading rewards activity...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Couldn&apos;t load rewards activity.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { balance, birthday, joinedAt, entries } = data;

  // Keeps STAFF screens uncluttered when there is genuinely nothing here.
  // Owners still see the card (even empty) so they always have a way in to
  // adjust points.
  if (balance === 0 && entries.length === 0 && !canAdjust) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Rewards</CardTitle>
          {canAdjust && <AdjustPointsDialog customerId={customerId} />}
        </div>
        {(joinedAt ?? birthday) && (
          <CardDescription className="flex flex-wrap gap-x-3 gap-y-1">
            {joinedAt && <span>Joined {formatDate(joinedAt)}</span>}
            {birthday && (
              <span>
                Birthday {formatBirthday(birthday.month, birthday.day)}
              </span>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-bold">
          {balance.toLocaleString()} {balance === 1 ? "point" : "points"}
        </p>

        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No rewards activity yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Points ledger</caption>
              <thead>
                <tr className="border-b">
                  <th className="text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                    Date
                  </th>
                  <th className="text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                    Activity
                  </th>
                  <th className="text-muted-foreground px-2 py-2 text-right text-xs font-medium tracking-wider uppercase">
                    Points
                  </th>
                  <th className="text-muted-foreground px-2 py-2 text-right text-xs font-medium tracking-wider uppercase">
                    Balance after
                  </th>
                  <th className="text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-muted-foreground px-2 py-2 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-2 py-2">{activityLabel(entry.type)}</td>
                    <td
                      className={cn(
                        "px-2 py-2 text-right font-medium tabular-nums",
                        entry.points > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive",
                      )}
                    >
                      {entry.points > 0 ? "+" : ""}
                      {entry.points.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {entry.balanceAfter.toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.reason && <span>{entry.reason}</span>}
                        {entry.type === "redeem" && entry.discountCode && (
                          <>
                            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                              {entry.discountCode.code}
                            </code>
                            <CodeStatusBadge code={entry.discountCode} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
