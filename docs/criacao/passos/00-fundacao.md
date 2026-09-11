# 00 — Fundação

Estado: READY — implementação não iniciada.

Prioridade: P0.

Complexidade: Média.

Dependências: nenhuma; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: DATA-001, UI-001.

Tasks: CORE-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Estabelecer o esqueleto técnico mínimo sobre o qual contratos, design e módulos poderão avançar independentemente na futura implementação.

## 2. Por que existe

Sem composição e ferramentas comuns, agentes criam convenções incompatíveis e disputam configuração. A fundação destrava trabalho paralelo sem construir funcionalidades fictícias.

## 3. Escopo

React, TypeScript, Vite e configuração de rotas planejadas; entradas, aliases, scripts e convenção de exports. Registrar dependências efetivamente aprovadas na fase futura.

## 4. Fora do escopo

Features prontas, backend, autenticação, banco remoto, telas completas, instalação de pacotes nesta fase documental.

## 5. Pré-requisitos

Ler ADR da stack, fronteiras da arquitetura, matriz de ownership e regras vigentes para instalação/execução de comandos. O pedido atual autoriza documentação somente.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`
- `src/app/bootstrap.tsx`
- `tests/setup.ts`

## 7. Contratos envolvidos

Pontos de composição do bootstrap/router/feature-registry; limites domain/application/infrastructure/features. Contratos de negócio ainda serão materializados por DATA-001.

Fontes/documentos canônicos: [Arquitetura](../03-ARQUITETURA.md), [ADR da stack](../decisoes/ADR-0001-stack.md).

## 8. Fluxo

Reservar CORE-001 → criar configuração mínima → estabelecer composição vazia → documentar scripts/aliases → validar bootstrap conforme autorização futura → entregar base para DATA-001 e UI-001.

## 9. Regras

Não colocar regras RPG em configuração nem importar Firebase/Supabase. A arquitetura admite adapter remoto futuro, sem dependência presente. Arquivos compartilhados continuam sob CORE-001 ao longo do projeto.

## 10. Mobile

Preparar viewport e suporte a safe areas sem bloquear zoom; não definir dimensões desktop como base universal.

## 11. Desktop

Permitir conteúdo crescer por espaço disponível; entrypoint é o mesmo do mobile, sem segundo aplicativo.

## 12. Estados especiais

Dependência não autorizada, ambiente sem ferramenta necessária, build incompatível e biblioteca sugerida sem justificativa ficam registrados; não contornar com stack diferente.

## 13. Armadilhas

Criar “hello world” como se fosse feature concluída; instalar bibliotecas de UI enormes; cada agente alterar package.json; configurar CDN como requisito offline.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **CORE-001**: Na implementação: smoke do bootstrap, checagem de tipos e bundle de produção após autorização aplicável; provar ausência de chamadas externas obrigatórias.

## 15. Critérios de aceite

- **CORE-001**: Estrutura mínima inicia sem feature fictícia; aliases e fronteiras documentados; scripts distinguem checagem de tipo, testes e build; ausência de backend/API obrigatória.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Confirmar escopo documental antes da fase de software.
- [ ] Reservar apenas arquivos CORE-001.
- [ ] Entregar scripts, composição e limitações.

## 17. Handoff

DATA-001 recebe convenções de importação/exports; UI-001 recebe entrada de estilos; futuros pedidos de configuração retornam ao mesmo owner.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

