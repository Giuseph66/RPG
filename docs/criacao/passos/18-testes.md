# 18 — Integração e testes

Estado: TODO — implementação não iniciada.

Prioridade: P0.

Complexidade: Alta.

Dependências: DICE-002, CHAR-003, CHAR-004, UI-003, UI-004, MAP-001, JOUR-001, COMP-001, RULE-002, SPELL-002, ITEM-002, DATA-006, PWA-001, A11Y-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: PWA-001, UI-005, REL-001.

Tasks: CORE-002, QA-001, QA-002, QA-003, QA-004; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Integrar módulos reais e comprovar regras, persistência, offline e fluxos completos sem confundir mocks com produto pronto.

## 2. Por que existe

Testes isolados não detectam perda de save, comando duplicado ou atualização de SW durante sessão. Gate precisa evidência adequada ao comportamento.

## 3. Escopo

CORE-002 composição; QA-001 determinismo de regras; QA-002 integração/armazenamento; QA-003 offline; QA-004 aceite/performance e consolidação.

## 4. Fora do escopo

Expandir features, reescrever implementação pelos agentes QA, chamar teste planejado de executado e rodar comandos nesta fase documental.

## 5. Pré-requisitos

Cada tarefa segue seu DAG: QA de regras pode avançar antes do PWA; QA final aguarda offline/a11y/regras. Testes locais começam nos respectivos passos, não apenas aqui.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/app/feature-registry.ts`
- `tests/rules/**`
- `tests/fixtures/rules/**`
- `tests/integration/**`
- `tests/fixtures/backups/**`
- `tests/offline/**`
- `docs/implementacao/offline/**`
- `docs/implementacao/qa/**`
- `tests/acceptance/**`

## 7. Contratos envolvidos

Exports públicos, fixtures source-based, RNG controlável, ports e banco real de teste, revisão/CAS, artefato de produção e matriz de ambiente.

Fontes/documentos canônicos: [Testes](../12-TESTES.md), [Swarm QA](../swarm/QA.md), [Checkpoints](../swarm/CHECKPOINTS.md).

## 8. Fluxo

Integrar exports → executar provas por camada conforme autorização → registrar resultado/limite → encaminhar falha ao owner → retestar afetado → consolidar gates.

## 9. Regras

Expectativas independentes da implementação; números mecânicos rastreados à fonte. Mock serve isolamento, não prova round trip. Teste de PWA usa produção. Não existe permissão QA para editar fora de paths próprios.

## 10. Mobile

Roteiro de sessão em celular representativo com limitação de CPU/rede/memória documentada, orientação e toque.

## 11. Desktop

Múltiplas abas, teclado, exports/download e atualização instalada; comparar estado observado com snapshot persistido.

## 12. Estados especiais

Quota/corrupção, JSON futuro, migração abortada, pack ausente, clique duplicado, offline parcial, stale assets e revisão concorrente.

## 13. Armadilhas

Suite espelha código; cobertura percentual vira aceite único; banco falso mascara CAS; alterar regra para teste passar; executar teste longo sem autorização vigente.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **CORE-002**: Smoke integrado criar→rolar→agir→nota→recarregar e checagem dos imports; regressões encaminhadas ao dono do módulo.
- **QA-001**: Limites e combinações de proficiência/CA, dano/concentração/morte, descanso/Pact Magic, slots/ritual e nível/equipamento.
- **QA-002**: Criar, dano/cura, rolar, conjurar, inventário, nota/mapa, reload, duas abas, migração falha e reset seletivo.
- **QA-003**: Cold/warm start, airplane mode, asset desatualizado, ativação adiada, falha cache e sessão durante atualização.
- **QA-004**: Roteiro de sessão real, orçamento de carga/compêndio/imagem, uso de memória e regressões dos achados corrigidos.

## 15. Critérios de aceite

- **CORE-002**: Quatro destinos exercitam engines e repositories reais; fixtures/mocks não mascaram ausência de persistência ou custo; fronteiras de importação respeitadas.
- **QA-001**: Casos de referência independentes da implementação com RNG controlado; pendências não viram expectativas inventadas; suite demonstra fórmulas, exceções e interações.
- **QA-002**: Sessão persiste após recarga; conflitos/quota não perdem original; export/import campanha inclui anexos; nenhum mock conta como prova ponta a ponta.
- **QA-003**: Shell e conteúdo necessário disponíveis offline; recarga profunda funciona; nova versão não apaga storage/draft; versões/plataformas da prova registradas.
- **QA-004**: Todos gates obrigatórios têm prova e revisão; nenhuma pendência bloqueadora marcada resolvida por mock; features limitadas explicitamente expostas; ausência de backend confirmada.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Integrar engine e repository reais.
- [ ] Rastrear cada aceite a evidência.
- [ ] Fechar apenas gates comprovados.

## 17. Handoff

REL-001 recebe relatório final, versões/ambientes e limitações; coordenador atualiza status apenas após revisão e demonstração.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

