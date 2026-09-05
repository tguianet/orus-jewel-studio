import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { loadCurrentSellerStore } from "@/lib/storeTheme";
import { StudioStoreProvider, useStudioStore } from "@/features/studio/store/StudioStoreContext";
import { useStudioSourceData } from "@/features/studio/store/useStudioSourceData";
import { convertLegacyThemeToStudioDocument } from "@/features/studio/adapters/convertLegacyTheme";
import { loadStudioDraft, saveDraftNodes, publishStudioDocument, HOME_PAGE_TYPE } from "@/features/studio/persistence/studioApi";
import { useAutosave } from "@/features/studio/persistence/useAutosave";
import { Topbar } from "@/features/studio/toolbar/Topbar";
import { StudioSidebar } from "@/features/studio/sidebar/StudioSidebar";
import { Canvas } from "@/features/studio/canvas/Canvas";
import { Inspector } from "@/features/studio/inspector/Inspector";
import { PreviewOverlay } from "@/features/studio/components/PreviewOverlay";
import { StudioDataProvider } from "@/features/studio/registry/renderTree";
import { generateNodeId } from "@/features/studio/utils/tree";
import type { StudioPageDocument } from "@/features/studio/types/document";
import { Loader2 } from "lucide-react";

const SellerStudioV2 = () => {
  const { profile } = useAuth();
  const [document, setDocument] = useState<StudioPageDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!profile?.storeId) return;
    (async () => {
      try {
        const draft = await loadStudioDraft(profile.storeId!, HOME_PAGE_TYPE);
        if (draft) {
          if (mounted) setDocument(draft);
          return;
        }
        const legacy = await loadCurrentSellerStore(profile.storeId!);
        if (!legacy) {
          if (mounted) setLoadError("Nenhuma loja aprovada encontrada.");
          return;
        }
        const nodes = convertLegacyThemeToStudioDocument({
          store: { storeName: legacy.storeName, storeSlug: legacy.storeSlug, phone: legacy.contactPhone },
          theme: legacy.theme,
        });
        const initialDoc: StudioPageDocument = {
          id: generateNodeId(),
          storeId: profile.storeId!,
          pageType: HOME_PAGE_TYPE,
          version: 0,
          nodes,
        };
        await saveDraftNodes(profile.storeId!, HOME_PAGE_TYPE, nodes);
        if (mounted) setDocument(initialDoc);
      } catch (err) {
        if (mounted) setLoadError(err instanceof Error ? err.message : "Não foi possível carregar o Studio.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profile?.storeId]);

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StudioStoreProvider document={document}>
      <StudioV2Shell storeName={profile?.displayName || "Minha loja"} storeSlug={profile?.storeSlug || null} storeId={profile?.storeId || null} />
    </StudioStoreProvider>
  );
};

function StudioV2Shell({ storeName, storeSlug, storeId }: { storeName: string; storeSlug: string | null; storeId: string | null }) {
  const { state, dispatch } = useStudioStore();
  const { data, loading } = useStudioSourceData({ storeId, storeSlug, storeName });
  const { saveNow } = useAutosave(storeId, HOME_PAGE_TYPE);
  const [zoom, setZoom] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      await saveNow();
      toast.success("Rascunho salvo.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }, [saveNow]);

  const handlePublish = useCallback(async () => {
    if (!storeId) return;
    setPublishing(true);
    try {
      await publishStudioDocument(storeId, HOME_PAGE_TYPE, state.document.nodes);
      toast.success("Loja publicada com sucesso!");
    } catch {
      toast.error("Não foi possível publicar.");
    } finally {
      setPublishing(false);
    }
  }, [storeId, state.document.nodes]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditableTarget =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !isEditableTarget) {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: "REDO" });
        else dispatch({ type: "UNDO" });
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !isEditableTarget && state.selectedId) {
        e.preventDefault();
        dispatch({ type: "REMOVE_NODE", nodeId: state.selectedId });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, state.selectedId]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <Topbar
        storeName={storeName}
        storeSlug={storeSlug}
        zoom={zoom}
        onZoomChange={setZoom}
        onPreview={() => setPreviewOpen(true)}
        onSave={() => void handleSave()}
        onPublish={() => void handlePublish()}
        publishing={publishing}
      />
      <StudioDataProvider value={data}>
        <div className="flex-1 min-h-0 flex">
          <StudioSidebar storeId={storeId} />
          <Canvas data={data} loading={loading} zoom={zoom} />
          <Inspector />
        </div>
        {previewOpen && <PreviewOverlay nodes={state.document.nodes} data={data} onClose={() => setPreviewOpen(false)} />}
      </StudioDataProvider>
    </div>
  );
}

export default SellerStudioV2;
