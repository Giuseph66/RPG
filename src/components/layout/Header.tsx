import { IconButton } from "@components/ui";
import { Gear } from "../../assets/icons";
import campaignSigil from "../../assets/art/icons/campaign-sigil.webp";
import type { Character } from "@domain/contracts/character";
import type { RouteMatch } from "@app/routes";
import styles from "./layout.module.css";
import type { SessionCampaign, SessionCharacter } from "./layout.types";

interface HeaderProps {
  readonly session?: SessionCharacter;
  readonly campaign?: SessionCampaign;
  readonly route: RouteMatch;
  readonly navigate: (to: string) => void;
  readonly onSelectCharacter?: () => void;
}

function routeContext(route: RouteMatch, character?: Character, campaign?: SessionCampaign): string {
  const campaignName = campaign?.value?.name;
  switch (route.kind) {
    case "journey": return campaignName ?? "Jornada";
    case "character": return character?.name ?? "Ficha";
    case "actions": return character ? `Ações · ${character.name}` : "Ações";
    case "compendium": return "Regras";
    case "account": return "Conta";
    case "collaboration": return "Mesa compartilhada";
    case "settings": return "Ajustes";
    case "data": return "Dados";
    case "session": return campaignName ?? "Sessão";
    case "onboarding": return character?.name ?? "Nenhum personagem";
    default: return campaignName ?? "Visão geral";
  }
}

export function Header({ session, campaign, route, navigate, onSelectCharacter }: HeaderProps) {
  const character = session?.value ?? undefined;
  const context = routeContext(route, character, campaign);

  return (
    <header className={styles.header} aria-label="Mesa de campanha">
      <div className={styles.headerInner}>
        <button
          type="button"
          className={styles.identityButton}
          onClick={onSelectCharacter ?? (() => navigate("/character"))}
          aria-label="Abrir ficha de personagem"
        >
          <span className={styles.brandMark}><img className={styles.brandMarkImage} src={campaignSigil} alt="" /></span>
          <span className={styles.identityCopy}>
            <span className={styles.identityName}>Mesa de campanha</span>
            <span className={styles.identityContext}>{context}</span>
          </span>
        </button>
        <div className={styles.headerActions}>
          <IconButton label="Abrir ajustes" icon={<Gear size={20} weight="duotone" />} variant="ghost" className={styles.headerSettingsButton} onClick={() => navigate("/settings")} />
        </div>
      </div>
    </header>
  );
}
