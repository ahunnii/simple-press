import { CheckCircle2 } from "lucide-react";

type Props = {
  businessName: string;
  userName: string;
  isComplete: boolean;
};

export function WelcomeHeader({ businessName, userName, isComplete }: Props) {
  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-2 text-3xl font-bold">
            Welcome to {businessName}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Hi {userName}, let&apos;s get your store ready to sell.
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
