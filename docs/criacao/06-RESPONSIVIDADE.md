# 06 — Responsividade

Estado: plano mobile-first; faixas são critérios iniciais de projeto, a validar com conteúdo real. A escolha do layout depende do espaço disponível, inclusive zoom, não do modelo do aparelho.

| Faixa conceitual | Organização | Navegação | Header |
| --- | --- | --- | --- |
| Mobile: largura útil abaixo de 48rem | Uma coluna, listas e sheets. | Bottom navigation com quatro destinos + ação de dados elevada. | Duas linhas; alvo 88–104 CSS px, máximo recomendado 112 CSS px em escala de texto padrão. |
| Tablet: 48rem até antes de 75rem | Uma/duas colunas; detalhes laterais opcionais. | Rail com os mesmos destinos e Dados separado. | 72–96 CSS px conforme orientação; secundários compactos. |
| Desktop: a partir de 75rem | Conteúdo central com painel de sessão opcional. | Sidebar compacta; rótulos completos. | 64–88 CSS px; máximo recomendado 96 CSS px na escala padrão. |

Esses limites não podem cortar conteúdo sob zoom ou fonte ampliada. Quando necessário, header cresce, controles secundários vão para expansão e o layout muda para mobile. Em janela muito baixa, usar versão compacta e reservar conteúdo; se fixação impossibilitar leitura/foco, permitir header em fluxo como adaptação acessível. Não esconder PV, recurso primário e CA atrás de hover. XP/iniciativa/deslocamento/proficiência permanecem acessíveis na expansão.

## Reflow e regiões fixas

Documentar e medir altura real do header, navegação e safe-area para padding do conteúdo e scroll margin dos alvos. Nenhum foco ou botão final pode ficar sob elementos fixos. Uma região vertical principal de scroll; painel lateral pode rolar somente se explicitamente rotulado e com teclado. Evitar a sequência de scrolls aninhados ficha → card → lista. Meta: conteúdo textual sem rolagem horizontal em largura equivalente a 320 CSS px, respeitando exceções para mapa/tabelas que precisam de duas dimensões.

## Comportamento por elemento

| Elemento | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Atributos | Matriz 2–3 colunas conforme rótulo. | Matriz compacta. | Matriz com explicação selecionada ao lado. |
| Perícias/resistências | Lista com valor e área de toque por linha. | Lista em seção própria. | Listas lado a lado, sem comprimir texto. |
| Inventário | Linhas/cartões com quantidade/equipado sempre presentes. | Tabela curta ou lista. | Tabela sem esconder ações em hover. |
| Compêndio | Busca + filtros recolhíveis + detalhe em rota. | Lista/detalhe quando couber. | Busca/filtros/lista/detalhe. |
| Mapa | Pan por arrasto; botões zoom/ajustar e lista alternativa. | Painel de marcadores recolhível. | Mapa e locais simultâneos. |
| Dados | Bottom sheet com scroll e rodapé de ação visível. | Modal central ou sheet conforme altura. | Modal compacto com histórico lateral opcional. |
| Modais | Largura útil e altura limitada pela viewport visual. | Centralizados quando couber. | Largura medida por conteúdo, sem linha de texto excessiva. |
| Criação | Uma etapa por vez; progresso textual. | Etapa e resumo. | Etapa com resumo contínuo. |
| Jornada narrativa | Uma coluna, editor textual simples. | Lista/editor. | Lista/editor e metadados. |

## Teclado virtual e gestos

Usar viewport visual/unidades dinâmicas no planejamento; teclado não encobre campo nem confirmar. Abrir seletor de dados mantém entrada focada visível. Pan/zoom do mapa não captura gesto da página fora da superfície; oferecer entrar/sair do modo de interação. Não bloquear zoom do navegador. Drag-and-drop tem alternativa “Mover para”/edição de coordenadas/seleção de local. Toque prolongado não é única entrada para menu.

## Plano de validação

No passo 16: 320, 360, 390, 768, 1024 e 1440 CSS px como amostras; também orientação paisagem, zoom 200%/400%, texto ampliado, conteúdo traduzido longo e safe areas. Validar função, ordem de leitura, foco, overlay, mapa e persistência entre mudanças de faixa. Não duplicar árvores que disparem comandos ou gravações duas vezes. Perfis celulares intermediários: compêndio carregado por categoria, imagens otimizadas, rerender por seletor de agregado. Esses são testes futuros, não executados nesta fase documental.
