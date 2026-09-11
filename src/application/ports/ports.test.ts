import { describe, expect, it } from "vitest";

import { type CampaignRepository } from "./campaign-repository";
import { type CharacterRepository } from "./character-repository";
import { type DiceHistoryRepository } from "./dice-history-repository";
import { type TransactionContext, type UnitOfWork } from "./unit-of-work";
import { type Revision } from "@domain/contracts/versioning";

type HasRevisionAt<T extends readonly unknown[], Index extends number> = T[Index] extends Revision ? true : false;

describe("ports de persistência", () => {
  it("exige CAS da campanha nas mutações de quests e NPCs", () => {
    type SaveQuestHasCas = HasRevisionAt<Parameters<CampaignRepository["saveQuest"]>, 2>;
    type DeleteQuestHasCas = HasRevisionAt<Parameters<CampaignRepository["deleteQuest"]>, 2>;
    type SaveNpcHasCas = HasRevisionAt<Parameters<CampaignRepository["saveNpc"]>, 2>;
    type DeleteNpcHasCas = HasRevisionAt<Parameters<CampaignRepository["deleteNpc"]>, 2>;

    const contractIsPresent: [SaveQuestHasCas, DeleteQuestHasCas, SaveNpcHasCas, DeleteNpcHasCas] = [true, true, true, true];
    expect(contractIsPresent).toEqual([true, true, true, true]);
  });

  it("permite compor personagem, rolagem e receipt com o mesmo contexto", () => {
    type Callback = Parameters<UnitOfWork["run"]>[0];
    type ContextFromCallback = Callback extends (context: infer Context) => unknown ? Context : never;
    type SaveContext = Parameters<CharacterRepository["save"]>[3];
    type AppendContext = Parameters<DiceHistoryRepository["append"]>[1];

    const contextIsShared: [ContextFromCallback, SaveContext, AppendContext] = null as unknown as [
      TransactionContext,
      TransactionContext | undefined,
      TransactionContext | undefined,
    ];

    expect(contextIsShared).toBeNull();
  });
});
