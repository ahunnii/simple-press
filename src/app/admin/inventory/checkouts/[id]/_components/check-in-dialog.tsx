"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../../../_lib/admin-mutation-toast";

type CheckoutLine =
  RouterOutputs["inventoryCheckout"]["getById"]["lines"][number];

type LineInput = { returned: number; damaged: number; lost: number };

function defaultsFor(lines: CheckoutLine[]): Record<string, LineInput> {
  const map: Record<string, LineInput> = {};
  for (const line of lines) {
    map[line.id] = { returned: line.outstanding, damaged: 0, lost: 0 };
  }
  return map;
}

type Props = {
  checkoutId: string;
  lines: CheckoutLine[];
};

export function CheckInDialog({ checkoutId, lines }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const outstandingLines = lines.filter((line) => line.outstanding > 0);

  const [values, setValues] = useState<Record<string, LineInput>>(() =>
    defaultsFor(outstandingLines),
  );
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Fresh state every time the dialog opens — reopening after a
      // cancelled edit shouldn't carry stale numbers forward.
      setValues(defaultsFor(outstandingLines));
      setNote("");
      setFormError(null);
    }
  };

  const checkIn = api.inventoryCheckout.checkIn.useMutation({
    onMutate: loadingToast("Checking in…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        data.closed
          ? "Checked in — all items returned"
          : `Checked in — ${data.outstanding} unit${data.outstanding === 1 ? "" : "s"} still out`,
      );
      setOpen(false);
      void utils.inventoryCheckout.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      setFormError(null);
      toast.error(error.message || "Failed to check in");
    },
  });

  if (outstandingLines.length === 0) return null;

  const setField = (lineId: string, field: keyof LineInput, raw: string) => {
    const value = Math.max(0, Number.parseInt(raw, 10) || 0);
    setValues((current) => ({
      ...current,
      [lineId]: { ...current[lineId]!, [field]: value },
    }));
  };

  const returnAll = () => setValues(defaultsFor(outstandingLines));

  const onSubmit = () => {
    const problems: string[] = [];
    let anyNonZero = false;
    for (const line of outstandingLines) {
      const v = values[line.id]!;
      const total = v.returned + v.damaged + v.lost;
      if (total > 0) anyNonZero = true;
      if (total > line.outstanding) {
        problems.push(`${line.itemName}: only ${line.outstanding} still out`);
      }
    }
    if (problems.length > 0) {
      setFormError(problems.join("; "));
      return;
    }
    if (!anyNonZero) {
      setFormError("Enter at least one returned, damaged, or lost unit.");
      return;
    }
    setFormError(null);

    checkIn.mutate({
      checkoutId,
      lines: outstandingLines.map((line) => ({
        lineId: line.id,
        ...values[line.id]!,
      })),
      note: note.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PackageCheck className="h-4 w-4" />
          Check in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Check in items</DialogTitle>
          <DialogDescription>
            Record what came back. Anything marked damaged or lost is written
            off rather than returned to stock.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 px-2 text-xs"
            onClick={returnAll}
          >
            <RotateCcw className="h-3 w-3" />
            Return all
          </Button>
        </div>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {outstandingLines.map((line) => {
            const v = values[line.id]!;
            const over = v.returned + v.damaged + v.lost > line.outstanding;
            return (
              <div key={line.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium break-words">
                    {line.itemName}
                  </p>
                  <p className="text-muted-foreground shrink-0 text-xs">
                    {line.outstanding} still out
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`returned-${line.id}`}
                      className="text-xs font-normal"
                    >
                      Returned
                    </Label>
                    <Input
                      id={`returned-${line.id}`}
                      type="number"
                      min={0}
                      value={v.returned}
                      onChange={(e) =>
                        setField(line.id, "returned", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`damaged-${line.id}`}
                      className="text-xs font-normal"
                    >
                      Damaged
                    </Label>
                    <Input
                      id={`damaged-${line.id}`}
                      type="number"
                      min={0}
                      value={v.damaged}
                      onChange={(e) =>
                        setField(line.id, "damaged", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`lost-${line.id}`}
                      className="text-xs font-normal"
                    >
                      Lost
                    </Label>
                    <Input
                      id={`lost-${line.id}`}
                      type="number"
                      min={0}
                      value={v.lost}
                      onChange={(e) =>
                        setField(line.id, "lost", e.target.value)
                      }
                    />
                  </div>
                </div>
                {over && (
                  <p className="text-destructive text-xs">
                    Only {line.outstanding} still out.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="checkin-note" className="text-sm font-normal">
            Note (optional)
          </Label>
          <Textarea
            id="checkin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {formError && <p className="text-destructive text-sm">{formError}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={checkIn.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={checkIn.isPending}>
            {checkIn.isPending ? "Checking in…" : "Check in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
