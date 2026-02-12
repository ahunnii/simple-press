import { Check } from "lucide-react";

import { cn } from "~/lib/utils";

type Step = {
  id: number;
  name: string;
};

type SignupProgressProps = {
  currentStep: number;
  steps: readonly Step[];
};

export function SignupProgress({ currentStep, steps }: SignupProgressProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={cn(
              "relative flex items-center",
              stepIdx !== steps.length - 1 ? "flex-1" : "",
            )}
          >
            {/* Step Circle */}
            <div className="flex items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  step.id < currentStep
                    ? "border-blue-600 bg-blue-600"
                    : step.id === currentStep
                      ? "border-blue-600 bg-white"
                      : "border-gray-300 bg-white",
                )}
              >
                {step.id < currentStep ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-medium",
                      step.id === currentStep
                        ? "text-blue-600"
                        : "text-gray-500",
                    )}
                  >
                    {step.id}
                  </span>
                )}
              </div>

              {/* Step Name */}
              <span
                className={cn(
                  "ml-3 hidden text-sm font-medium sm:block",
                  step.id === currentStep
                    ? "text-blue-600"
                    : step.id < currentStep
                      ? "text-gray-900"
                      : "text-gray-500",
                )}
              >
                {step.name}
              </span>
            </div>

            {/* Connector Line */}
            {stepIdx !== steps.length - 1 && (
              <div
                className={cn(
                  "ml-4 h-0.5 flex-1 transition-colors",
                  step.id < currentStep ? "bg-blue-600" : "bg-gray-300",
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
