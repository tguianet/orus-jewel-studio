import type { StudioNode } from "../types/document";
import type { ContentField } from "../registry/types";
import { getNodeDefinition } from "../registry";
import { useStudioData } from "../registry/renderTree";
import { TextField, TextAreaField, NumberField, BooleanField, SelectField } from "./fields";

const DYNAMIC_OPTION_FIELDS = new Set(["category", "collection"]);

export function ContentTab({ node, onChange }: { node: StudioNode; onChange: (field: string, value: unknown) => void }) {
  const def = getNodeDefinition(node.type);
  const data = useStudioData();

  if (!def.contentFields.length) {
    return <p className="text-xs text-muted-foreground p-4">Este elemento não tem campos de conteúdo — use as abas Design e Layout.</p>;
  }

  return (
    <div className="p-4 space-y-4">
      {def.contentFields.map((field) => (
        <ContentFieldControl key={field.key} field={field} node={node} onChange={onChange} collections={data.collections} />
      ))}
    </div>
  );
}

function ContentFieldControl({
  field,
  node,
  onChange,
  collections,
}: {
  field: ContentField;
  node: StudioNode;
  onChange: (field: string, value: unknown) => void;
  collections: string[];
}) {
  const raw = node.props[field.key];

  switch (field.type) {
    case "text":
    case "link":
    case "image":
      return <TextField label={field.label} value={(raw as string) || ""} onChange={(v) => onChange(field.key, v)} placeholder={field.placeholder} />;
    case "richtext":
      return <TextAreaField label={field.label} value={(raw as string) || ""} onChange={(v) => onChange(field.key, v)} />;
    case "number":
      return <NumberField label={field.label} value={(raw as number) ?? 0} onChange={(v) => onChange(field.key, v)} />;
    case "boolean":
      return <BooleanField label={field.label} value={!!raw} onChange={(v) => onChange(field.key, v)} />;
    case "color":
      return <TextField label={field.label} value={(raw as string) || ""} onChange={(v) => onChange(field.key, v)} />;
    case "select": {
      const options = DYNAMIC_OPTION_FIELDS.has(field.key) ? collections.map((c) => ({ label: c, value: c })) : field.options || [];
      return <SelectField label={field.label} value={(raw as string) || ""} onChange={(v) => onChange(field.key, v)} options={options} />;
    }
    case "list":
      return (
        <p className="text-[11px] text-muted-foreground">
          {field.label}: gerencie pela aba Mídia — selecione este elemento e clique nas imagens.
        </p>
      );
    default:
      return null;
  }
}
