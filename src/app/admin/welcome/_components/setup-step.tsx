import { CheckCircle2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";

type Props = {
  completed: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  /** "Required" / "Optional" tag beside the title. Omit for the store-created row. */
  level?: "required" | "optional";
  action?: React.ReactNode;
};

export function SetupStep({
  completed,
  icon,
  title,
  description,
  level,
  action,
}: Props) {
  return (
    <div className="bg-card flex items-start gap-4 rounded-lg border p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          completed
            ? "bg-green-100 text-green-600"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? <CheckCircle2 className="h-6 w-6" /> : icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-foreground font-semibold">{title}</h3>
          {level && (
            <Badge variant={level === "required" ? "secondary" : "outline"}>
              {level === "required" ? "Required" : "Optional"}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>

      {completed && (
        <div className="shrink-0">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
      )}
    </div>
  );
}
