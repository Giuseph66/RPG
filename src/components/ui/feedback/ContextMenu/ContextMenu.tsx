import { useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { useEscapeKey } from "../internal/useEscapeKey";
import { useOutsideClick } from "../internal/useOutsideClick";
import styles from "./ContextMenu.module.css";

export interface ContextMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface ContextMenuProps {
  /** Accessible name for both the trigger button and the menu. */
  label: string;
  items: ContextMenuItem[];
}

function enabledIndexes(items: ContextMenuItem[]): number[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.disabled)
    .map(({ index }) => index);
}

/**
 * Self-contained composite: always renders its own visible trigger
 * button (never relies on right-click/long-press as the only way in).
 */
export function ContextMenu({ label, items }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseId = useId();

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEscapeKey(open, close);
  useOutsideClick(menuRef, open, close, triggerRef);

  // Focus the first enabled item once the menu has actually been
  // committed to the DOM (not right after calling setOpen, whose effect
  // on the DOM is deferred to the next render/commit).
  useLayoutEffect(() => {
    if (!open) return;
    const firstEnabled = items.find((item) => !item.disabled);
    if (firstEnabled) {
      itemRefs.current[firstEnabled.id]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleItemKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const indexes = enabledIndexes(items);
    if (indexes.length === 0) return;
    const currentPosition = indexes.indexOf(index);

    function moveTo(position: number) {
      const wrapped = ((position % indexes.length) + indexes.length) % indexes.length;
      const nextIndex = indexes[wrapped];
      itemRefs.current[items[nextIndex].id]?.focus();
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(currentPosition + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(currentPosition - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(indexes.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-menu` : undefined}
        className={styles.trigger}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {label}
      </button>
      {open ? (
        <ul
          ref={menuRef}
          id={`${baseId}-menu`}
          role="menu"
          aria-label={label}
          className={styles.menu}
        >
          {items.map((item, index) => (
            <li key={item.id} role="none">
              <button
                ref={(el) => {
                  itemRefs.current[item.id] = el;
                }}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                tabIndex={-1}
                className={styles.menuItem}
                onClick={() => {
                  if (item.disabled) return;
                  item.onSelect();
                  close();
                }}
                onKeyDown={(event) => handleItemKeyDown(event, index)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
