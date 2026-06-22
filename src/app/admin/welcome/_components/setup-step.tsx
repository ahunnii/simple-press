import { CheckCircle2 } from "lucide-react";

type Props = {
  completed: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function SetupStep({
  completed,
  icon,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card p-4">
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
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
