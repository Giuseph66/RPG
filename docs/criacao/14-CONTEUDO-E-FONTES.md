# 14 — Conteúdo e fontes

## Fontes primárias locais

| ID | Arquivo / identificação | Uso e localização |
| --- | --- | --- |
| PHB-LOCAL | [Livro do Jogador](../Livro%20do%20Jogador.pdf),315 páginas; metadados criação2016 e modificação2017; prefácio datado2014 | Mecânicas. Página impressa = página PDF +1 na estrutura conferida; citação PDF começa em1 |
| SHEET-LOCAL | [Ficha de Personagem em branco](../Ficha%20de%20Personagem%20em%20branco.pdf),3 páginas; metadados2014 | Campos e agrupamento visual; não define exceções de regras |
| BRIEF | Instruções fornecidas pelo usuário nesta tarefa | Escopo, quatro destinos, Dados global, documentação/swarm, limites técnicos |

SHA-256 para vincular este plano à cópia exata:

- Livro: `ed6028a48dc566e91720b68a24d38eb4f8c927b071cab151739a7f15f08a4a91`.
- Ficha: `6728135486b750ff762de86ac97b117756b5de16332ada345e0b0e9ca375c71d`.

Pack proposto: `phb-ptbr-local-2017@1.0.0`, edição descritiva “5e, compilação fornecida, base2014 com divergências registradas”. Não certificar esta cópia como reprodução exata de PHB2014: Patrulheiro contém três Conclaves e mecânicas particulares; há divergências de tradução e contradições internas. Não adicionar 2024, suplementos, errata ou UA externos automaticamente.

## Estrutura estudada

Sumário, criação, raças, classes, antecedentes, equipamento, personalização, habilidades, aventura, combate, conjuração, estrutura das listas/descrições de magia, condições e criaturas relevantes. Ficha lida em texto e renderizada nas três páginas. Texto extraído em duas colunas foi usado com páginas preservadas; tabelas/trechos contraditórios exigem consulta visual localizada na implementação de conteúdo. Fontes originais permanecem intactas; extrações e imagens de inspeção não são conteúdo distribuído do aplicativo.

Apêndices B/C fornecem contexto de deuses/planos, não autorizam deduzir bônus mecânicos ausentes. Apêndice E é leitura inspiradora, não rule pack. Não incluir conteúdo sugerido por bibliografia como se estivesse fornecido.

## Referência organizacional Pixel

Consultados [índice de passos](https://github.com/Giuseph66/Pixel/blob/main/docs/Passos/README.md), [fundação](https://github.com/Giuseph66/Pixel/blob/main/docs/Passos/00-infra-superficie-e-tuning.md) e [exemplo de mecânica](https://github.com/Giuseph66/Pixel/blob/main/docs/Passos/07-lava-subindo.md). Aproveitados: um assunto por passo, dependências/destrava, arquivos, armadilhas, aceite e limites das verificações. Arquitetura Godot e decisões de gameplay do Pixel não foram transferidas. Referência acessada em11/09/2026, branch main; pode evoluir.

## Política de conteúdo

| Categoria | Tratamento |
| --- | --- |
| Mecânica | Modelagem estrutural e paráfrase com referência; verificar política de distribuição do pack antes de publicar |
| Texto | Não transcrever capítulos/descrições integrais; resumo próprio e indicação da fonte |
| Asset | Imagens, logotipos e aparência da ficha não são automaticamente assets autorizados do app |
| Conteúdo do usuário | Notas, mapas, retratos e packs locais permanecem locais; exportação controlada pelo usuário |

Ter o PDF disponível não é autorização automática de redistribuição pública. Esta documentação técnica referencia o arquivo fornecido e não licencia seu conteúdo. A ficha contém aviso de cópia para uso pessoal; não reutilizar sua arte como design system.

Planejar tipos de pack: conteúdo aberto com licença identificada; SRD cuja versão/licença sejam explicitamente escolhidas; conteúdo privado local; campaign pack do usuário. Nenhum desses tipos substitui regras desta fonte silenciosamente. Publicação de conteúdo protegido permanece gate separado; arquitetura e UI podem avançar usando fixtures próprias e metadados mínimos.

## Proveniência e discrepâncias

Cada mecânica registra nome da fonte, capítulo e página impressa/PDF quando identificável. Exceção da compilação é documentada como tal; conflito interno ou dado ausente vira [pendência](decisoes/PENDENCIAS.md). Não preencher lacuna por memória de outra edição. Fonte específica e exemplo divergente exigem decisão registrada antes de automatizar caso afetado.

## Complementos locais autorizados para SUP-01

O usuário autorizou a consulta das cinco fontes locais abaixo para esta tarefa. Originais permaneceram intactos; hashes, texto nativo, OCR por página, inventário de mídia e notas de revisão ficam somente na extração local `docs/fontes/complementos-2026-11/` e no handoff `Testes/complementos-fontes.md`. Esta autorização específica não licencia distribuição pública do texto ou dos assets integrais.

| Fonte local | SHA-256 | Uso nesta implementação |
| --- | --- | --- |
| `Bloco de estatísticas - Ariel.docx` | `f9e7e0226b411a05728206b5108f102e51c68b69e6aa398a31b317d2f5baf5eb` | Exemplo de bloco de criatura atribuído ao mestre; preservar CA18, PV157, `20d10+53`, PB+6 e ND12, mesmo com inconsistências internas. |
| `Bloco de estatística de monstro - template.docx` | `cc6891e4c7e4978e03980261f1687296bc0db42770e6f57d39237120e5eeadc2` | Inventário de campos do template para não reduzir bloco a atributos/ações básicos. |
| `Caldeirão de todas as coisas de Tasha.pdf` | `ab68c4c7184b44fb48b4650932a8df2229f1a1ad7665affcf8b2754aa3d3bed5` | Opções opcionais de Guardião/Patrulheiro, companheiros e subclasses nas páginas locais 51–61; magias associadas nas páginas 110–111. A tabela-imagem da p.52 foi conferida por OCR e visualmente. |
| `fada.pdf` | `57506b5aaa5ef7b94c70301f710ddecc67b5b4c29180759a2a16dc91652eb051` | Definição local da raça Fada (página PDF1; página impressa14 confirmada visualmente); não infere aumento de atributo ou idioma ausentes nesta fonte. |
| `Manual dos Monstros-Apêndice A.pdf` | `e86aa4974f4c0402ef8a4a2f194f97ef53d95ae9a5ecd28cfad4b96cb5b1effa` | 95 blocos de criaturas do Apêndice A, páginas impressas317–340, com tipos e ND originais; criaturas não bestas permanecem no catálogo geral, mas não são elegíveis para Forma Selvagem. |

Fada e opções Tasha são conteúdo local opt-in; o pack base do Livro do Jogador não as ativa nem as substitui automaticamente. Fonte, bundle selecionado e opções escolhidas são referenciados pelos dados. Companheiros primitivos mantêm ND ausente (`null`) e fórmulas explícitas por nível de Guardião e bônus de proficiência global; o bloco-base não deve ser exibido como estatística já resolvida. A descrição local de Invocar Fera imprime duração de uma hora sem esclarecer concentração e os blocos de invocação não são dados mecânicos completos no material extraído; esses pontos permanecem bloqueados para automação, sem completá-los por outra edição.
