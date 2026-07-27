import { useId, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PLACEHOLDER,
  PASSWORD_RULES,
} from "@/lib/passwordPolicy";

type PasswordFieldProps = {
  id?: string;
  name: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  showChecklist?: boolean;
  showHint?: boolean;
  className?: string;
};

export function PasswordField({
  id,
  name,
  label = "Senha",
  value,
  onChange,
  disabled,
  required = true,
  autoComplete = "new-password",
  showChecklist = true,
  showHint = true,
  className,
}: PasswordFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? `password-${generatedId}`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="relative mt-1.5">
        <Input
          id={fieldId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete={autoComplete}
          placeholder={PASSWORD_PLACEHOLDER}
          disabled={disabled}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showHint && (
        <p className="mt-1.5 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      )}

      {showChecklist && (
        <ul className="mt-2 space-y-1" data-testid="password-checklist">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value);
            return (
              <li
                key={rule.id}
                data-rule={rule.id}
                data-met={ok ? "true" : "false"}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  ok ? "text-success" : "text-muted-foreground",
                )}
              >
                {ok ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0" />
                )}
                <span>{rule.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
