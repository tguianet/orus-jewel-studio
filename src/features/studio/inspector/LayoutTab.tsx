import type { StudioNode, StudioStyle, Breakpoint } from "../types/document";
import { getNodeDefinition } from "../registry";
import { TextField, NumberField, SelectField } from "./fields";

type Props = {
  node: StudioNode;
  breakpoint: Breakpoint;
  onChange: (patch: StudioStyle) => void;
};

function currentValue(node: StudioNode, breakpoint: Breakpoint, key: keyof StudioStyle) {
  return node.styles[breakpoint]?.[key] ?? node.styles.desktop?.[key];
}

export function LayoutTab({ node, breakpoint, onChange }: Props) {
  const v = (key: keyof StudioStyle) => currentValue(node, breakpoint, key);
  const def = getNodeDefinition(node.type);
  const isGrid = node.type === "grid" || (def.defaultStyles.desktop?.display === "grid");
  const isFlex = node.type === "flex" || (def.defaultStyles.desktop?.display === "flex");

  return (
    <div className="p-4 space-y-5">
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Tamanho</p>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Largura" value={(v("width") as string) || ""} onChange={(val) => onChange({ width: val || undefined })} placeholder="100%" />
          <TextField label="Altura" value={(v("height") as string) || ""} onChange={(val) => onChange({ height: val || undefined })} placeholder="auto" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Largura máxima" value={(v("maxWidth") as string) || ""} onChange={(val) => onChange({ maxWidth: val || undefined })} placeholder="1200px" />
          <TextField label="Altura mínima" value={(v("minHeight") as string) || ""} onChange={(val) => onChange({ minHeight: val || undefined })} placeholder="auto" />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Espaçamento</p>
        <TextField label="Espaçamento interno (padding)" value={(v("padding") as string) || ""} onChange={(val) => onChange({ padding: val || undefined })} placeholder="24px" />
        <TextField label="Espaçamento externo (margin)" value={(v("margin") as string) || ""} onChange={(val) => onChange({ margin: val || undefined })} placeholder="0" />
      </section>

      {(isFlex || isGrid) && (
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {isGrid ? "Grid" : "Colunas (Flex)"} — {breakpoint === "desktop" ? "Desktop" : breakpoint === "tablet" ? "Tablet" : "Mobile"}
          </p>
          {isGrid ? (
            <NumberField label="Número de colunas" value={(v("columns") as number) || 4} onChange={(val) => onChange({ columns: Math.max(1, val) })} />
          ) : (
            <SelectField
              label="Direção"
              value={(v("flexDirection") as string) || "row"}
              onChange={(val) => onChange({ flexDirection: val as StudioStyle["flexDirection"] })}
              options={[
                { label: "Linha (horizontal)", value: "row" },
                { label: "Coluna (vertical)", value: "column" },
              ]}
            />
          )}
          <TextField label="Espaço entre itens (gap)" value={(v("gap") as string) || ""} onChange={(val) => onChange({ gap: val || undefined })} placeholder="24px" />
          <SelectField
            label="Alinhamento (eixo cruzado)"
            value={(v("alignItems") as string) || ""}
            onChange={(val) => onChange({ alignItems: val })}
            options={[
              { label: "Início", value: "flex-start" },
              { label: "Centro", value: "center" },
              { label: "Fim", value: "flex-end" },
              { label: "Esticar", value: "stretch" },
            ]}
          />
          <SelectField
            label="Distribuição"
            value={(v("justifyContent") as string) || ""}
            onChange={(val) => onChange({ justifyContent: val })}
            options={[
              { label: "Início", value: "flex-start" },
              { label: "Centro", value: "center" },
              { label: "Fim", value: "flex-end" },
              { label: "Espaço entre", value: "space-between" },
            ]}
          />
        </section>
      )}
    </div>
  );
}
