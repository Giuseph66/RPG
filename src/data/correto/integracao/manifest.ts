export const PHB_MISSING_INTEGRATION_MANIFEST = {
  purpose: "Completar as lacunas remanescentes de descrição/integração do Compêndio após a importação de src/data/correto/descricoes.",
  files: [
    "progression-general.ts",
    "rest-missing.ts",
    "movement-missing.ts",
    "armor-items.ts",
    "weapon-specials.ts",
    "compendium-description-registry.ts",
    "category-labels.ts",
    "description-coverage.test.ts",
  ],
  expectedCoverage: {
    totalLevelProgression: 1,
    restMissingCards: 4,
    movementMissingCards: 11,
    armorItems: 13,
    weaponsWithIndividualSpecialRules: 2,
    subracesAlreadyExtracted: 9,
    subclassesAlreadyExtracted: 41,
    resourcesAlreadyExtracted: 9,
    featureBlocksAlreadyExtracted: 492,
  },
  integrationRules: [
    "Preservar o id canônico da entidade sempre que a extração já possuir id.",
    "Fundir descrição e dados mecânicos em um único card; não criar duplicatas book-* para a mesma entidade.",
    "Não inventar descrição individual para armas cuja fonte fornece apenas dados de tabela/propriedades gerais.",
    "Usar os textos de src/data/correto/descricoes como fonte; estes arquivos apenas apontam/recortam o conteúdo já extraído.",
  ],
} as const;

export default PHB_MISSING_INTEGRATION_MANIFEST;
