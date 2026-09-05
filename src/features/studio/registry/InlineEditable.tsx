import { useEffect, useRef, useState, type ElementType, type CSSProperties, type HTMLAttributes } from "react";

type Props = {
  as?: ElementType;
  value: string;
  editing: boolean;
  onCommit?: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  rootProps?: HTMLAttributes<HTMLElement>;
  placeholder?: string;
};

/**
 * Texto do canvas do Studio: no modo de edição, um clique seleciona o nó (via rootProps,
 * igual a qualquer outro elemento) e duplo clique entra em edição de texto (contentEditable).
 * Fora do editor, renderiza texto estático puro.
 */
export function InlineEditable({ as: Tag = "span", value, editing, onCommit, className, style, rootProps, placeholder }: Props) {
  const [isTextEditing, setIsTextEditing] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isTextEditing) return;
    const el = ref.current;
    if (!el) return;
    el.innerText = value || "";
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTextEditing]);

  if (!editing) {
    return (
      <Tag className={className} style={style}>
        {value || ""}
      </Tag>
    );
  }

  if (isTextEditing) {
    return (
      <Tag
        ref={ref}
        className={`${className || ""} outline-none ring-2 ring-primary rounded cursor-text`}
        style={style}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          setIsTextEditing(false);
          onCommit?.((e.currentTarget.innerText || "").trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") e.currentTarget.blur();
        }}
      />
    );
  }

  return (
    <Tag
      {...rootProps}
      className={className}
      style={style}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setIsTextEditing(true);
      }}
    >
      {value || <span className="opacity-40">{placeholder || "Clique duas vezes para editar"}</span>}
    </Tag>
  );
}
