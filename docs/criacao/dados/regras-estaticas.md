# Regras estáticas e rule packs

Estrutura futura de `src/data/`: `rules/`, `races/`, `classes/`, `subclasses/`, `backgrounds/`, `abilities/`, `skills/`, `conditions/`, `equipment/`, `spells/`, `feats/`, `progression/`, `dice/`, `character-templates/`. Não criada agora.

Manifest do pack: id/name/edition/version/language/sourceRefs/contentPolicy/entityCounts/checksums/schemaCompatibility. IDs conforme [contrato](ids.md). Loader valida manifesto, hashes, tipos, cardinalidades e referências antes de publicar snapshot imutável; carregamento parcial não se torna pack ativo.

## Inventário de módulos e fontes

| Domínio | Cobertura da fonte | Documento operacional |
| --- | --- | --- |
| Criação e avanço | Cap. 1 pp.11–15/PDF10–14 | [Personagem](../personagem/README.md) |
| Raças | Cap. 2 pp.17–43/PDF16–42 | [Raças](../personagem/racas/README.md) |
| Classes/subclasses | Cap. 3 pp.45–122/PDF44–121 | [Classes](../personagem/classes/README.md) |
| Antecedentes | Cap. 4 pp.123–143/PDF122–142 | [Antecedentes](../personagem/antecedentes/README.md) |
| Equipamento | Cap. 5 pp.145–163/PDF144–162 | [Equipamento](../equipamento/README.md) |
| Opcionais | Cap. 6 pp.165–172/PDF164–171 | [Multiclasse](../regras/multiclasses.md), [talentos](../personagem/talentos/README.md) |
| Habilidades/aventura/combate | Caps.7–9 pp.175–200/PDF174–199 | [Regras](../regras/README.md) |
| Conjuração e magias | Caps.10–11 pp.203–289/PDF202–288 | [Magia](../magia/README.md) |
| Condições | Apêndice A pp.291–293/PDF290–292 | [Condições](../regras/condicoes.md) |
| Criaturas de referência | Apêndice D pp.305–311/PDF304–310 | [Druida](../personagem/classes/druida/regras-especiais.md) |

Exemplos completos de schemas de magia não significam transcrição integral de todas as descrições. Agente de conteúdo deve modelar descrições com metadados, efeitos, limitações e fonte; prosa protegida não é requisito para automação. Lista por classe é relação com IDs, sem duplicar SpellDefinition.

Sem eval de fórmulas nem plugin executável importado. Rule packs futuros declarativos usam operadores permitidos; capacidade nova exige versão do engine. Pack privado importado não altera pack embutido. Correção semântica incrementa versão e requer revisão de saves; tradução cosmética pode ser patch, sempre com changelog.
