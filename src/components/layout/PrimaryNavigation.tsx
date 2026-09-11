import { PRIMARY_ROUTES, pathForRoute, primaryRouteFor, type RouteMatch } from "@app/routes";
import styles from "./layout.module.css";

interface PrimaryNavigationProps {
  readonly route: RouteMatch;
  readonly navigate: (to: string) => void;
}

export function PrimaryNavigation({ route, navigate }: PrimaryNavigationProps) {
  const active = primaryRouteFor(route.kind);
  return (
    <nav className={styles.navigation} aria-label="Destinos principais">
      <div className={styles.navigationList}>
        {PRIMARY_ROUTES.map((item) => {
          const selected = active === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className={[styles.navItem, selected ? styles.navItemActive : ""].filter(Boolean).join(" ")}
              aria-current={selected ? "page" : undefined}
              onClick={() => navigate(pathForRoute(item.id))}
            >
              <span className={styles.navGlyph} aria-hidden="true">{item.id === "character" ? "◈" : item.id === "actions" ? "✦" : item.id === "journey" ? "⌁" : "♜"}</span>
              <span className={styles.navLabel}>{item.label}</span>
              <span className={styles.navShortLabel}>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.navigationRule} aria-hidden="true" />
      <button type="button" className={styles.navUtility} onClick={() => navigate("/settings")} aria-current={route.kind === "settings" ? "page" : undefined}>
        <span className={styles.navGlyph} aria-hidden="true">⚙</span><span>Configurações</span>
      </button>
    </nav>
  );
}
