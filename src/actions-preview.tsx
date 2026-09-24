import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@styles/index.css";
import { AppShell } from "@components/layout/AppShell";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asCommandId, asUuid } from "@domain/contracts/ids";
import { matchRoute } from "@app/routes";
import { Actions } from "@features/actions/Actions";

const character = { ...minimalCharacter, id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), name: "Aric Valenar" };
const preview = { status: "success", nextState: character, effects: [], explanations: [], sourceRefs: [] };
const capabilities = [
  ["Ataque", "attack", "Role o ataque e confira a defesa do alvo."],
  ["Magias", "spell", "Conjure um efeito sem perder o foco da mesa."],
  ["Teste de perícia", "resource", "Use suas proficiências em um desafio."],
  ["Iniciativa", "attack", "Defina a ordem do próximo confronto."],
  ["Descanso curto", "rest", "Recupere recursos antes de seguir."],
  ["Descanso longo", "rest", "Restaure seus pontos de vida."],
  ["Condições", "concentration", "Revise efeitos e concentração ativa."],
].map(([label, kind, description], index) => ({
  id: `preview-${index}`,
  commandId: asCommandId(`preview-command-${index}`),
  kind,
  label,
  description,
  status: "available",
  costs: [{ label: "Ação", value: "1" }],
  effectSummary: ["Efeito pronto para revisão."],
  preview,
}));

const dice = {
  history: [
    { id: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), expression: { quantity: 1, faces: 20, modifier: 0, mode: "normal" }, rawDice: [20], total: 20 },
    { id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), expression: { quantity: 1, faces: 8, modifier: 0, mode: "normal" }, rawDice: [7], total: 7 },
    { id: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), expression: { quantity: 1, faces: 20, modifier: 0, mode: "normal" }, rawDice: [14], total: 14 },
  ],
  busy: false,
  onRoll: () => undefined,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppShell character={{ value: character, status: "ready" }} route={matchRoute("/actions")} navigate={() => undefined}>
      <Actions character={character} capabilities={capabilities as never} availableActions={["action", "bonus-action", "reaction", "free"]} dice={dice as never} onIntent={() => undefined} />
    </AppShell>
  </StrictMode>,
);
