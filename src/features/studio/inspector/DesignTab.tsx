import type { StudioNode, StudioStyle, Breakpoint } from "../types/document";
import { TextField, ColorField, NumberField, SelectField } from "./fields";

type Props = {
  node: StudioNode;
  breakpoint: Breakpoint;
  onChange: (patch: StudioStyle) => void;
};

function currentValue(node: StudioNode, breakpoint: Breakpoint, key: keyof StudioStyle) {
  return node.styles[breakpoint]?.[key] ?? node.styles.desktop?.[key];
}

export function DesignTab({ node, breakpoint, onChange }: Props) {
  const v = (key: keyof StudioStyle) => currentValue(node, breakpoint, key);

  return (
    <div className="p-4 space-y-5">
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Tipografia</p>
        <TextField label="Família da fonte" value={(v("fontFamily") as string) || ""} onChange={(val) => onChange({ fontFamily: val || undefined })} placeholder="ex: 'Playfair Display', serif" />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Tamanho" value={(v("fontSize") as string) || ""} onChange={(val) => onChange({ fontSize: val || undefined })} placeholder="16px" />
          <SelectField
            label="Peso"
            value={(v("fontWeight") as string) || ""}
            onChange={(val) => onChange({ fontWeight: val })}
            options={[
              { label: "Leve", value: "300" },
              { label: "Normal", value: "400" },
              { label: "Médio", value: "500" },
              { label: "Negrito", value: "700" },
            ]}
          />
        </div>
        <ColorField label="Cor do texto" value={(v("color") as string) || ""} onChange={(val) => onChange({ color: val || undefined })} />
        <SelectField
          label="Alinhamento"
          value={(v("textAlign") as string) || ""}
          onChange={(val) => onChange({ textAlign: val as StudioStyle["textAlign"] })}
          options={[
            { label: "Esquerda", value: "left" },
            { label: "Centro", value: "center" },
            { label: "Direita", value: "right" },
          ]}
        />
      </section>

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Fundo</p>
        <ColorField label="Cor de fundo" value={(v("background") as string) || ""} onChange={(val) => onChange({ background: val || undefined })} />
      </section>

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Borda</p>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Espessura" value={(v("borderWidth") as string) || ""} onChange={(val) => onChange({ borderWidth: val || undefined })} placeholder="1px" />
          <TextField label="Raio (arredondamento)" value={(v("borderRadius") as string) || ""} onChange={(val) => onChange({ borderRadius: val || undefined })} placeholder="8px" />
        </div>
        <ColorField label="Cor da borda" value={(v("borderColor") as string) || ""} onChange={(val) => onChange({ borderColor: val || undefined })} />
        <TextField label="Sombra" value={(v("boxShadow") as string) || ""} onChange={(val) => onChange({ boxShadow: val || undefined })} placeholder="0 10px 30px rgba(0,0,0,0.1)" />
      </section>

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Opacidade</p>
        <NumberField label="Opacidade (0 a 1)" value={(v("opacity") as number) ?? 1} onChange={(val) => onChange({ opacity: val })} />
      </section>
    </div>
  );
}
