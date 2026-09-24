import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  /** Accessible name for the tablist. */
  label: string;
  tabs: TabItem[];
  activeId?: string;
  defaultActiveId?: string;
  onChange?: (id: string) => void;
  /** Keep inactive panels mounted when switching tabs, preserving their local state. */
  keepMounted?: boolean;
}

function firstEnabledId(tabs: TabItem[]): string | undefined {
  return tabs.find((tab) => !tab.disabled)?.id;
}

function resolveActiveId(
  tabs: TabItem[],
  requestedId: string | undefined,
): string | undefined {
  const requestedTab = tabs.find((tab) => tab.id === requestedId);
  return requestedTab && !requestedTab.disabled
    ? requestedTab.id
    : firstEnabledId(tabs);
}

export function Tabs({ label, tabs, activeId, defaultActiveId, onChange, keepMounted = false }: TabsProps) {
  const baseId = useId();
  const isControlled = activeId !== undefined;
  const [internalActiveId, setInternalActiveId] = useState(
    () => resolveActiveId(tabs, defaultActiveId),
  );
  const currentActiveId = resolveActiveId(
    tabs,
    isControlled ? activeId : internalActiveId,
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function selectTab(id: string) {
    if (!isControlled) {
      setInternalActiveId(id);
    }
    onChange?.(id);
  }

  function focusTab(id: string) {
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabledIndexes = tabs
      .map((tab, i) => ({ tab, i }))
      .filter(({ tab }) => !tab.disabled)
      .map(({ i }) => i);

    if (enabledIndexes.length === 0) return;

    const currentPosition = enabledIndexes.indexOf(index);

    function moveTo(position: number) {
      const wrapped =
        ((position % enabledIndexes.length) + enabledIndexes.length) %
        enabledIndexes.length;
      const nextIndex = enabledIndexes[wrapped];
      const nextTab = tabs[nextIndex];
      focusTab(nextTab.id);
      selectTab(nextTab.id);
    }

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveTo(currentPosition + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveTo(currentPosition - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(enabledIndexes.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div className={styles.wrapper}>
      <div role="tablist" aria-label={label} className={styles.tablist}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === currentActiveId;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              aria-disabled={tab.disabled ? true : undefined}
              tabIndex={isActive ? 0 : -1}
              className={[styles.tab, isActive ? styles.active : ""]
                .filter(Boolean)
                .join(" ")}
              disabled={tab.disabled}
              onClick={() => {
                if (tab.disabled) return;
                selectTab(tab.id);
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const isActive = tab.id === currentActiveId;
        const tabId = `${baseId}-tab-${tab.id}`;
        const panelId = `${baseId}-panel-${tab.id}`;
        return (
          <div
            key={tab.id}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            hidden={!isActive}
            className={styles.panel}
          >
            {keepMounted || isActive ? tab.panel : null}
          </div>
        );
      })}
    </div>
  );
}
