import { createContext, useContext } from "react";

/**
 * Lets an immersive route (the chat) ask the shell to fold the app bar and bottom navigation away
 * on small screens, and to bring them back on demand.
 */
export interface ShellChrome {
  /** True when the current route folds the bars away by default. */
  readonly supported: boolean;
  /** True while the bars are folded away. */
  readonly collapsed: boolean;
  readonly setCollapsed: (collapsed: boolean) => void;
}

export const ShellChromeContext = createContext<ShellChrome>({ supported: false, collapsed: false, setCollapsed: () => {} });

export const useShellChrome = () => useContext(ShellChromeContext);
