import { CUSTOMIZATION_STEPS, type CustomizationStepId } from "./customizationCopy";

type Props = {
  current: CustomizationStepId;
  onGoTo?: (step: CustomizationStepId) => void;
};

export function CustomizationStepIndicator({ current, onGoTo }: Props) {
  const currentMeta = CUSTOMIZATION_STEPS.find((s) => s.id === current)!;

  return (
    <nav aria-label="Etapas da personalização" className="mb-6" data-testid="customization-step-indicator">
      {/* Mobile: compacto */}
      <div className="sm:hidden rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Etapa {current} de {CUSTOMIZATION_STEPS.length}
        </p>
        <p className="font-display text-lg leading-tight mt-0.5">{currentMeta.short}</p>
      </div>

      {/* Desktop: todas as etapas */}
      <ol className="hidden sm:flex items-center gap-1 overflow-x-auto pb-1">
        {CUSTOMIZATION_STEPS.map((step, index) => {
          const active = step.id === current;
          const done = step.id < current;
          return (
            <li key={step.id} className="flex items-center min-w-0">
              {index > 0 && (
                <span className="mx-1 h-px w-4 shrink-0 bg-border" aria-hidden />
              )}
              <button
                type="button"
                disabled={!onGoTo || step.id > current}
                onClick={() => onGoTo?.(step.id)}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : done
                      ? "border-border text-foreground hover:border-primary/40"
                      : "border-transparent text-muted-foreground"
                }`}
                data-testid={`customization-step-tab-${step.id}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.id}
                </span>
                <span className="truncate">{step.short}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
