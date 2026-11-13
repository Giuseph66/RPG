# Handoff — formato obrigatório

## Entrega do produtor

Usar um registro por tarefa/revisão, enviado ao coordenador para anexação ao histórico; não disputar escrita de arquivo global.

```text
ID e título:
Responsável e revisão-base:
Lane e configuração: Claude MCP prioritário — `claude-sonnet` (Sonnet/medium) ou `claude-opus` (Opus/xhigh) + prova de identidade/modelo; Codex Luna/Terra somente fallback por crédito/limite ausente ou incapacidade técnica, com motivo/evidência:
Status proposto: REVIEW | BLOCKED
Resumo de comportamento entregue:
Arquivos realmente alterados:
Arquivos próprios confirmados / exceções autorizadas:
Contratos importados e versão:
Exports públicos, entradas, resultados e códigos de erro:
Persistência, efeitos e atomicidade envolvidos:
Fontes mecânicas e pendências relevantes:
Critérios de aceite: cada item + evidência
Testes executados: comando, ambiente, resultado
Testes não executados e motivo:
Mocks/fixtures utilizados e limites da prova:
Riscos, limitações e dívida autorizada:
Consumidores destraváveis após aceite:
Como reproduzir manualmente:
Pedido concreto ao próximo owner, se houver:
```

## Solicitação entre ownerships

Informar produtor/consumidor, arquivo do produtor, contrato atual/proposto, caso real que exige mudança, compatibilidade/migração e exemplo de aceite. Consumidor pausa só trabalho dependente. Produtor responde com alteração ou alternativa documentada; consumidor não cria adapter duplicado para contornar indefinição sem ADR. Coordenador reserva produtor caso já exista outra tarefa ativa na área.

Exemplo: MAP-001 precisa de importação atômica de Asset+Map no CampaignRepository. Envia requisitos a DATA-001/DATA-003 e aguarda contrato/adapter revisados; não importa IndexedDB na feature. Se mudança for apenas composição de implementação existente, encaminhar CORE-002.

## Revisão e conclusão

Revisor confere escopo, fonte, invariantes e evidência; coordenador aceita DONE somente depois da prova exigida. Handoff documenta API pronta para consumo, não “veja o código”. Não reportar teste planejado como executado. Nesta fase documental todos os testes descritos são futuros.

Para Claude Code, registrar a prova de identidade/modelo efetivo antes da execução, inclusive se fallback ocorreu. A cópia estável `mcp-agents` 0.30.0 seleciona por ambiente: `claude-sonnet` (Sonnet/medium; fallback de modelo Opus na mesma lane) e `claude-opus` (Opus/xhigh; fallback de modelo Sonnet na mesma lane). Fallback não troca servidor/MCP. Ausência dessa prova torna a lane BLOCKED, não substituível por promessa ou inferência. Coordenador agrega handoff, mas não se torna owner do produto.
# Handoff vigente SUP — 11/11/2026

Workers reservados em TASKS/OWNERSHIP, revisão-base `09ec599`. Relatórios de entrega: `Testes/complementos-fontes.md`, `Testes/complementos-dominio.md`, `Testes/complementos-interface.md`. Claude não foi acionado: override do projeto e pedido atual exigem exclusivamente Luna. Modelo efetivamente disponível `gpt-6-luna`, esforço `xhigh`. Handoffs devem distinguir testes executados, fixtures, prova real e limites; nenhum gate histórico valida a rodada atual.

Recuperação de limite SUP: os três workers encerraram com `You’ve hit your usage limit`; `list_agents` confirmou estado terminal. Fonte/UI deixaram extrações, catálogo95, composer, componentes/editor e integração parcial. Domínio deixou contratos/combate/dispatcher/spell-state parciais; facade, conteúdo Fada/Tasha/Ariel, proposals e QA global ainda não estavam concluídos. Nenhum build/aceite final comprovado. `followup_task` de SUP-02 recuperou execução e confirmou uso de ferramentas; SUP-01/03 receberam retomada preservando ownership e sem repetir extração. Não reduzir objetivo ao subconjunto pronto.

## SUP — diagnóstico de integração e evidência parcial

O smoke `src/app/bootstrap.test.tsx` passou 15/15 após SUP-03 corrigir seletor da busca em abas e TDZ do componente Map/estado data. Focais de UI passaram 60 testes em 8 arquivos; isso não prova navegador ou transação real. Navegador sintético encontrou import ausente de asEntityId no progression.ts (SUP-01 corrigiu, fluxo ainda em retomada).

Uma rodada diagnóstica de typecheck foi antecipada pela coordenação para capturar incompatibilidades antes do browser; saída integral em `Testes/logs/complementos-typecheck-diagnostico.log`, ainda com falhas. A/B/C corrigem exclusivamente seus paths; não é aceite SUP-CP4. Nenhum build/suite global foi executado.

SUP-02 registrou handoff próprio em `Testes/complementos-dominio.md`. O focal `wild-shape-service.test.ts` passou 1/1 com repositório em memória e CreatureService mock: prova consulta de registro revelado, avistamento e transformação/hydrate, não aprovação/outbox/rollback nem IndexedDB real. Os 27 testes de derivação/combate/criação anteriores são regressão legada; cobertura específica nova de Forma Selvagem ainda está pendente. Teste de update direto/Inconsciente e descanso curto/expiração foram adicionados e passaram no lote de 10 com demais regressões.

SUP-01 corrigiu IDs numéricos inválidos de Consciência Primordial, vazamento das três invocações para a lista Ranger sem selecionar a opção, textos/referências Tasha p.51–56 e allowlist de truques Druida. Último lote reportado antes das correções era 29/31; não declarar pacote aceito sem rerun e pipeline real. Extração/proveniência é o único checkpoint aceito até aqui.

SUP-01 entrou em REVIEW: 6arquivos/34testes passaram após correções de fonte, escolha DruidicWarrior e pipeline Fada1→5 comJSON roundtrip. Fonte documenta invocações e efeitos ainda assistidos. `qa_forma_selvagem` Luna xhigh foi iniciado como leaf em vaga liberada, ownership exclusivo do novo wild-shape/index.test.ts e handoff de QA; SUP-02 mantém produto/infra. Não confundir conclusão de owner com aceite funcional de SUP-CP2/3/4.

Browser encontrou catálogo vazio apesar dos dados95: o loader local não incluía `creatures` no RulePack. SUP-02 recebeu o único index.ts de loader como transferência narrow de SUP-01 encerrado, para adicionar mapa base95. SUP-03 preserva o perfil sintético Lina; SUP-QA-FORMA usa o pack real e não deve mascarar falha com catálogo injetado só no teste.

## Recuperação SUP — 12/11/2026

Inventário confirmou handles antigos ausentes; somente raiz ativa. Worktree atual mantém amplo conjunto staged. Leitura atual do loader PHB confirma import de appendixACreatures e publicação em creatures:Map95; o bloqueio anterior de catálogo vazio foi corrigido no código, mas falta comprovação no navegador. Handoff de QA da forma/teste puro ainda ausentes; evidência de tipo/build global e infraestrutura continua insuficiente. Três novos Luna xhigh receberam reservas disjuntas de regras, persistência e interface, conforme OWNERSHIP. UI produzirá diagnóstico de tipos atual; logs antigos são históricos. Raiz segue sem editar/testar produto.

Diagnóstico atual de tipos executado por interface_retomada: 17 erros, UI sem erros. Log integral atualizado em `Testes/logs/complementos-typecheck-diagnostico.log`; regras corrige motor/application/catalog mapper e persistência corrige fixtures JsonValue. BackupEnvelope não cobria entidades de criaturas; contrato transferido ao owner de persistência, que implementará arrays opcionais com ausentes normalizados para []. Gate final continua pendente.

Revisão intermediária 12/11: regras reportou 12/12 testes em `service.test.ts` e `wild-shape/index.test.ts`, com catálogo real95, avistamento, ND/tipo/enxame, atributos efetivos, PV/retorno/excedente, duração/descansos e Lua/nível20. O caso de PV temporários/cura será fortalecido para distinguir o saldo atual do snapshot inicial; CA de equipamento vestido e conjurações com fontes reais continuam em trabalho. Bootstrap reportou16/16 e lote de recursos/magias41/41; não são gates globais.

Revisão de integração encontrou pools divergentes nas projeções de PV de Jornada/Colaboração. UI agora consome PV efetivos; `saveSheetState` grava `formHp` durante a transformação e normaliza saída ao zerar/inconsciência sem substituir o agregado pelo snapshot. Persistência valida a ACL correspondente. Navegador recebe janela sem mudanças de produto para verificar o percurso e recarga.

Backup preserva a semântica existente: `copy` remapeia IDs; `replace` substitui por ID com recovery do valor colidente. Não há limpeza global de campanhas na importação. O writer passou a incluir criaturas/avistamentos/palpites/propostas; comprovação IndexedDB, migração6, rollback e emulador permanecem a cargo de persistência. Gates SUP-CP2/3/4 seguem abertos.

Auditoria funcional Tasha confirmou Hábil com escolha `kind: expertise`, mas o coletor antigo inferia expertise pelo nome do ID e ignorava `ranger.canny.skill`. Correção delegada ao domínio mantendo IDs persistidos. Peregrino já fornece modificadores; Glamour e Incansável ainda precisam da revisão do executor/cálculo. Metadados ou descrição da característica não bastam como prova de benefício passivo aplicado.

Browser nuclear12/11 reportado por interface_retomada: wizard real Elfo/Druida1, evolução para Druida2/Lua, catálogo95/0vistas, LOBO marcado explicitamente. Forma mostrou CA13, FOR/DES/CON12/15/12, PV11/11 e originais17/17, Mordida+4; deslocamentos da forma sem voo/natação. Reload preservou transformação/PV originais; retorno voluntário restaurou17/17 e uso passou2/2→1/2. Janela de produto liberada para correções. Dano/cura/temp/zero/excedente/inconsciência, proposta revisada, Fada/Tasha e capturas responsivas ainda não são aceitos por essa prova.

Browser ampliado12/11: dano3/cura2 deixou10/11; temporários4 e dano6 deixaram8/11; dano13 encerrou a forma e transferiu excedente5 ao original17→12. Inconsciência encerrou forma preservando12/17; rótulo foi corrigido com focal9/9. Avanço59+1min expirou corretamente; descanso curto fora da forma recuperou usos. Log/capturas em `Testes/complementos-interface.md`. Tela transitória de erro coincidiu com HMR de bootstrap; causa ainda é hipótese e sequência deve ser repetida em fonte estável/produção.

Regras: CA vestida corrigida após revisão de escudo/natural, com expectativas16/21/22 e equipamento inativo14. Descanso e derivação passaram19/19, incluindo expiração→original17/temp0, persistência9h→cura só da forma e CON original nos Dados de Vida. Glamour declarativo passou16/16 nos focais (WIS positivo/negativo, testes/perícias CHA, saves/ataques preservados). Incansável e conjurações reais18/20 continuam pendentes. Bootstrap16/16 cobre quatro stores, import inválido sem overwrite, copy e reset; backup8/8 cobre remapeamento por tipo, sem substituir migração/rollback.

Persistência: ACL isolada Firestore/Auth passou3/3 em portas8282/9198, preservando processo existente8080. Revisão posterior encontrou aprovação remota aceitando NDnull; owner está corrigindo para exigir ND final e acrescentar negativa no emulador. Migração6, roundtrip de forma/visto/proposta, rollback/CAS e cleanup/hydration ainda exigem handoff de prova. Nenhuma regra foi publicada em produção nesta rodada.

SUP-02P em REVIEW: handoff atualizado em `Testes/complementos-persistencia.md`, focais7/88 e emulador1/3 verdes na versão corrigida (NDnull/tamanho inválido negados). Bootstrap16/16 agora combina forma ativa, pools/snapshot/visto, reveal e quatro coleções no runtime com fake-indexeddb; compara import inválido, preserva outra campanha, copy/reset. Migração v5→6, rollback/outbox/CAS, cleanup e hidratação usam repositórios de produção sobre fake-indexeddb; não são provas de Chromium ou Firebase hospedado. Produto devolvido sem stage/reset/commit; P permanece disponível para falhas globais e uma revisão read-only delimitada de descanso/CA.

Bloqueador funcional de conjuração identificado12/11: domínio aceita gratuidade, mas buildSpellCapabilities só expunha modo normal/espaço; Fogo das Fadas/Aumentar-reduzir ainda eram suprimidas como blocked e faltava passagem de SpellTargetContext pela ação/UI. B implementa capabilities distintas por origem/custo e a ponte mínima de decisões/alvo; C implementa controles visíveis. Confirmar conjuração assistida deve gastar somente uso OU espaço escolhido, sem fingir resolução automática do alvo. Metadados/fonte insuficientes não são liberados globalmente. Testes diretos de domínio anteriores não aceitam esse fluxo como pronto; SUP-CP2/3/4 continuam abertos até aplicação/dispatcher/UI reais.

Incansável teve focal21/21 em capacidades/descanso (d8+WIS, mínimo no total, highest-wins, exaustão1→removida e requisitos). Falta prova ActionDispatcher/commit/cancelamento/CAS antes do aceite. Velocidade da forma agora usa base da besta com modificadores ativos e supressão final de fly/swim; focal13/13. Revisão pediu preservar escalada publicada superior à alternativa speed-copy, sem rebaixá-la.

Retomada SUP em 12/11, 23:54 UTC: interface atingiu limite de uso; novo inventário mostrou somente raiz. Followups recuperaram os mesmos três owners, confirmados pelo inventário; não houve criação de workers concorrentes nem transferência de produto à raiz. Persistência mantém REVIEW. Fonte atual já contém preservação da escalada superior e restrição da liberação racial assistida a magias sem dano/cura e com efeitos somente narrativos. Dispatcher agora incorpora alvo/material ao comando efetivamente persistido. Essas leituras confirmam alterações, não substituem as provas integradas ainda em execução por B/C.

Contrato mínimo de conjuração publicado: capabilities distintas `:feature`/`:slot`; `spellTargeting`, `spellRequiresMaterial`, `spellAllowsFocus`; intents `spellTargetContext`/`spellComponentContext`. Fada confirma material real quando necessário, sem foco racial; Reforço dispensa M e oferece variante opcional de 1 minuto sem concentração. Efeitos/posições assistidos permanecem explícitos. Materiais custosos, consumíveis ou específicos sem ponte de inventário não devem ser liberados por essa integração. P revisou custo/validação sem achar gasto cruzado; seus achados de histórico e liberação assistida foram encaminhados ao único writer B. Faltam testes dispatcher, interface e gates globais.

Auditoria SUP-CAT: P comparou95/95 nomes únicos/ordem e valores de CA, PV/dados, seis atributos, tipo/porte, ND/XP com o Apêndice A; esses campos coincidem. Encontrou5 deslocamentos divergentes (Coruja, Coruja Gigante, Morcego, Polvo, Texugo) e segmentações defeituosas: Teia/Sopro/Nuvem de Tinta incorporados a outros ataques; Engolir fragmentado; traços de lobo/polvos; variantes tratadas como ações e IDs duplicados. Coordenação autorizou correção exclusiva do catálogo/teste por P, preservando mapper de B, com relatório `Testes/complementos-catalogo-qa.md`. Fonte/data ainda não aceita funcionalmente. Smoke/gates aguardam estabilidade de SUP-CAT e regras; não promover SUP-CP2/3/4.

Ponte de magia avançou: B reportou4 arquivos/60 testes verdes após encaminhar a execução pelo dispatcher canônico e provar ActionDispatcher2/18/20 em forma. C corrigiu a diferença entre preview rejeitado real e mock needsInput, material rastreável e variante1min com concentração ativa; último lote Actions+Wizard passou2 arquivos/43 testes. Execuções são focais sobrepostas, não suíte global. Fonte estável conjunta ainda pendente.

Novos bloqueadores de fonte/fluxo: grants de subclasse Ranger estavam `alwaysPrepared:false` e eram ignorados pela reconciliação histórica de Bruxo; B implementa marcador conhecido automático sem contar limite, sem alterar Bruxo. C identificou export real de Fada1 do wizard com `choices:[]`, sem atributo de conjuração/fonte racial. Hipótese rawPack foi refutada: syncSpellcasting recompõe conteúdo internamente. C corrigiu a escolha obrigatória/legível no wizard; B fecha validação de materialização. Novo personagem válido será criado/exportado pela UI para o smoke; fixture antigo permanece evidência da falha, não será contado como prova funcional.
