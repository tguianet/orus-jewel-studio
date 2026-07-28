import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { CloudStoreProduct } from "@/lib/cloudStore";

type Props = {
  product: CloudStoreProduct;
  storeSlug: string;
  density?: "default" | "compact" | "large";
  onMobileTap?: (p: CloudStoreProduct) => void;
  showHeart?: boolean;
  emphasizePrice?: boolean;
};

export function StoreProductCard({
  product,
  storeSlug,
  density = "default",
  onMobileTap,
  showHeart = true,
  emphasizePrice = false,
}: Props) {
  const mobile = (
    <button type="button" onClick={() => onMobileTap?.(product)} className="group block text-left w-full">
      <div className={`relative overflow-hidden bg-secondary/50 mb-2 ${density === "large" ? "aspect-[4/5]" : "aspect-square"}`}>
        <img src={product.image} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground truncate">{product.category}</p>
      <h3 className="font-display text-[12px] font-light leading-tight mt-0.5 line-clamp-2">{product.name}</h3>
      <p
        className={`mt-1 font-light ${emphasizePrice ? "text-sm font-medium" : "text-[12px]"}`}
        style={{ color: "hsl(var(--primary-deep))" }}
      >
        {formatBRL(product.resellerPrice)}
      </p>
      {emphasizePrice && (
        <p className="text-[10px] text-muted-foreground mt-0.5">em até 10x sem juros*</p>
      )}
    </button>
  );

  const desktop = (
    <Link to={`/loja/${storeSlug}/produto/${product.id}`} className="group block">
      <div
        className={`relative overflow-hidden bg-secondary/50 mb-5 transition-all duration-500 group-hover:shadow-[0_30px_60px_-20px_rgba(17,17,17,0.18)] ${
          density === "compact" ? "aspect-square mb-3" : density === "large" ? "aspect-[4/5] mb-4" : "aspect-square"
        }`}
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
        />
        {showHeart && (
          <span className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Heart className="h-4 w-4 text-foreground" />
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{product.category}</p>
      <h3
        className={`font-display font-light leading-tight mt-1.5 group-hover:text-primary transition-colors duration-300 ${
          density === "compact" ? "text-base" : "text-xl"
        }`}
      >
        {product.name}
      </h3>
      <p
        className={`mt-2 font-light tracking-wide ${emphasizePrice ? "text-lg font-medium" : "text-[15px]"}`}
        style={{ color: "hsl(var(--primary-deep))" }}
      >
        {formatBRL(product.resellerPrice)}
      </p>
      {emphasizePrice && (
        <p className="text-xs text-muted-foreground mt-1">Parcele em até 10x sem juros*</p>
      )}
    </Link>
  );

  return (
    <>
      <div className="sm:hidden">{mobile}</div>
      <div className="hidden sm:block">{desktop}</div>
    </>
  );
}
