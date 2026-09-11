# 01 — Design system

Estado: TODO — implementação não iniciada.

Prioridade: P0.

Complexidade: Média.

Dependências: CORE-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: UI-002.

Tasks: UI-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Converter a direção dark fantasy natural em tokens e componentes reutilizáveis, com foco na legibilidade e operação durante sessão.

## 2. Por que existe

Uma base visual compartilhada evita seis versões de botão, modal e barra de recurso; também permite responsividade/acessibilidade desde o começo.

## 3. Escopo

Tokens, tipografia, spacing, estados, controles semânticos, AppModal/ConfirmModal/BottomSheet/Popover/Drawer/ContextMenu e feedback inline.

## 4. Fora do escopo

Texturas pesadas, pergaminho no aplicativo inteiro, componentes de regra, escolha arbitrária de cores nesta documentação e biblioteca nova sem autorização.

## 5. Pré-requisitos

Fundação aceita; ler direção, estados visuais e requisitos de a11y. Cores/fontes finais exigem avaliação de contraste e origem/licença na fase visual.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/styles/**`
- `src/components/ui/**`

## 7. Contratos envolvidos

APIs de UI recebem valores, labels, estados e callbacks; não recebem conexão IndexedDB nem modificam Character. OverlayHost consome o contrato único de superfícies.

Fontes/documentos canônicos: [Design system](../05-DESIGN-SYSTEM.md), [Modais](../interface/modais.md), [Acessibilidade](../13-ACESSIBILIDADE.md).

## 8. Fluxo

Definir escala/token → aplicar a controles representativos → revisar estados/foco/contraste → compor modal/sheet com conteúdo equivalente → entregar uso e limites aos owners.

## 9. Regras

Profundidade principal por superfícies/bordas; materiais ornamentais discretos. Dados de estado sempre legíveis sem cor. Proibidos alert/confirm/prompt; controles HTML semânticos continuam permitidos.

## 10. Mobile

Alvo de toque preferido 44 CSS px, labels visíveis e overlays dentro da viewport visual; sheet tem fechar acessível além de gesto.

## 11. Desktop

Densidade permite tabelas/listas e painel lateral sem transformar tudo em cards; hover complementa, não contém função exclusiva.

## 12. Estados especiais

Disabled, busy, erro, foco, vazio e conteúdo longo; reduced motion remove animação espacial; tema sem asset conserva legibilidade.

## 13. Armadilhas

Hex local espalhado; título decorativo no corpo; placeholder sem label; modal por feature; transformação de toda superfície em cartão igual.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **UI-001**: Componentes: foco, retorno, busy/disabled/erro, toque, nomes acessíveis; matriz de contraste dos tokens; revisão visual em largura pequena.

## 15. Critérios de aceite

- **UI-001**: Paleta validada por contraste; controles com estados; AppModal/ConfirmModal/BottomSheet não usam alert/confirm/prompt; teclado e reduced motion previstos.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Definir tokens sem valores fora da fonte única.
- [ ] Cobrir estados e superfícies próprias.
- [ ] Provar foco, contraste e toque.

## 17. Handoff

UI-002 recebe tokens/primitives estáveis; features usam componentes existentes e solicitam extensão sem cloná-los.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

