import { useEffect, useRef } from "react";
import { useStudioStore } from "../store/StudioStoreContext";
import { saveDraftNodes } from "./studioApi";

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function useAutosave(storeId: string | null, pageType: string) {
  const { state, dispatch } = useStudioStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!storeId || !state.dirty) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
      try {
        await saveDraftNodes(storeId, pageType, state.document.nodes);
        dispatch({ type: "MARK_SAVED" });
      } catch {
        dispatch({ type: "SET_SAVE_STATUS", status: "error" });
      } finally {
        savingRef.current = false;
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.document.nodes, state.dirty, storeId, pageType]);

  const saveNow = async () => {
    if (!storeId) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
    try {
      await saveDraftNodes(storeId, pageType, state.document.nodes);
      dispatch({ type: "MARK_SAVED" });
    } catch {
      dispatch({ type: "SET_SAVE_STATUS", status: "error" });
      throw new Error("Falha ao salvar");
    }
  };

  return { saveNow };
}
