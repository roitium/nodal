import { useCallback, useEffect, useRef } from "react";

export function useLightboxHistory(
  open: boolean,
  setOpen: (open: boolean) => void,
) {
  const hasStateRef = useRef(false);

  useEffect(() => {
    if (open && !hasStateRef.current) {
      window.history.pushState(
        { ...window.history.state, __nodalLightbox: true },
        "",
      );
      hasStateRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    const onPopState = () => {
      if (hasStateRef.current) {
        hasStateRef.current = false;
        setOpen(false);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setOpen]);

  const closeWithHistory = useCallback(() => {
    if (hasStateRef.current) {
      window.history.back();
      return;
    }

    setOpen(false);
  }, [setOpen]);

  return { closeWithHistory };
}
