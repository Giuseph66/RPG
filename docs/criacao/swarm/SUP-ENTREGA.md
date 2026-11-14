# Complementos e criaturas — auditoria de entrega

Atualizado em 14/11/2026. **SUP-CP1/2/3/4 aceitos.** Este registro consolida o resultado final; relatórios e logs preservam também as falhas das revisões anteriores.

Rodada global final (7): `npm test -- --maxWorkers=2`, 176 arquivos passaram/4 condicionais ignorados; 1.308 testes passaram/7 condicionais ignorados. Typecheck, build e ambos diff checks passaram. A coordenação conferiu logs, handoffs e capturas. Falhas corrigidas sem enfraquecer asserções/timeouts: isolamento de bootstrap, ações permitidas pelo contexto e atualização canônica do card após normalização da forma.

Corrigidos também: pool duplicado no Ranger11, chave de magia por origem, composição opt-in no bootstrap, Druidismo racial sem alvo fictício, nota do editor de revisão, concentração, vínculo à campanha e consumo de ação após conjuração bem-sucedida. No dist da rodada 7, o diálogo do mestre restaurou o card de 8/8 para 17/17 imediatamente ao aplicar Inconsciente, sem reload (rev28). Remover a condição, transformar novamente e recarregar preservou Cervo8/8, original17/0 e gasto2/2 (rev30), sem erros/avisos no console. As tentativas anteriores que revelaram card stale continuam documentadas.


## Pedido e evidência

| Requisito | Resultado implementado e prova | Estado |
| --- | --- | --- |
| Extrair os cinco anexos integralmente | [Manifesto](../../fontes/complementos-2026-11/manifest.json), texto nativo, OCR187 páginas, duas tabelas DOCX, mídias arquivadas. Originais5/5 hashes;2258 membros ZIP conferidos. Conteúdo dos anexos tratado como fonte, não instrução. | Aceito SUP-CP1 |
| Fada e Patrulheiro de Tasha | Packs opt-in persistidos; escolhas, recursos e magias integrados. Browser: Druidismo racial sem gasto, Fogo das Fadas grátis/espaço separados, Aumentar com material declarado, Incansável com PV temporários, Glamour e Reforço grátis seguido da variante por espaço preservando concentração idêntica. Revisão não gasta ação; sucesso atualiza ledger e painel. [Domínio](../../../Testes/complementos-dominio.md). | Aceito SUP-CP2/4 |
| Blocos de monstros/NPCs, manual e sugerido | Contrato genérico de14 tipos/seis portes, editor guiado/campos avançados, renderer compartilhado, Ariel e blocos complementares. Sugestões determinísticas editáveis preservam modelo, razões e necessidade de revisão. [Fontes](../../../Testes/complementos-fontes.md), [interface](../../../Testes/complementos-interface.md). | Aceito SUP-CP3/4 |
| Catálogo e avistamento por personagem |95 blocos do Apêndice A,88 bestas incluindo6 enxames; apenas82 bestas individuais são taxonomicamente elegíveis. Auditoria textual95/95 e correções [documentadas](../../../Testes/complementos-catalogo-qa.md). Browser:95base+1custom, visto somente após ação explícita. | Aceito SUP-CP2 |
| Forma Selvagem, Druida2 | Somente besta vista e elegível pelo nível/classe; sem bloqueio de transformação por voo/natação, mas ambos deslocamentos suprimidos. Físicos/PV/CA/ações da forma, mentais do personagem, snapshot original, equipamento e duração manual. [QA da forma](../../../Testes/complementos-qa-forma.md). | Aceito SUP-CP2/4 |
| PV e retorno íntegros | Browser LOBO:17PV originais/11forma; dano/cura/temp/excedente, retorno voluntário, inconsciência, descanso e expiração. Custom Cervo:8forma/17originais,1/2uso; reload e fechar/reabrir preservaram tudo. | Aceito SUP-CP2/4 |
| Animal personalizado, mestre e jogador | Proposta editável/pending, revisão com ND final, aprovação/reveal atômicos. Dois perfis persistentes: jogador submeteu, mestre revisou/aprovou e retornou por backup; após vínculo UI da ficha, Compêndio mostrou 96/0 vistas e ação de visto disponível, sem reload. Outra custom foi marcada explicitamente, transformada e persistiu após reabertura. [Papéis](../../../Testes/complementos-roles-qa.md). | Prova local obtida; sem prova hospedada |
| Persistência e autorização | IndexedDB6/migração preservadora, backup antigo/novo, copy/remap, rollback/CAS/outbox/hydration/cleanup. [Persistência](../../../Testes/complementos-persistencia.md):focais88 e emuladorACL3/3; browser Chromium persistente atual. | Aceito SUP-CP2/4 |
| Validação funcional final | [QA geral](../../../Testes/complementos-qa-geral.md): resultados finais e intermediários registrados. Rodada 7 com 2 workers, typecheck e build passaram; smoke do dist corrigido passou, inclusive saída automática sem reload e nova transformação persistida. | Aceito SUP-CP4 |

## Limites explícitos

- A extração cobre todo Tasha; implementação cobre Fada e opções de Patrulheiro solicitadas, sem ativar suplementos nas fichas existentes por inferência.
- Efeitos que exigem posição, área, salvaguarda, alvo/turno ou arbitragem continuam assistidos. Invocações não criam automaticamente atores/posições; inconsistência impressa de PV na p.112 permanece sinalizada.
- Materiais custosos, consumidos ou específicos exigem seleção de inventário ainda ausente; essas conjurações permanecem bloqueadas, sem fingir consumo. Druidismo racial registra conjuração narrativa sem simular seus efeitos. Truques de classe com estrutura pendente não são liberados globalmente.
- Ataques condicionais/recorrentes, salvaguardas e dano plano sem fórmula permanecem manuais; o bloco preserva o texto. Automação não soma veneno condicionado nem alternativas de enxame como dano imediato.
- Reforço Feérico oferece opção explícita de1min sem concentração; término é manual. Relógio de Forma Selvagem usa tempo de jogo informado, não tempo real.
- Para conjuração normal com concentração anterior, use primeiro `Encerrar concentração`; confirmar uma pendência não resolvida não substitui concentração por inferência.
- Regras Firestore foram verificadas em emulador isolado; nenhum deploy desta rodada. Não há prova de fluxo pareado em duas contas no serviço hospedado.

## Controle da rodada

Código editado por Luna xhigh, até 3 workers; raiz coordenou/revisou e manteve documentação do swarm. Sem dependências novas no projeto ou publicação solicitada. Alterações e commit externo da base foram preservados; nenhuma autoria é inferida de diff contra HEAD. Gates avaliam o conteúdo do worktree atual.

Grafo reindexado em 14/11 após a correção final do card: status `indexed`, 10.398 nós/31.378 arestas retornados, zero arquivos ignorados por falha e 18 diretórios excluídos pela configuração. Checkpoints históricos do projeto permanecem independentes deste aceite SUP.

Ambiente entregue: Vite dev restaurado em `http://127.0.0.1:5173` após o smoke; perfis e fichas de QA preservados. Evidência visual do retorno imediato: `output/playwright/sup03-qa-2026-11-12/production-cp4-round7-immediate-card.png`; persistência: `production-cp4-round7-reload-transformed.png` no mesmo diretório.
