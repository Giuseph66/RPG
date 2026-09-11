# Antecedentes

Fonte: **Livro do Jogador fornecido**, capítulo4, impressas123–143 / PDF122–142. Regras de concessão e personalização:p127/PDF126. Pack `phb-ptbr-local-2017`. **13 antecedentes,5 variantes nomeadas**;2 variantes de característica (Má Reputação e Retentores), incorporadas às respectivas fichas.

| Documento | entityId | Fonte impressa/PDF |
|---|---|---|
| [Acólito](acolito.md) | `acolyte` | 129–129/128–128 |
| [Artesão de Guilda](artesao-de-guilda.md) | `guild-artisan` | 130–131/129–130 |
| [Artista](artista.md) | `entertainer` | 131–132/130–131 |
| [Charlatão](charlatao.md) | `charlatan` | 133–133/132–132 |
| [Criminoso](criminoso.md) | `criminal` | 134–135/133–134 |
| [Eremita](eremita.md) | `hermit` | 135–136/134–135 |
| [Forasteiro](forasteiro.md) | `outlander` | 136–137/135–136 |
| [Herói do Povo](heroi-do-povo.md) | `folk-hero` | 137–138/136–137 |
| [Marinheiro](marinheiro.md) | `sailor` | 138–139/137–138 |
| [Nobre](nobre.md) | `noble` | 139–140/138–139 |
| [Órfão](orfao.md) | `urchin` | 140–141/139–140 |
| [Sábio](sabio.md) | `sage` | 141–142/140–141 |
| [Soldado](soldado.md) | `soldier` | 142–143/141–142 |

## Contrato e aplicação

`BackgroundDefinition` guarda `id`, `sourceRefs`,2 perícias concedidas, escolhas de ferramentas/idiomas, característica e alternativas de equipamento. `BackgroundVariantDefinition` referencia pai e somente substituições descritas. Personagem guarda `backgroundRef`, `variantRef`, escolhas e características narrativas; inventário recebe instâncias do pacote apenas uma vez na confirmação da criação.

`DefinitionRef={rulesetId,entityId}` usa lookup tipado. IDs das variantes:`guild-merchant`,`gladiator`,`spy`,`pirate`,`knight`. Características sociais produzem explicações e registro de resolução do Mestre, não simulação de NPCs nem ouro automático.

Se duas fontes concedem a mesma proficiência, escolher outra **do mesmo tipo**: perícia por perícia, ferramenta por ferramenta. Não transformar duplicidade em Especialização. Resolver escolha antes de concluir personagem; conservar origem de cada concessão.

## Personalização prevista na fonte

Selecionar2 perícias quaisquer; total2 escolhas entre ferramentas/idiomas dos antecedentes exemplificados; característica de outro antecedente; pacote existente OU compra com riqueza inicial. Se comprar equipamento, não acumular kits da classe e do antecedente. Característica nova depende do Mestre e pertence a conteúdo local explícito, sem ser catalogada como regra oficial.

Personalidade:2 traços,1 ideal,1 vínculo,1 defeito; podem ser criados pelo jogador. Tabelas narrativas são inspiração e não dão bônus. Não reproduzir integralmente prosa/tabelas literárias.

## Aceite e testes futuros

Criminoso com Furtividade já concedida → escolha substituta de perícia; não +2 proficiências. Compra por riqueza → nenhum kit de antecedente automático. Órfão em combate não duplica velocidade; Andarilho sem recursos locais não cria rações. Exportar/importar preserva variantes, escolhas e características narrativas sem replicar as definições.

[Criação](../criacao-personagem.md), [equipamento](../../equipamento/README.md), [aventura](../../regras/aventura.md), [pendências](../../decisoes/PENDENCIAS.md).
