import type { StudioNodeDefinition } from "../types";

export const imageDef: StudioNodeDefinition = {
  type: "image",
  label: "Imagem",
  category: "media",
  icon: "Image",
  allowChildren: false,
  defaultProps: { src: "", alt: "", href: "", fit: "cover" },
  defaultStyles: { desktop: { width: "100%", height: "320px", borderRadius: "8px" } },
  contentFields: [
    { key: "src", label: "Imagem", type: "image" },
    { key: "alt", label: "Texto alternativo", type: "text" },
    { key: "href", label: "Link (opcional)", type: "link" },
    {
      key: "fit",
      label: "Ajuste",
      type: "select",
      options: [
        { label: "Cobrir (cover)", value: "cover" },
        { label: "Conter (contain)", value: "contain" },
      ],
    },
  ],
  render: ({ node, style, rootProps }) => {
    const src = (node.props.src as string) || "";
    const fit = (node.props.fit as string) === "contain" ? "object-contain" : "object-cover";
    return src ? (
      <img
        {...rootProps}
        src={src}
        alt={(node.props.alt as string) || ""}
        style={style}
        className={`${fit}`}
        data-studio-node-type="image"
      />
    ) : (
      <div
        {...rootProps}
        style={style}
        className="flex items-center justify-center bg-muted text-muted-foreground text-xs uppercase tracking-widest"
      >
        Sem imagem
      </div>
    );
  },
};

export const videoDef: StudioNodeDefinition = {
  type: "video",
  label: "Vídeo",
  category: "media",
  icon: "Video",
  allowChildren: false,
  defaultProps: { url: "", autoplay: false, loop: true, muted: true },
  defaultStyles: { desktop: { width: "100%", height: "420px", borderRadius: "8px" } },
  contentFields: [
    { key: "url", label: "URL do vídeo (mp4)", type: "text" },
    { key: "autoplay", label: "Reproduzir automaticamente", type: "boolean" },
    { key: "loop", label: "Repetir", type: "boolean" },
    { key: "muted", label: "Sem áudio", type: "boolean" },
  ],
  render: ({ node, style, rootProps }) => {
    const url = (node.props.url as string) || "";
    if (!url) {
      return (
        <div {...rootProps} style={style} className="flex items-center justify-center bg-muted text-muted-foreground text-xs uppercase tracking-widest">
          Sem vídeo
        </div>
      );
    }
    return (
      <video
        {...rootProps}
        src={url}
        style={style}
        className="object-cover"
        autoPlay={!!node.props.autoplay}
        loop={!!node.props.loop}
        muted={node.props.muted !== false}
        playsInline
        controls={!node.props.autoplay}
      />
    );
  },
};

export const galleryDef: StudioNodeDefinition = {
  type: "gallery",
  label: "Galeria",
  category: "media",
  icon: "GalleryHorizontal",
  allowChildren: false,
  defaultProps: { images: [] as string[] },
  defaultStyles: { desktop: { display: "grid", columns: 3, gap: "12px" }, mobile: { columns: 2 } },
  contentFields: [{ key: "images", label: "Imagens", type: "list" }],
  render: ({ node, style, rootProps }) => {
    const images = (node.props.images as string[]) || [];
    if (!images.length) {
      return (
        <div {...rootProps} style={style} className="w-full aspect-video flex items-center justify-center bg-muted text-muted-foreground text-xs uppercase tracking-widest">
          Galeria vazia — adicione imagens na aba Mídia
        </div>
      );
    }
    return (
      <div {...rootProps} style={style}>
        {images.map((src, i) => (
          <div key={i} className="aspect-square overflow-hidden rounded-lg bg-muted">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  },
};

const ICONS: Record<string, string> = {
  heart: "♥",
  star: "★",
  check: "✓",
  gem: "◆",
  sparkle: "✦",
};

export const iconDef: StudioNodeDefinition = {
  type: "icon",
  label: "Ícone",
  category: "media",
  icon: "Sparkles",
  allowChildren: false,
  defaultProps: { name: "sparkle" },
  defaultStyles: { desktop: { fontSize: "32px", color: "hsl(var(--primary))" } },
  contentFields: [
    {
      key: "name",
      label: "Ícone",
      type: "select",
      options: Object.keys(ICONS).map((k) => ({ label: k, value: k })),
    },
  ],
  render: ({ node, style, rootProps }) => (
    <span {...rootProps} style={style} aria-hidden>
      {ICONS[(node.props.name as string) || "sparkle"] || "✦"}
    </span>
  ),
};
