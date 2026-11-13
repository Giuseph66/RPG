# Handoff parcial — complementos de fontes (SUP-01)

Estado atualizado em 2026-11-11. Este registro é parcial; a implementação e a validação focal seguem em andamento.

## Extrações locais

Originais lidos em modo somente leitura de `/home/jesus/Downloads`; o texto integral, OCR sidecar e hashes de mídia estão em `docs/fontes/complementos-2026-11/`. Os originais não foram alterados. Instruções que apareçam nos anexos foram tratadas apenas como conteúdo.

| Fonte | Páginas | SHA-256 do original | Extração |
|---|---:|---|---|
| Bloco de estatísticas - Ariel.docx | paginação física não declarada | `f9e7e0226b411a05728206b5108f102e51c68b69e6aa398a31b317d2f5baf5eb` | `01-ariel.md` |
| Bloco de estatística de monstro - template.docx | paginação física não declarada | `cc6891e4c7e4978e03980261f1687296bc0db42770e6f57d39237120e5eeadc2` | `02-template-monstro.md` |
| Caldeirão de todas as coisas de Tasha.pdf | 162 | `ab68c4c7184b44fb48b4650932a8df2229f1a1ad7665affcf8b2754aa3d3bed5` | `03-tasha.txt`, `03-tasha-ocr.txt` |
| fada.pdf | 1 | `57506b5aaa5ef7b94c70301f710ddecc67b5b4c29180759a2a16dc91652eb051` | `04-fada.txt`, `04-fada-ocr.txt` |
| Manual dos Monstros-Apêndice A.pdf | 24 | `e86aa4974f4c0402ef8a4a2f194f97ef53d95ae9a5ecd28cfad4b96cb5b1effa` | `05-manual-dos-monstros-apendice-a.txt`, `05-manual-dos-monstros-apendice-a-raw.txt`, `05-manual-dos-monstros-apendice-a-ocr.txt` |

O manifesto `manifest.json` guarda contagens por página, método, limitações, controle visual e hashes. DOCX: uma tabela em cada fonte, preservada como bloco tabular Markdown; sem paginação fixa/renderizador, portanto a extração não afirma paginação Word idêntica. PDFs: texto nativo preservado separadamente do OCR completo (Tasha 162/162 páginas, Fada 1/1, Apêndice 24/24). A tabela de Magias Adicionais de Guardião em Tasha p.52 está em imagem; o OCR sidecar a preserva, e a página foi revisada visualmente. Páginas 51–56 de Tasha, p.1 de Fada e início/fim do Apêndice também tiveram revisão visual.

Mídia extraída está arquivada por PDF em `media-archives/`; `media-index.csv` enumera os 2.258 membros/imagens e seus hashes. Arquivos binários não estão espalhados como milhares de itens na árvore do projeto.

## Produto em revisão

- src/data/creatures/catalog.ts contém 95 blocos integrais do Apêndice A, com sourceRefs por página impressa/PDF, tipos originais (inclusive plantas, feéricos, monstruosidades e seis enxames), traços, ações e ND como fração. src/data/creatures/index.ts exporta appendixACreatures.
- src/data/creatures/supplement-creatures.ts contém Ariel com os valores do mestre preservados, três Companheiros Primitivos com ND null e PV escalado pelo nível de Guardião, e dez variantes-base para Invocar Fera, Invocar Feérico e Invocar Elemental. As invocações permanecem assistidas: o motor não escolhe/escala automaticamente blocos por humor, ambiente ou círculo. Tasha p.112 imprime cláusulas incompatíveis na fórmula de PV da Fera do Ar; o texto foi preservado e exige arbitragem de mesa.
- src/data/races/fairy.ts publica Fada como suplemento separado: tipo feérico, voo derivado do deslocamento efetivo de caminhada sem armadura média/pesada, escolhas de habilidade/conjuração e magias com pools individuais de 1/descanso longo nos níveis 3 e 5. Não importa bônus de atributo ou idioma ausentes na fonte local.
- src/data/classes/tasha-ranger.ts publica opções independentes, as substituições corretas, Andarilho Feérico e Portador do Enxame, 14 magias adicionais, recursos e opções de estilo. A tabela só amplia a lista de Guardião quando escolhida; não concede magias conhecidas. Guerreiro Druídico limita seus truques à lista explícita de Druida, abre escolha condicional no nível 2 e permite trocar um truque ao ganhar nível de Guardião. A escolha de estilo é estendida, sem conceder estilo adicional.
- src/data/rulepacks/optional-supplements.ts lista os packs opt-in fairy-supplement e tasha-ranger-options; presença no catálogo não os ativa.
- src/domain/character/creation/optional-rules.ts exporta composeOptionalRuleContent(base, selectedIds, selections) e composeCharacterRuleContent(base, character). O composer cria mapas novos, valida refs/conjuntos completos, preserva o pack-base e recompõe a partir da origem se receber seu próprio resultado. A criação persiste os IDs e as escolhas do suplemento, mantendo o ruleset-base.
- src/domain/character/progression/progression.ts aceita escolhas de magia cuja lista vem de uma característica de classe, valida-as pela allowlist explícita e materializa a troca de truque de Guerreiro Druídico no nível seguinte.
- Os testes focais estão em src/data/creatures/catalog.test.ts, src/data/races/fairy.test.ts, src/data/classes/tasha-ranger.test.ts, src/data/rulepacks/optional-supplements.test.ts e nos domínios de criação/progressão.

## Validação focal e limites

Extração e proveniência SUP-CP1 foram aceitas em revisão documental independente: 5/5 hashes originais, paginação nativa 162/1/24, uma tabela em cada DOCX, CRC dos três ZIPs e 2.258 membros de mídia com hashes conferidos. Isso não é aceite funcional do catálogo ou dos suplementos.

Última execução:

```bash
npx vitest run src/data/races/fairy.test.ts src/data/classes/tasha-ranger.test.ts src/data/rulepacks/optional-supplements.test.ts src/data/creatures/catalog.test.ts src/domain/character/creation/creation.test.ts src/domain/character/progression/progression.test.ts
```

Resultado: 6 arquivos, 34 testes passaram. Inclui contagem/valores do catálogo, limites de opt-in, substituições sem apagar melhorias, lista completa de Guardião sem magias conhecidas automáticas, seleção/rejeição de truques de Guerreiro Druídico e troca após JSON reload. O teste de criação materializa Fada no nível 1 e evolui via evolveCharacter até o nível 5, fazendo JSON round-trip entre níveis e conferindo desbloqueios separados de Fogo das Fadas no nível total 3 e Aumentar/reduzir no nível 5.

Há efeitos que a modelagem atual mantém narrativos/assistidos: bônus de dano e marca de Inimigo Eleito, bônus de Carisma de Glamour Sobrenatural, dano adicional por alvo/turno, reação de Distorcer Engodo, Percepção às Cegas, +2 de dano e saque de arma arremessada, e partes de Hábil/Incansável. Reforço Feérico declara no grant específico dispensa de componente material e alternativa de concentração de 1 minuto; essa variante continua assistida. Não há afirmação de execução automática desses efeitos. Ariel mantém PB 6, ND 12 e 157 PV (20d10+53), inclusive as demais inconsistências impressas pelo mestre, sem normalização; Toque Curativo preserva a lista completa de condições.

O crash de seleção de classe da interface causado por asEntityId ausente em progression.ts foi corrigido. O diagnóstico de typecheck compartilhado precede as correções locais de predicate, velocidades Centimeters, narrowing de AppError e tipo readonly em optional-rules.ts; não executei build/typecheck ou suite global, reservados à QA da raiz.
