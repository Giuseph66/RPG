# 12 — Jornada, campanha e mapa

Estado: DONE — MAP-001 e JOUR-001 concluídas; aceite canônico registrado em TASKS/QA.

Prioridade: P1.

Complexidade: Alta.

Dependências: UI-002, STATE-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: CORE-002, DATA-006.

Tasks: MAP-001, JOUR-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Organizar memória local da campanha com mapa simples, locais, diário, NPCs, objetivos e sessões.

## 2. Por que existe

Jogador precisa recuperar contexto narrativo offline; um mapa útil não exige construir VTT.

## 3. Escopo

Mapa por imagem, pan/zoom, marcadores/locais/notas, posição opcional do grupo; campanha, diário, missões, NPCs e vínculos.

## 4. Fora do escopo

Battle map, tokens de combate, fog of war, chat, sincronização, multiplayer e XP automático por missão concluída.

## 5. Pré-requisitos

Shell/estado disponíveis; contratos de campanha/anexos e validação de imagem revistos antes dos dois owners iniciarem. Paths mapa/journal/campaign são disjuntos.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/features/journey/map/**`
- `src/domain/campaign/maps/**`
- `src/features/journey/journal/**`
- `src/features/journey/campaign/**`
- `src/domain/campaign/journal/**`

## 7. Contratos envolvidos

Campaign, Map, Asset, Marker, Location/Note/Session/Mission/NPC e IDs; coordinates normalizadas; repository de campanha/anexos.

Fontes/documentos canônicos: [Jornada](../interface/pagina-jornada.md), [Mapa](../interface/mapa.md), [Dados](../09-MODELO-DE-DADOS.md).

## 8. Fluxo

Criar campanha → importar mapa/validar anexo → adicionar local/nota → registrar sessão/missão → autosave com commit → exportar com anexos no passo 14.

## 9. Regras

Texto do usuário é conteúdo local, não regra de pack. Vínculo rompido precisa estado explícito. Viewport não altera coordenadas persistidas. Excluir pin não exclui nota por omissão.

## 10. Mobile

Mapa em área delimitada com controles zoom e lista acessível; editor não perde draft com teclado/orientação.

## 11. Desktop

Mapa e painel de locais simultâneos; lista/editor de sessões com metadados sem subnavegação principal nova.

## 12. Estados especiais

Sem campanha/mapa, anexo ausente/grande, quota, arquivo inválido, vínculo órfão e conflito entre abas.

## 13. Armadilhas

Imagem gigante decodificada na entrada; salvar coordenada de tela; HTML executável em nota; exportar campanha sem anexos silenciosamente.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **MAP-001**: Round trip de marcador, resize, teclado, anexo ausente/grande/quota e consistência metadado+imagem.
- **JOUR-001**: Edição/reload, vínculos ausentes, troca de campanha com draft, exclusão cancelada, concorrência e conteúdo malformado.

## 15. Critérios de aceite

- **MAP-001**: Coordenadas normalizadas independem do zoom; anexos validam tamanho/tipo; marker não apaga nota implicitamente; sem VTT/multiplayer.
- **JOUR-001**: Notas e campanha restauram offline; texto não executa HTML; objetivo concluído não concede XP; apagar campanha explicita alcance e backup.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Preservar referências e coordenadas.
- [ ] Oferecer mapa operável por lista/teclado.
- [ ] Salvar e restaurar narrativa offline.

## 17. Handoff

DATA-006 recebe inventário de anexos/vínculos para backup; COMP-001 não indexa notas pessoais como regras; CORE-002 integra subáreas por exports.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
