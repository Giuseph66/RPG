export type PrimaryRouteId = "character" | "actions" | "journey" | "compendium" | "account" | "collaboration";

export interface PrimaryRoute {
  readonly id: PrimaryRouteId;
  readonly label: string;
  readonly shortLabel: string;
  readonly path: `/${string}`;
  readonly question: string;
}

export const PRIMARY_ROUTES: readonly PrimaryRoute[] = [
  { id: "character", label: "Personagem", shortLabel: "Ficha", path: "/character", question: "Quem sou e qual meu estado?" },
  { id: "actions", label: "Ações", shortLabel: "Ações", path: "/actions", question: "O que posso usar agora?" },
  { id: "journey", label: "Jornada", shortLabel: "Jornada", path: "/journey", question: "Onde estamos e o que aconteceu?" },
  { id: "compendium", label: "Compêndio", shortLabel: "Regras", path: "/compendium", question: "Como funciona?" },
  { id: "account", label: "Conta", shortLabel: "Conta", path: "/account", question: "Quem está na mesa?" },
  { id: "collaboration", label: "Mesa", shortLabel: "Mesa", path: "/collaboration", question: "Quem joga conosco?" },
];

export type AppRouteKind = PrimaryRouteId | "session" | "settings" | "account" | "data" | "onboarding" | "not-found";

export interface RouteMatch {
  readonly kind: AppRouteKind;
  readonly path: string;
  readonly primary?: PrimaryRouteId;
  readonly params: Readonly<Record<string, string>>;
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Resolves the complete URL path while keeping feature state out of the URL. */
export function matchRoute(pathname: string): RouteMatch {
  const path = pathname.split(/[?#]/)[0] || "/";
  const segments = path.split("/").filter(Boolean).map(decode);
  const [first, second, third] = segments;

  if (!first) return { kind: "onboarding", path, params: {} };
  if (first === "settings" && segments.length === 1) return { kind: "settings", path, params: {} };
  if (first === "account" && segments.length === 1) return { kind: "account", path, params: {} };
  if (first === "collaboration" && segments.length === 1) return { kind: "collaboration", primary: "collaboration", path, params: {} };
  if (first === "session" && second && segments.length === 2) return { kind: "session", path, params: { campaignId: second } };
  if ((first === "data" || (first === "settings" && second === "data")) && (segments.length === 1 || segments.length === 2)) {
    return { kind: "data", path, params: {} };
  }
  if (first === "character") {
    if (second === "create") return { kind: "character", primary: "character", path, params: { mode: "create" } };
    if (second) return { kind: "character", primary: "character", path, params: { id: second } };
    return { kind: "character", primary: "character", path, params: {} };
  }
  if (first === "actions") return { kind: "actions", primary: "actions", path, params: {} };
  if (first === "journey") return { kind: "journey", primary: "journey", path, params: second ? { id: second } : {} };
  if (first === "compendium") {
    return {
      kind: "compendium",
      primary: "compendium",
      path,
      params: second ? { type: second, ...(third ? { id: third } : {}) } : {},
    };
  }
  return { kind: "not-found", path, params: {} };
}

export function primaryRouteFor(kind: AppRouteKind): PrimaryRouteId | undefined {
  return kind === "character" || kind === "actions" || kind === "journey" || kind === "compendium" || kind === "account" || kind === "collaboration"
    ? kind
    : undefined;
}

export function pathForRoute(id: PrimaryRouteId): string {
  return PRIMARY_ROUTES.find((route) => route.id === id)?.path ?? "/character";
}
