import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <FieldRow label={label}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
    </FieldRow>
  );
}

export function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FieldRow label={label}>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </FieldRow>
  );
}

export function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-1.5">
        <Input type="number" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-9" />
        {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
      </div>
    </FieldRow>
  );
}

export function BooleanField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-xs">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 rounded border border-input p-1 bg-background" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="transparente" className="h-9" />
      </div>
    </FieldRow>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <FieldRow label={label}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldRow>
  );
}
