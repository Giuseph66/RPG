# Schemas e contratos canônicos

Especificação de campos, não código de aplicação. `?` indica opcional; coleções ausentes são normalizadas somente quando a versão do schema autoriza. Valores desconhecidos não viram zero silenciosamente.

## Primitivos

| Contrato | Campos / invariantes |
| --- | --- |
| SourceRef | `sourceId`, `chapter`, `printedPage?`, `pdfPage?`, `section?`; página PDF começa em 1 |
| RulesetRef | `id`, `version`; resolução exata |
| DefinitionRef | `rulesetId`, `entityId`; categoria conhecida pelo campo; referências genéricas incluem `entityType` |
| DefinitionBase | `id`, `name`, `tags[]`, `sourceRefs[]`; imutável |
| ChoiceDefinition | `id`, `kind`, `count`, `options[]` ou seletor tipado, `prerequisites[]`, `unique`, `sourceRefs[]` |
| ChoiceSelection | `choiceId`, `selectedIds[]`, `grantedAtLevel`, `grantingRef`; cardinalidade e elegibilidade verificadas |
| RuleModifier | `id`, `sourceRef`, `target`, `operator`, `value`, `predicate`, `stackingGroup?`; operadores fechados, sem código textual |
| Duration | `kind: instant/rounds/minutes/hours/untilRemoved/special`, `value?`, `expiryTrigger?`; tempo de jogo explícito |

## Definitions

| Tipo | Campos específicos obrigatórios conforme opção |
| --- | --- |
| RaceDefinition | abilityIncreases, size, speedCm, languages, senses, proficiencies, traits, subraceIds, choices |
| SubraceDefinition | raceId, additionalModifiers, traits, choices; não duplicar a raça base |
| ClassDefinition | hitDie, primaryAbilities, initialProficiencies, savingThrowProficiencies, skillChoices, initialEquipmentChoices, progression[1..20], subclassSelectionLevel, subclassIds, multiclassPrerequisites, multiclassProficiencies, spellcasting? |
| SubclassDefinition | classId, selectionLevel, featureGrants por nível, spellGrants, resourceChanges, choices |
| BackgroundDefinition | skills, toolChoices, languageChoices, equipment, feature, variants; customização da fonte tratada separadamente |
| FeatDefinition | prerequisites, grants, choices, repeatability e optionalRuleFlag |
| FeatureDefinition | activation, eligibility, effects[], resourceCosts[], recovery?, choices[], automationStatus, pendingDecisionIds[] |
| ResourceDefinition | ownerRef, unit, capacityRule, spendRules, recoveryTriggers[], recoveryAmountRule; gasto fica no estado |
| ConditionDefinition | mechanicalEffects, stackingPolicy, defaultDuration?, removalTriggers, severityRange?; aplicação conserva origem |
| EquipmentDefinition | category, weightGrams, valueCp, stackable, properties[], armor?, weapon?, tool?, consumable? |
| WeaponDefinition (parte de Equipment) | damageParts, rangeCm?, reachCm, abilityPolicy, proficiencyCategory, properties |
| SpellDefinition | Ver [schema de magia](../magia/schema-magia.md); uma definição, várias fontes possíveis |
| ProgressionDefinition | totalLevel, xpThreshold, proficiencyBonus; independente de nível da classe |
| CharacterTemplate | templateId, rulesetRef, suggestedChoices, sourceRefs; não é personagem salvo e exige revisão |

## Character, schemaVersion 1 proposto

| Grupo | Campos e semântica |
| --- | --- |
| Envelope | id, schemaVersion, revision, rulesetRef, createdAt, updatedAt, campaignId? |
| Identidade | name, playerName?, raceRef, subraceRef?, backgroundRef, alignment?, appearance, personalityTraits, ideals, bonds, flaws, history, portraitAssetId? |
| Formação | classes[{classId,level,subclassId?,choices[]}], abilityGeneration{method,baseScores,rollIds?,pointBuyAllocation?}, choices[], progressionHistory[] |
| Estado de sessão | xp, inspiration:boolean, hp{current,temp}, hitDiceSpent por tipo/classe, deathSaves{successes,failures,stable}, conditions[], resources[], concentration?, transformation?, pendingResolutions[] |
| Posses | inventory[], currency{cp,sp,ep,gp,pp}; cada moeda inteiro≥0; tesouros narrativos separados |
| Magia | castingSources[], spellSlots[], spellbookEntries[], preparedSelections[]; origem individual de cada concessão |
| Ajustes | manualAdjustments[{id,target,value,reason,sourceRef?,createdAt}]; marcados na ficha, sem sobrescrever definição |

`classes.level` é 1–20, soma ≤20; uma entrada por classe. `progressionHistory` registra classe/nível, ganho base de PV (dado ou fixo), escolhas e evento; mudança de CON recalcula contribuições sem rolar novamente. `hp.max`, CA, proficiência, atributos finais e slots máximos são derivados.

`ResourceState={id,definitionRef,ownerInstanceId,spent,resetMarker?}`; gasto≥0. `InventoryItem={id,equipmentRef,quantity,equippedState,containerId?,customName?,notes,chargesSpent?}`; impedir ciclo de contêiner e equipagem impossível. `ConditionInstance={id,definitionRef,origin,appliedAtGameTime?,duration?,severity?,removalContext?}`; condições iguais com origens distintas podem coexistir sem dobrar bônus.

`CastingSourceState={id,grantingRef,ability,knownSpellRefs[],preparedSpellRefs[],spellbookRefs[],resourcePoolIds[]}`; acesso à lista completa é regra da definição, não marcar todas como conhecidas. `SpellSlotState={poolId,kind:spellcasting/pact,slotLevel,spent}`. Recursos de conjuração gratuita usam ResourceState, não slots falsos de nível zero.

`ConcentrationState={effectId,sourceRef,startedAtGameTime?,duration,pendingSaveIds[]}` ou ausente; no máximo uma, incluindo concentração exigida por conjuração demorada. `TransformationState={id,formRef,originalSnapshotRef,formHp,startedAtGameTime,duration,equipmentDisposition,retainedFeatureIds[]}`. Estado original conserva referência recuperável; detalhes em [druida](../personagem/classes/druida/README.md).

## Campanha e jornada

Campaign: id/schemaVersion/revision/name/description/rulesetRef/characterIds/sessionCounter/npcs/quests/objectives/settings/createdAt/updatedAt. Settings da campanha explicitam opcionais, método de atributos e avanço por XP ou decisão do mestre; avanço sem XP é decisão de produto/mesa, não regra atribuída ao livro.

JournalEntry: id/campaignId/title/body/sessionNumber?/gameDate?/linkedEntityIds/tags/createdAt/updatedAt. MapRecord: id/campaignId/name/assetId/pins/groupPosition?/revision. Pin: id/normalizedX/normalizedY/label/locationId?/noteIds/iconToken; coordenadas entre 0 e 1, pan/zoom transitórios. Asset: id/mediaType/bytes/hash/width/height/originalName; aceitar formatos raster de imagem validados, sem SVG ativo na V1.

## Aplicação e repositórios

`Command={commandId,characterId,expectedRevision,kind,payload}`; comando de campanha usa campaignId equivalente. `RuleContext` informa tempo de jogo, ação disponível, alvo/contexto da mesa e políticas opcionais; ausência gera pedido, não inferência silenciosa.

`RuleResult`: success com nextState/effects/explanations/sourceRefs; needsInput com requests/preview/sourceRefs; rejected com errors/sourceRefs. Effect contém tipo, payload, origem e alvo. Explanation contém valor final e contribuições. [Motor](../10-RULES-ENGINE.md).

`CharacterRepository.get(id) → Character | NotFound`; `list(filter) → summaries`; `save(character,expectedRevision,commandReceipt?) → savedRevision`; `delete(id,expectedRevision)`. CampaignRepository tem operações equivalentes e transações compostas coordenadas por UnitOfWork específico. SettingsRepository get/update/reset trata preferências pequenas. `BackupService.exportCharacter/exportCampaign/previewImport/commitImport` coordena repositórios e assets sem expor formato de banco à UI.

Erros discriminados: `ValidationError`, `NotFound`, `Conflict`, `QuotaExceeded`, `StorageUnavailable`, `UnsupportedSchema`, `MissingRuleset`, `CorruptRecord`, `UnresolvedRule`. Mensagem legível + campo/código; nunca tratar falha como coleção vazia.

## Validação do contrato

Definition sem fonte falha; IDs e versões referenciados resolvem; subclasse pertence à classe; escolhas atendem cardinalidade; números finitos; relações acíclicas; recursos não negativos; tempo de jogo não depende automaticamente de relógio real. Contratos pertencem a DATA-001; consumidores não os redefinem.
