# QA-004 — Revalidação da cobertura do Compêndio (2026-09-12)

Validação da cobertura reaberta para as nove categorias que apareciam como `Pendente` no catálogo visual. A execução usou o build local servido temporariamente em `127.0.0.1:5183`; a porta `5173` permaneceu intocada. O preview foi encerrado ao final e a porta 5183 ficou livre.

**Decisão: ACCEPT.** Todas as nove categorias retornaram entradas no runtime real, sem o rótulo `Pendente`: Regras, Combate, Atributos, Perícias, Armas, Armaduras, Descanso, Movimentação e Aventura. Busca, detalhe, fonte e favoritos para entradas estáticas passaram no teste focal e no smoke de navegador.

## Gates executados

```text
$ npx vitest run src/application/compendium/compendium.test.ts src/data/compendium/static.test.ts src/features/compendium/Compendium.test.tsx src/app/bootstrap.test.tsx src/app/router.test.tsx
Test Files  5 passed (5)
Tests       24 passed (24)

$ npm run typecheck
tsc -b — exit 0

$ npm run build
vite — 243 modules transformed — exit 0
Aviso: chunk JavaScript acima de 500 kB após minificação.

$ npx vitest run
Test Files  88 passed (88)
Tests       533 passed (533)

$ git diff --check
sem saída — exit 0
```

## Cobertura observada no runtime

Na rota `/compendium`, o catálogo injetado pelo bootstrap carregou as categorias abaixo. O número é o resultado exibido após selecionar a categoria:

| Categoria | Estado visual | Entradas | Evidência de conteúdo |
| --- | --- | ---: | --- |
| Regras | disponível | 9 | Resolução com d20, testes, proficiência e vantagem/desvantagem |
| Combate | disponível | 9 | Ações, ataque, cobertura, dano, morte e PV temporários |
| Atributos | disponível | 6 | As seis habilidades do catálogo local |
| Perícias | disponível | 18 | As dezoito perícias do catálogo local |
| Armas | disponível | 37 | Subconjunto de equipamentos com tag `weapon` |
| Armaduras | disponível | 13 | Subconjunto de equipamentos com tag `armor` |
| Descanso | disponível | 6 | Descanso curto/longo, interrupção, Dados de Vida e recuperação |
| Movimentação | disponível | 7 | Movimento, ritmo, terreno, salto e espaço |
| Aventura | disponível | 8 | Regras mecânicas parciais de tempo, ambiente e interação |

Nenhum dos botões de categoria continha `Pendente` após o catálogo real ser carregado. A seleção de `Resolução com d20` abriu o detalhe com o resumo, o pack `phb-ptbr-local-2017@1.0.0` e a fonte `Introdução, p. 7`; o botão mudou de `Favoritar` para `Remover favorito` e exibiu a estrela de favorito.

Os filtros de equipamentos ficaram isolados no navegador: Armas exibiu `Adaga` e não exibiu `Acolchoada`; Armaduras exibiu `Acolchoada` e não exibiu `Adaga`. Os testes focais também verificaram que cada subconjunto usa somente as definições reais do equipamento instalado.

Aventura é explicitamente uma cobertura mecânica parcial do Livro do Jogador. O detalhe `Escopo de Aventura` declara que campanhas, personagens não jogadores, mapas e procedimentos do Mestre não fazem parte dessa fonte; a UI não promete esses conteúdos.

## Smoke automatizado

Comando:

```text
$ BASE_URL=http://127.0.0.1:5183 bash tests/acceptance/acceptance-matrix.sh
/ 320 "overflow": false
/ 1280 "overflow": false
/character 320 "overflow": false
/character 1280 "overflow": false
/actions 320 "overflow": false
/actions 1280 "overflow": false
/journey 320 "overflow": false
/journey 1280 "overflow": false
/compendium 320 "overflow": false
/compendium 1280 "overflow": false
dice-close ```
exit 0
```

O smoke manual adicional navegou pelas nove categorias em `/compendium`, confirmou contagem e ausência de pendências, selecionou uma entrada estática, confirmou sua fonte e alternou o favorito. A única mensagem de console foi `favicon.ico` com HTTP 404 no build local; não afetou a rota, os resultados ou os gates.

## Limitações

Esta rodada prova a disponibilidade e consulta do catálogo local resumido. Ela não prova cobertura integral do Livro do Jogador nem resolução automática de situações dependentes da mesa. Em particular, Aventura não inclui conteúdo narrativo, campanhas, PNJs, mapas ou procedimentos completos do Mestre. Também não foram executados instalação mobile, leitor de tela nativo ou atualização de Service Worker.

Somente este arquivo foi criado no ownership de QA nesta rodada; nenhum produto, configuração ou documento de swarm foi alterado.

**Status final: ACCEPT.**
