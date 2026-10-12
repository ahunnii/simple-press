import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";

/** "Finish setting up your store". Pinned; the page passes null once setup is done. */
export function SetupProgressCard({
  setupProgress,
}: {
  setupProgress: {
    completed: number;
    total: number;
    nextStep: { label: string; href: string } | null;
  } | null;
}) {
  if (!setupProgress) return null;

  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <h2 className="text-foreground text-sm font-semibold">
              Finish setting up your store
            </h2>
            <span className="text-muted-foreground text-xs">
              {setupProgress.completed} of {setupProgress.total} steps complete
            </span>
          </div>
          <Progress
            value={(setupProgress.completed / setupProgress.total) * 100}
            className="mt-2 h-1.5 max-w-sm"
          />
          {setupProgress.nextStep && (
            <p className="text-muted-foreground mt-2 text-sm">
              Next: {setupProgress.nextStep.label}
            </p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/admin/welcome">
            Continue setup
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
