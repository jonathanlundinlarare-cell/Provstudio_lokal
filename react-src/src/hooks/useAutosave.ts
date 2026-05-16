import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved";

/**
 * Generic debounced autosave hook.
 *
 * Usage:
 *   const saveState = useAutosave(
 *     JSON.stringify({ title, design, order }),   // change-detection key
 *     () => { documents.update(...); scheduleSave(); }, // stable-via-ref save fn
 *     loading,
 *   );
 *
 * The `save` callback is always called with its latest closure — you don't
 * need to wrap it in useCallback. The hook captures it in a ref internally.
 */
export function useAutosave(
  serializedPayload: string,
  save: () => void,
  loading: boolean,
  debounceMs = 1500,
): SaveState {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const lastSaved = useRef("");
  // Always point to the latest save function without re-triggering effects
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (loading) return;
    if (serializedPayload === lastSaved.current) return;
    setSaveState("saving");
    const h = setTimeout(() => {
      saveRef.current();
      lastSaved.current = serializedPayload;
      setSaveState("saved");
    }, debounceMs);
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedPayload, loading, debounceMs]);

  return saveState;
}
