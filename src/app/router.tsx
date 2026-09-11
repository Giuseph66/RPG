import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AppShell, type AppShellProps } from "@components/layout/AppShell";
import { SettingsPanel } from "@features/settings";
import { matchRoute, type RouteMatch } from "./routes";

export interface AppRouterProps extends Omit<AppShellProps, "children" | "route"> {
  /** Route outlet owned by CORE-002 and the feature owners. */
  readonly renderRoute?: (match: RouteMatch) => ReactNode;
  /** Useful for isolated tests and embedded previews; browser navigation remains the default. */
  readonly initialPath?: string;
}

export interface AppNavigation {
  readonly path: string;
  readonly match: RouteMatch;
  readonly navigate: (to: string) => void;
}

export function useAppNavigation(initialPath = "/"): AppNavigation {
  const [path, setPath] = useState(() => initialPath || (typeof window !== "undefined" ? window.location.pathname : "/") || "/");

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = to || "/";
    if (next === window.location.pathname) {
      setPath(next);
      return;
    }
    window.history.pushState({}, "", next);
    setPath(next);
  }, []);

  return useMemo(() => ({ path, match: matchRoute(path), navigate }), [path, navigate]);
}

/** Small History API router: keeps the shell usable without adding a package. */
export function AppRouter({ renderRoute, initialPath, diceOverlayController, ...shellProps }: AppRouterProps) {
  const navigation = useAppNavigation(initialPath);
  const outlet = renderRoute?.(navigation.match) ?? (navigation.match.kind === "settings" ? <SettingsPanel store={shellProps.settingsStore} /> : undefined);

  return (
    <AppShell
      {...shellProps}
      diceOverlayController={diceOverlayController}
      route={navigation.match}
      navigate={navigation.navigate}
    >
      {outlet}
    </AppShell>
  );
}
