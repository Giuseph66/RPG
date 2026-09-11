# 12 — Estratégia de verificação futura

Esta etapa não executa testes de aplicativo: não há implementação. Auditoria documental de links, cobertura, IDs, dependências e contradições é parte da entrega solicitada. Na implementação, execução de testes/lint/build segue autorização vigente do usuário.

## Camadas de prova

| Categoria | O que provar | Exemplos de falha real |
| --- | --- | --- |
| Unitária | Função pura e limites | Arredondamento de atributo negativo; cancelamento de vantagem |
| Regras | Mecânica + fonte exata + exceção | Recuperação da compilação difere de outra edição |
| Contratos | IDs, versão, validação e referência | Subclasse pertence a outra classe; spell ID ausente |
| Integração | Comando, repositório, store, derivações | Slot consumido duas vezes; snapshot anuncia save abortado |
| Persistência | Transação, migração, recuperação e backup | Importação parcial; conflito entre abas; quota excedida |
| Componentes | Interação e semântica | Foco perdido no overlay; botão sem rótulo |
| Responsiva | Mesma função em três layouts | Header cobre campos; ações dependem de hover |
| Offline/PWA | Ciclo real de instalação/cache/update | Rota lazy falha sem internet; SW novo quebra schema antigo |

RNG, relógio, UUID e repositório são controláveis. Fixtures apontam livro/capítulo/página. Não tirar resultado esperado da mesma função testada. Testes de navegador reais complementam mocks de IndexedDB; sucesso em mock não comprova quota, eviction, lifecycle ou atualização.

## Cenários de integração mínimos

1. Criar personagem → salvar → recarregar → conferir escolhas e derivados.
2. Conjurar com um espaço → duplo clique → exatamente um gasto; faltar componente → nenhum gasto.
3. Dano durante concentração → PV atualizados e resistência pendente persistida; recarregar não perde pedido.
4. Forma Selvagem → dano excede PV da forma → reversão e remanescente, preservando personagem original.
5. Descanso válido → recuperar apenas recursos elegíveis; repetir comando → não duplicar recuperação.
6. Exportar/importar campanha com mapa e referências → grafo sem referências quebradas; cancelar prévia → banco intacto.
7. Duas abas na mesma revisão → segundo write conflita; nenhum overwrite silencioso.
8. Migração falha no meio → banco anterior/cópia íntegra e exportável; nenhuma exclusão automática.
9. Instalar/carregar tudo, desconectar, fechar e reabrir → quatro destinos, dados, pesquisa e mapa disponíveis.
10. Atualização disponível durante edição → adiar; aplicar após flush → dados e navegação recuperados.

## Matriz de opções

Cada raça/sub-raça, classe/subclasse, antecedente e talento terá ao menos fixture válida, limite e opção inválida. Progressão testa todos níveis 1–20 por classe; magia distingue conhecidas, preparadas, grimório, pacto e fontes raciais. Catálogo completo tem validação referencial, não somente amostra visual.

Conflito da fonte gera teste marcado como bloqueado com ID de pendência, nunca expectativa inventada. Testes verdes sem casos bloqueados resolvidos não habilitam opção indisponível.

## Evidência de aceite

Registrar tarefa, revisão, ambiente/navegador/dispositivo, cenário, resultado e limitações em [QA](swarm/QA.md). `DONE` requer critérios objetivos e integração no contrato aprovado. Métrica de cobertura de linhas não substitui regras e recuperação. Checkpoints em [CHECKPOINTS](swarm/CHECKPOINTS.md).
