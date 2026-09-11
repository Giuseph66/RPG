# 13 — Acessibilidade

Meta de implementação: WCAG 2.2 AA, com verificação manual dos fluxos críticos. Referência normativa: [WCAG 2.2, W3C](https://www.w3.org/TR/WCAG22/). Isto é critério de projeto, não declaração de conformidade já obtida.

## Semântica e teclado

Landmarks para header, navegação principal e main; link “Pular para conteúdo”. Um título principal por tela. Quatro links de destino com indicação de página atual; Dados é button com nome “Abrir dados”, nunca link de navegação. Usar controles HTML semânticos estilizados; a proibição de diálogos nativos não proíbe button, input, select ou seletor de arquivo para importar. Evitar substituir controles por divs clicáveis.

Tab percorre ordem visual/lógica; Enter/Espaço ativam botões. Não adicionar atalhos de uma letra sem desativação/remapeamento. Atalho opcional para dados precisa estar documentado, não conflitar com entrada de texto e ter botão equivalente. Ações de mapa, reordenar inventário e ajustar recursos possuem alternativas ao arrastar. Conteúdo de hover aparece também por foco/toque, dispensável e persistente enquanto necessário.

## Diálogos, sheets e foco

AppModal e BottomSheet modais têm nome acessível, `aria-modal`, foco inicial sensato, contenção de foco e fundo inerte. Escape fecha quando não perde operação já confirmada; fechamento retorna ao acionador ou fallback lógico se ele foi removido. Formulário sujo abre ConfirmModal próprio, sem camada concorrente de foco; preferir substituir conteúdo da mesma superfície. Popover não modal não aprisiona foco. Resultado de dados é anunciado uma vez em região live polite; não anunciar cada quadro de animação ou duplicar header e overlay. Falha crítica de gravação tem anúncio assertivo curto sem interromper repetidamente.

## Contraste, zoom e movimento

Texto normal: contraste mínimo 4,5:1; texto grande: 3:1. Componentes/indicadores essenciais: 3:1 em relação a cores adjacentes, respeitando critérios e exceções da norma. Foco visível e não encoberto por header/FAB. PV baixo, condição, concentração e indisponibilidade usam texto ou forma além da cor. Ícone decorativo não é anunciado; ícone funcional tem rótulo.

Texto ampliável a 200%; reflow a largura equivalente a 320 CSS px, com tratamento próprio para conteúdo bidimensional essencial. Não limitar zoom. Alturas máximas do header são recomendações em escala padrão, nunca corte rígido de texto. Respeitar `prefers-reduced-motion`: dados mostram resultado estático imediato; sem tremor, rotação ou brilho obrigatório. Evitar flashes. Meta de toque do produto: 44×44 CSS px; avaliar mínimo AA de 24×24 e exceções separadamente.

## Ficha, regras e resultados

Atributo e modificador têm rótulos distintos (“Sabedoria 16; modificador mais 3”). Testes informam dado, parcelas, modo e total, inclusive dado descartado. Barras têm valor atual, máximo e texto; PV temporários separados. Slots conhecidos, preparados e usados não se distinguem apenas por preenchimento. Condições têm botão de detalhes e remoção identificável por nome. Fórmulas e fontes modificadoras são legíveis sem depender do gráfico.

## Mapa e narrativa

Imagem de mapa aceita descrição alternativa da campanha; marcadores também aparecem em lista navegável, com local/nota e seleção sincronizada. Controles para zoom, ajustar e ir ao marcador por teclado; mapa não exige precisão de gesto. Ações contextuais possuem menu acionável por botão. Textos longos preservam hierarquia; handout em imagem precisa de descrição editável. Não prometer OCR automático.

## Formulários e erros

Campos têm labels permanentes, instruções e erro associado. Não usar placeholder como único rótulo. Passos de criação informam posição e permitem voltar sem perder dados. Validação mostra campos problemáticos e resumo com links; mudança dinâmica não move foco sem ação explícita. Destruição/importação em conflito: descrever qual personagem/campanha, efeito e alternativa antes de confirmar em modal próprio. Autosave anuncia “Salvo” discretamente; falha persiste com opções de recuperar/exportar.

## Prova e ownership

A11Y-001 é auditoria transversal com relatórios próprios e solicitações de correção ao dono de cada módulo; não autoriza edição global. Cobertura: criação/importação, alteração de PV, rolagem, conjuração/concentração, inventário, nota/mapa, busca/favorito e backup offline. Testes automatizados encontram parte dos defeitos; concluir exige teclado, zoom, reduced motion e leitura por leitor de tela em ao menos uma combinação documentada, mais Safari/iOS para riscos de viewport. Registrar versões/dispositivos e limitações. Ver [Swarm QA](swarm/QA.md) e [passo 17](passos/17-acessibilidade.md).
