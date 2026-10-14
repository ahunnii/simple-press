import { CheckCircle2 } from "lucide-react";

type Props = {
  businessName: string;
  userName: string;
  isComplete: boolean;
  requiredComplete: boolean;
  requiredRemaining: number;
  /**
   * The launch latch is set: the store already finished its required steps
   * once, so a required step added since is a to-do, not a blocker.
   */
  launched: boolean;
};

export function WelcomeHeader({
  businessName,
  userName,
  isComplete,
  requiredComplete,
  requiredRemaining,
  launched,
}: Props) {
  const steps = `${requiredRemaining} required step${requiredRemaining === 1 ? "" : "s"}`;
  const subtitle = !requiredComplete
    ? launched
      ? `your store is live. ${steps} still on your list.`
      : `you have ${steps} left before your store is ready.`
    : isComplete
      ? "everything on your list is done."
      : "your store is ready. A few optional steps will polish it.";

  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-2 text-3xl font-bold">
            Welcome to {businessName}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Hi {userName}, {subtitle}
          </p>
        </div>
        {isComplete && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Setup Complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
