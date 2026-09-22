/**
 * EXTRAÇÃO PARA INTEGRAÇÃO DO COMPÊNDIO
 * Fonte exclusiva: PDF "Livro do Jogador" fornecido pelo usuário.
 * O campo `text` preserva o texto extraído da fonte sem correções externas,
 * sem reescrita e sem inferência de regras.
 * Quebras de linha/paginação são mantidas quando presentes na extração.
 */

export const PHB_DESCRIPTION_INTEGRATION_MANIFEST = {
  "source": "Livro do Jogador fornecido pelo usuário",
  "files": [
    "attributes.ts",
    "skills.ts",
    "subraces.ts",
    "subclasses.ts",
    "features.ts",
    "resources.ts",
    "progression.ts",
    "rest.ts",
    "movement.ts",
    "weapons.ts",
    "armor.ts"
  ],
  "counts": {
    "attributes": 6,
    "skills": 18,
    "subraces": 9,
    "subclasses": 41,
    "featureBlocks": 492,
    "resourceDescriptions": 9,
    "classProgressionTables": 12,
    "restEntries": 2,
    "movementSubsections": 11,
    "weaponSubsections": 5,
    "armorSubsections": 6
  },
  "notes": [
    "text preservado da extração do PDF fornecido pelo usuário, sem correções externas.",
    "features.ts inclui blocos individuais detectados por títulos do capítulo de classes e também o bloco completo de características por classe.",
    "subclasses.ts e subraces.ts isolam o texto de cada opção para facilitar a fusão com os objetos mecânicos existentes.",
    "weapons.ts e armor.ts incluem a seção textual completa e as tabelas extraídas das páginas correspondentes."
  ]
} as const;

export default PHB_DESCRIPTION_INTEGRATION_MANIFEST;
