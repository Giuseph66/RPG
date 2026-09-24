import { PRIMARY_NAV_ROUTES, pathForRoute, primaryRouteFor, type RouteMatch } from "@app/routes";
import { GiCrossedSwords, GiPerson, GiScrollUnfurled, GiSpellBook, User } from "../../assets/icons";
import diceMedallion from "../../assets/art/icons/d20-medallion.webp";
import styles from "./layout.module.css";

interface PrimaryNavigationProps {
  readonly route: RouteMatch;
  readonly navigate: (to: string) => void;
  readonly isCampaignMaster?: boolean;
  readonly onOpenDice?: () => void;
}

export function PrimaryNavigation({ route, navigate, isCampaignMaster = false, onOpenDice }: PrimaryNavigationProps) {
  const active = primaryRouteFor(route.kind);
  return (
    <nav className={styles.navigation} aria-label="Destinos principais">
      <p className={styles.navSectionLabel}>{isCampaignMaster ? "Mesa do mestre" : "Sua aventura"}</p>
      <div className={styles.navigationList}>
        {PRIMARY_NAV_ROUTES.map((item) => {
          const campaignCharacters = item.id === "character" && isCampaignMaster;
          const selected = active === item.id;
          const label = campaignCharacters ? "Personagens" : item.label;
          const shortLabel = campaignCharacters ? "Personagens" : item.shortLabel;
          return (
            <button
              key={item.id}
              type="button"
              className={[styles.navItem, styles[`nav-${item.id}` as keyof typeof styles], selected ? styles.navItemActive : ""].filter(Boolean).join(" ")}
              aria-current={selected ? "page" : undefined}
              onClick={() => navigate(pathForRoute(item.id))}
            >
              <span className={styles.navGlyph} aria-hidden="true">{item.id === "character" ? <GiPerson /> : item.id === "actions" ? <GiCrossedSwords /> : item.id === "journey" ? <GiScrollUnfurled /> : item.id === "compendium" ? <GiSpellBook /> : item.id === "account" ? <User weight="fill" /> : <GiPerson />}</span>
              <span className={styles.navLabel}>{label}</span>
              <span className={styles.navShortLabel}>{shortLabel}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className={[styles.navItem, styles.navDice].join(" ")} onClick={() => onOpenDice?.()} aria-label="Abrir rolagem de dados">
        <span className={styles.navDiceMark} aria-hidden="true"><img className={styles.navDiceImage} src={diceMedallion} alt="" /></span>
        <span className={styles.navLabel}>Dados</span><span className={styles.navShortLabel}>D20</span>
      </button>
      <div className={styles.navigationRule} aria-hidden="true" />
      <button type="button" className={styles.navUtility} onClick={() => navigate("/settings")} aria-current={route.kind === "settings" ? "page" : undefined}>
        <span className={styles.navGlyph} aria-hidden="true">⚙</span><span>Configurações</span>
      </button>
    </nav>
  );
}
