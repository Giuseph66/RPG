import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";

type IconMap = Readonly<Record<string, IconType>>;

let loaded: IconMap | undefined;
let pending: Promise<IconMap> | undefined;

function loadIcons(): Promise<IconMap> {
  pending ??= import("./spell-icons").then((module) => { loaded = module.SPELL_ICONS; return loaded; });
  return pending;
}

/** Ícone específico da magia (361 no total); usa `fallback` enquanto o mapa carrega. */
export function SpellIcon({ spellId, fallback }: { readonly spellId: string; readonly fallback: ReactNode }) {
  const [icons, setIcons] = useState<IconMap | undefined>(loaded);
  useEffect(() => {
    if (icons) return;
    let active = true;
    void loadIcons().then((map) => { if (active) setIcons(map); });
    return () => { active = false; };
  }, [icons]);
  const Icon = icons?.[spellId];
  return Icon ? <Icon /> : <>{fallback}</>;
}
