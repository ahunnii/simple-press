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
    <div className="flex items-start gap-4 rounded-lg border bg-white p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          completed
            ? "bg-green-100 text-green-600"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {completed ? <CheckCircle2 className="h-6 w-6" /> : icon}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
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
