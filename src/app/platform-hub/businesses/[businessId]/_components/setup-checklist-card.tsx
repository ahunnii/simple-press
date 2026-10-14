import { Check, Circle } from "lucide-react";

import type { ResolvedSetupPlan } from "~/lib/admin/setup-plan";
import type { SetupStatus } from "~/lib/admin/setup-steps";
import { BUSINESS_TYPES, SETUP_STEP_CATALOG } from "~/lib/admin/setup-plan";
import { FEATURE_REGISTRY } from "~/lib/features/registry";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { EditSetupPlanDialog } from "./edit-setup-plan-dialog";

type Props = {
  businessId: string;
  status: SetupStatus;
  plan: ResolvedSetupPlan;
  /** Resolved feature flags (defaults + overrides), for the edit dialog. */
  flags: Record<string, boolean>;
  /**
   * Launch latch — when the owner first finished every required step. Once
   * set, steps made Required later are to-dos, not a gate.
   */
  setupCompletedAt: Date | null;
};

/** "2 of 4 required steps done" for the card and the details grid. */
export function describeRequiredProgress(status: SetupStatus): string {
  const requiredTotal = status.items.filter(
    (item) => item.level === "required",
  ).length;
  const done = requiredTotal - status.requiredRemaining;
  return `${done} of ${requiredTotal} required step${requiredTotal === 1 ? "" : "s"} done`;
}

export function SetupChecklistCard({
  businessId,
  status,
  plan,
  flags,
  setupCompletedAt,
}: Props) {
  // "Store created" is always done — not a real step for the admin to track.
  const optionalItems = status.items.filter(
    (item) => item.level === "optional" && item.key !== "businessCreated",
  );
  const optionalDone = optionalItems.filter((item) => item.score === 1).length;

  // On in the plan but hidden from the owner because the step's feature is off.
  const visibleKeys = new Set<string>(status.items.map((item) => item.key));
  const hiddenSteps = SETUP_STEP_CATALOG.filter(
    (step) => plan.steps[step.key] !== "off" && !visibleKeys.has(step.key),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Setup checklist</CardTitle>
            <CardDescription>
              {plan.businessType
                ? BUSINESS_TYPES[plan.businessType].label
                : "Legacy — original 5 steps"}
              {" · "}
              {describeRequiredProgress(status)}
              {optionalItems.length > 0 &&
                ` · ${optionalDone} of ${optionalItems.length} optional`}
              {setupCompletedAt &&
                ` · launched ${setupCompletedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`}
            </CardDescription>
          </div>
          <EditSetupPlanDialog
            businessId={businessId}
            plan={plan}
            flags={flags}
            launched={setupCompletedAt !== null}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {status.items.map((item) => {
            const done = item.score === 1;
            return (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {done ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-green-600"
                      aria-label="Done"
                    />
                  ) : (
                    <Circle
                      className="text-muted-foreground h-4 w-4 shrink-0"
                      aria-label="Not done"
                    />
                  )}
                  <span className={cn(!done && "text-muted-foreground")}>
                    {item.label}
                  </span>
                  {item.confirmed && (
                    <span className="text-muted-foreground text-xs">
                      (marked done by owner)
                    </span>
                  )}
                </div>
                {item.key !== "businessCreated" && (
                  <Badge
                    variant={
                      item.level === "required" ? "default" : "secondary"
                    }
                  >
                    {item.level === "required" ? "Required" : "Optional"}
                  </Badge>
                )}
              </li>
            );
          })}
          {hiddenSteps.map((step) => (
            <li
              key={step.key}
              className="text-muted-foreground flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span>{step.label}</span>
              <span className="text-xs">
                hidden —{" "}
                {step.feature
                  ? (FEATURE_REGISTRY[step.feature]?.label ?? step.feature)
                  : "feature"}{" "}
                is off
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
