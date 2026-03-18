"use client";

// Step progress bar for the 4-step event creation wizard
interface WizardStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { n: 1, label: "Thông tin sự kiện" },
  { n: 2, label: "Thời gian & Loại vé" },
  { n: 3, label: "Cài đặt" },
  { n: 4, label: "Thanh toán" },
];

export function WizardStepper({ currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-stone-200 rounded-full mb-6">
        <div
          className="absolute left-0 top-0 h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {STEPS.map(({ n, label }) => {
          const done = n < currentStep;
          const active = n === currentStep;
          const clickable = done && onStepClick;

          return (
            <button
              key={n}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(n)}
              className={`flex flex-col items-center gap-1 group transition-opacity ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                  ${active ? "bg-amber-500 text-white" : done ? "bg-amber-100 text-amber-700 group-hover:bg-amber-200" : "bg-stone-200 text-stone-400"}`}
              >
                {done ? "✓" : n}
              </span>
              <span className={`text-xs hidden sm:block ${active ? "text-amber-700 font-medium" : done ? "text-stone-600" : "text-stone-400"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
