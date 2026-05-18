import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadActivePopup, StorePopup as PopupType } from "@/lib/storePopups";

export const StorePopup = () => {
  const [popup, setPopup] = useState<PopupType | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadActivePopup().then((p) => {
      if (!mounted || !p) return;
      const dismissedKey = `aura:popup:dismissed:${p.id}`;
      if (sessionStorage.getItem(dismissedKey)) return;
      setPopup(p);
      setOpen(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o && popup) {
      sessionStorage.setItem(`aura:popup:dismissed:${popup.id}`, "1");
    }
  };

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">{popup.title || "Aviso"}</DialogTitle>
        <DialogDescription className="sr-only">{popup.message}</DialogDescription>
        {popup.imageUrl && (
          <img src={popup.imageUrl} alt={popup.title} className="w-full h-auto max-h-72 object-cover" />
        )}
        <div className="p-6 space-y-3 text-center">
          {popup.title && <h2 className="font-display text-2xl">{popup.title}</h2>}
          {popup.message && <p className="text-sm text-muted-foreground whitespace-pre-line">{popup.message}</p>}
          {popup.ctaLabel && popup.ctaUrl && (
            <a href={popup.ctaUrl} target="_blank" rel="noreferrer" className="inline-block pt-2">
              <Button variant="gold">{popup.ctaLabel}</Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
