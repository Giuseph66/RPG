import { Button, InlineStatus, SectionCard } from "@components/ui";
import type { RouteMatch } from "@app/routes";
import type { SessionCharacter } from "./layout.types";
import styles from "./layout.module.css";

interface RouteFallbackProps {
  readonly route: RouteMatch;
  readonly session?: SessionCharacter;
  readonly navigate: (to: string) => void;
  readonly onCreateCharacter?: () => void;
  readonly onImportCharacter?: () => void;
}

const CONTENT: Record<string, { eyebrow: string; title: string; description: string }> = {
  character: { eyebrow: "FICHA ATIVA", title: "Personagem", description: "Seu estado de mesa, escolhas e recursos ficam reunidos aqui." },
  actions: { eyebrow: "PRONTO PARA AGIR", title: "Ações", description: "Ações disponíveis entram neste espaço conforme as features forem conectadas." },
  journey: { eyebrow: "REGISTRO DA MESA", title: "Jornada", description: "Mapa, diário, objetivos e pessoas importantes da campanha." },
  compendium: { eyebrow: "FONTE LOCAL", title: "Compêndio", description: "Consulte regras e definições do pack local sem perder o contexto da sessão." },
  settings: { eyebrow: "FERRAMENTAS", title: "Configurações", description: "Preferências da mesa e do comportamento local." },
};

export function RouteFallback({ route, session, navigate, onCreateCharacter, onImportCharacter }: RouteFallbackProps) {
  if (route.kind === "not-found") {
    return <section className={styles.routeContent} aria-labelledby="route-title"><p className={styles.eyebrow}>CAMINHO INDISPONÍVEL</p><h1 id="route-title" tabIndex={-1} className={styles.pageTitle}>Rota não encontrada</h1><InlineStatus tone="warning">Esta rota não existe. O mapa da mesa continua disponível.</InlineStatus><Button onClick={() => navigate("/character")}>Voltar à ficha</Button></section>;
  }

  if (route.kind === "onboarding" || (route.kind === "character" && route.params.mode === "create")) {
    return (
      <section className={styles.routeContent} aria-labelledby="route-title">
        <p className={styles.eyebrow}>PRIMEIRA RODADA</p>
        <h1 id="route-title" tabIndex={-1} className={styles.pageTitle}>Abra sua mesa</h1>
        <p className={styles.lead}>Crie ou importe uma ficha para começar. O Compêndio e as rolagens avulsas continuam disponíveis.</p>
        <div className={styles.actionRow}><Button onClick={onCreateCharacter ?? (() => navigate("/character/create"))}>Criar personagem</Button><Button variant="secondary" onClick={onImportCharacter}>Importar backup</Button></div>
        <SectionCard heading="Sem personagem ativo" headingLevel={2}><p className={styles.cardCopy}>Nenhuma estatística foi inventada. Quando a ficha estiver pronta, PV, recurso e condições aparecerão no cabeçalho.</p><Button variant="ghost" onClick={() => navigate("/compendium")}>Abrir Compêndio</Button></SectionCard>
      </section>
    );
  }

  const content = CONTENT[route.kind] ?? CONTENT.character;
  const needsCharacter = route.kind === "actions" || route.kind === "journey";
  return (
    <section className={styles.routeContent} aria-labelledby="route-title">
      <p className={styles.eyebrow}>{content.eyebrow}</p>
      <h1 id="route-title" tabIndex={-1} className={styles.pageTitle}>{content.title}</h1>
      <p className={styles.lead}>{content.description}</p>
      {needsCharacter && !session?.value ? (
        <InlineStatus tone="info">Esta área precisa de uma ficha ativa. Você ainda pode consultar o Compêndio e abrir dados avulsos.</InlineStatus>
      ) : (
        <SectionCard heading={route.kind === "compendium" ? "Índice local" : "Ponto de entrada"} headingLevel={2}>
          <p className={styles.cardCopy}>{route.kind === "compendium" ? "Categorias e detalhes referenciados serão conectados ao índice do pack." : "O slot da feature está pronto para receber o fluxo da mesa."}</p>
          {route.kind === "character" ? <Button variant="secondary" onClick={() => navigate("/character/create")}>Editar ou criar ficha</Button> : null}
        </SectionCard>
      )}
    </section>
  );
}
