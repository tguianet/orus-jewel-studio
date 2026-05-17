import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BG_PRESETS = [
  { name: "Padrão", value: "" },
  { name: "Branco suave", value: "#f8f7f5" },
  { name: "Areia", value: "#f1ece2" },
  { name: "Champanhe", value: "#f5ead2" },
  { name: "Rosé", value: "#f7e6df" },
  { name: "Cinza claro", value: "#ece8e1" },
  { name: "Preto", value: "#111111" },
  { name: "Nude escuro", value: "#1a1410" },
];

const TEXT_PRESETS = [
  { name: "Padrão", value: "" },
  { name: "Preto", value: "#111111" },
  { name: "Grafite", value: "#2a2a2a" },
  { name: "Marrom", value: "#5a4630" },
  { name: "Dourado", value: "#c8a46b" },
  { name: "Branco", value: "#ffffff" },
];

const FONT_PRESETS = [
  { name: "Padrão", value: "" },
  { name: "Serif clássica", value: "'Playfair Display', Georgia, serif" },
  { name: "Serif moderna", value: "'Cormorant Garamond', Georgia, serif" },
  { name: "Sans elegante", value: "'Inter', system-ui, sans-serif" },
  { name: "Sans geométrica", value: "'Montserrat', system-ui, sans-serif" },
  { name: "Sans humanista", value: "'Poppins', system-ui, sans-serif" },
  { name: "Caligráfica", value: "'Great Vibes', cursive" },
  { name: "Display luxo", value: "'Bodoni Moda', 'Didot', serif" },
  { name: "Monoespaçada", value: "'JetBrains Mono', monospace" },
];

interface Props {
  bg?: string;
  text?: string;
  font?: string;
  onChange: (patch: { bg?: string; text?: string; font?: string }) => void;
  hideFont?: boolean;
}

export const SectionStyleControls = ({ bg, text, font, onChange, hideFont }: Props) => {
  return (
    <div className="pt-3 border-t border-border/60 space-y-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Estilo desta seção</p>

      <div>
        <Label className="text-xs">Cor de fundo</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {BG_PRESETS.map((c) => {
            const active = (bg || "") === c.value;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onChange({ bg: c.value || undefined })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
              >
                <span className="h-4 w-4 rounded-full border border-border" style={{ background: c.value || "transparent" }} />
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Input type="color" value={bg || "#f8f7f5"} onChange={(e) => onChange({ bg: e.target.value })} className="h-10 w-14 p-1" />
          <Input value={bg || ""} onChange={(e) => onChange({ bg: e.target.value || undefined })} placeholder="(vazio = padrão)" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Cor do texto</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {TEXT_PRESETS.map((c) => {
            const active = (text || "") === c.value;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onChange({ text: c.value || undefined })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
              >
                <span className="h-4 w-4 rounded-full border border-border" style={{ background: c.value || "transparent" }} />
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Input type="color" value={text || "#111111"} onChange={(e) => onChange({ text: e.target.value })} className="h-10 w-14 p-1" />
          <Input value={text || ""} onChange={(e) => onChange({ text: e.target.value || undefined })} placeholder="(vazio = padrão)" />
        </div>
      </div>

      {!hideFont && (
        <div>
          <Label className="text-xs">Formato da letra (fonte)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {FONT_PRESETS.map((f) => {
              const active = (font || "") === f.value;
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => onChange({ font: f.value || undefined })}
                  className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
                  style={f.value ? { fontFamily: f.value } : undefined}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
          <Input
            className="mt-2"
            value={font || ""}
            onChange={(e) => onChange({ font: e.target.value || undefined })}
            placeholder="Personalizada (ex.: 'Playfair Display', serif)"
          />
        </div>
      )}
    </div>
  );
};
