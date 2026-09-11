import { useEffect, useRef } from "react";

type EscapeEntry = {
  onEscape: () => void;
};

const escapeStack: EscapeEntry[] = [];

function handleDocumentKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  escapeStack.at(-1)?.onEscape();
}

function addEscapeEntry(entry: EscapeEntry): () => void {
  if (escapeStack.length === 0) {
    document.addEventListener("keydown", handleDocumentKeyDown);
  }
  escapeStack.push(entry);

  return () => {
    const index = escapeStack.indexOf(entry);
    if (index !== -1) escapeStack.splice(index, 1);
    if (escapeStack.length === 0) {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    }
  };
}

/** Calls only the topmost active overlay's `onEscape` callback. */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;

    return addEscapeEntry({
      onEscape: () => onEscapeRef.current(),
    });
  }, [active]);
}
