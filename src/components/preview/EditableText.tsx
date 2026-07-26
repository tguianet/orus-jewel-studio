import { useEffect, useRef, type ElementType, type FocusEvent, type KeyboardEvent, type CSSProperties } from "react";

const isPreviewMode = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("preview") === "1";

type Props = {
  field: string;
  value: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  placeholder?: string;
};

/**
 * Texto editável "in place" quando o app roda dentro do iframe do editor (?preview=1).
 * Em modo público, renderiza um nó normal e ignora a edição.
 */
export const EditableText = ({
  field,
  value,
  as: Tag = "span",
  className = "",
  style,
  multiline,
  placeholder,
}: Props) => {
  const editable = isPreviewMode();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!editable) return;
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerText !== value) el.innerText = value || "";
  }, [editable, value]);

  if (!editable) {
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      className={`${className} outline-none rounded ring-1 ring-transparent hover:ring-primary/40 focus:ring-primary focus:bg-primary/5 cursor-text transition-colors`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-editable-field={field}
      data-placeholder={placeholder}
      onFocus={() => {
        try {
          window.parent?.postMessage({ type: "lovable-edit-focus", field }, "*");
        } catch {
          /* noop */
        }
      }}
      onBlur={(e: FocusEvent<HTMLElement>) => {
        const text = (e.currentTarget.innerText || "").replace(/\u00A0/g, " ").trim();
        try {
          window.parent?.postMessage({ type: "lovable-edit-field", field, value: text }, "*");
        } catch {
          /* noop */
        }
      }}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.blur();
        }
      }}
    >
      {value || ""}
    </Tag>
  );
};

export const isPreview = isPreviewMode;
