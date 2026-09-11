# 05 — Design system

Estado: especificado, valores visuais e fontes tipográficas ainda a validar em protótipo futuro. Direção: software de sessão dark fantasy natural; carvão e pedra nas superfícies, madeira discreta na identidade, bronze envelhecido na interação, verde musgo na progressão natural. Pergaminho restrito a diário, missões, handouts e narrativa, sempre com alternativa de superfície legível.

## Hierarquia e assinatura

O usuário é jogador durante sessão, frequentemente com uma mão disponível. A prioridade é consultar estado, executar ação, entender custo e continuar jogando. A assinatura é a faixa compacta de estado do personagem e a ação de dados elevada; ornamentação não compete com números. Evitar painéis iguais para todo campo: atributos em matriz, perícias em lista, equipamento em tabela/lista adaptativa, jornada em mapa e registros em linha temporal. Materiais sugerem bordas e superfícies; não usar texturas pesadas cobrindo controles.

## Tokens sem cores arbitrárias

| Token | Papel e restrição |
| --- | --- |
| `color.background` | Carvão; fundo principal. |
| `color.surface` | Grafite/pedra; seções em primeiro plano. |
| `color.surfaceElevated` | Superfície elevada distinta; overlay e menu. |
| `color.primary` | Bronze/dourado contido; ação principal e seleção. |
| `color.secondary` | Verde floresta; apoio, sem confundir seleção. |
| `color.hp` | Vermelho escuro sem sacrificar legibilidade; PV. |
| `color.xp` | Verde musgo; experiência com valor textual. |
| `color.magic` | Azul profundo; magia/concentração com ícone. |
| `color.warning` | Aviso acompanhado de texto e símbolo. |
| `color.danger` | Falha/destruição; distinto de PV normal. |
| `color.text` | Texto principal com contraste validado. |
| `color.textMuted` | Texto secundário ainda legível. |
| `color.border` | Separação de superfícies. |
| `color.focus` | Contorno perceptível em todas as superfícies. |
| `color.controlDisabled` | Indisponibilidade com motivo acessível. |

Nenhum hex, RGB ou família tipográfica é decisão fechada nesta etapa. Valores futuros pertencem exclusivamente ao arquivo de tokens e devem vir acompanhados de matriz de contraste. Estado não depende só de cor. Temas futuros trocam tokens, sem alterar regras e componentes.

| Grupo | Tokens e decisão |
| --- | --- |
| spacing | `none`, `xs`, `sm`, `md`, `lg`, `xl`, `section`; escala coerente escolhida no passo 01. |
| radius | `control`, `surface`, `overlay`, `pill`; pill só chips/estado. |
| shadow | `none`, `overlay`; profundidade principal por mudança de superfície e borda. |
| typography | `display`, `heading`, `body`, `label`, `numeric`; corpo legível, números tabulares, títulos discretamente medievais. |
| zIndex | `base < sticky < navigation < floatingAction < backdrop < overlay < overlayPopover < toast`; apenas um foco modal ativo. |
| size | `touchTarget` objetivo 44 CSS px, `headerCompact`, `headerExpanded`, `navHeight`, `contentMeasure`. |
| motion | `immediate`, `feedback`, `transition`; reduced motion remove movimento espacial e dados animados. |

44 CSS px é objetivo do produto para toque; não confundir com mínimo AA de 24 CSS px e suas exceções no WCAG 2.2. Medidas de header estão em [Responsividade](06-RESPONSIVIDADE.md).

## Componentes e responsabilidades

| Grupo futuro | Componentes | Limite |
| --- | --- | --- |
| `components/ui` | Button, IconButton, Input, Select, Tabs, Badge, SectionCard, ProgressBar | Estilo, sem regra ou persistência. |
| `components/layout` | AppShell, CharacterHeader, PrimaryNavigation | Seletores de leitura e callbacks de aplicação. |
| `features/character/sheet` | StatCard, ResourceBar, ConditionChip | Mostra estado e proveniência do cálculo. |
| `features/dice` | DiceButton, DiceOverlay, DiceSelector, DiceQuantitySelector, DiceModifierSelector, DiceResult, DiceHistory | Chama engine/serviço; não recalcula fórmula. |
| `features/compendium` | RuleCard, RuleDetail | Definições imutáveis e referência da fonte. |
| `features/actions` | SpellCard, FeatureCard, AttackRow | Capacidades e comandos expostos pela aplicação. |
| `features/inventory` | InventoryItem, EquipmentPicker | Quantidade/estado; domínio resolve CA. |
| `features/journey/map` | MapViewport, MarkerList | Pan, zoom e anotação local, sem combate tático. |
| `components/ui/feedback` | AppModal, ConfirmModal, BottomSheet, Popover, Drawer, ContextMenu, InlineStatus | Foco, fechamento, erros, anúncio acessível. |

Não criar versão própria de StatCard ou modal em cada feature. Não unificar cartões semanticamente diferentes mediante dezenas de flags. Componente extrai padrão somente quando responsabilidade comum estiver clara.

## Estados e texto

Todo controle: default, hover, pressed, focus-visible, disabled e busy quando aplicável. Todas superfícies de dados: loading local, vazio, disponível, erro recuperável, referência ausente e bloqueio por fonte. Texto de ação descreve efeito (“Aplicar 5 de cura”, “Consumir 1 espaço”), não “OK”. Erro aparece junto ao campo e, ao confirmar, em resumo focável. Tooltip nunca contém informação exclusiva. Ícones possuem nome acessível; rótulos dos quatro destinos ficam visíveis no mobile.

## Critérios futuros

Tokens cobrem todas cores/elevações; contraste verificado para pares reais. Uma única fonte de tokens e componentes de feedback. Cartões e listas continuam legíveis sem imagens decorativas. PV, recursos, seleção e erro distinguíveis em escala de cinza. Fontes/ícones devem funcionar offline e ter origem/licença documentadas; nenhuma CDN obrigatória. Ver [Acessibilidade](13-ACESSIBILIDADE.md) e [Swarm ownership](swarm/OWNERSHIP.md).
