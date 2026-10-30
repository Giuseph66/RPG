# Testes do RPG — 04/10/2026

**Fechamento reaberto:** C19 (sincronização de criatura) em investigação após captura do usuário. C01–C18 foram validados nos cenários documentados. Mapas novos em base64 no Firestore; mestre→jogador e ocultação aprovados. Gate: 1.090 testes passaram/3 ignorados; typecheck/build passaram. Ver [Correções](correcoes.md), [Mapas base64](correcao-mapas-base64.md) e [QA jogador de mapas](correcao-mapas-base64-jogador.md). A avaliação original abaixo foi preservada como histórico.

Rodada de avaliação funcional concluída. Os fluxos executados, falhas reproduzidas e limites de cobertura estão registrados abaixo e nos relatórios por papel.

## Ambiente e ownership

- Repositório: `/home/jesus/Progetos/RPG`.
- Revisão inicial: `948adc2cae6a2f42ae5ea3e069b72bcbd96fcb12`; árvore inicialmente limpa.
- Mestre: subagente `gpt-6-luna`, esforço `xhigh`, navegador Codex, desktop; dono de `mestre.md` e `evidencias/mestre-*`.
- Jogador: subagente `gpt-6-luna`, esforço `xhigh`, Chrome, viewport mobile; dono de `jogador.md` e `evidencias/jogador-*`.
- Raiz: inicialização, suíte automatizada, build, validação complementar e consolidação; dono dos demais arquivos desta pasta.
- Aplicação de desenvolvimento: `http://localhost:5173`.
- Preview de produção: `http://localhost:4173`.
- Node: `24.12.0`, dependências já instaladas; nenhuma dependência adicionada.

## Critérios de avaliação

Criar personagem e campanha QA; verificar ações, ficha, inventário, dados, compêndio, diário, mapas, sessão, convidados, comunicação, persistência e responsividade. Registrar resultado observado, passos de reprodução, impacto e limitações. Testes bloqueados ou não executados não contam como aprovação.

Pedido atual autoriza a raiz a rodar o projeto e testes e exige dois subagentes Luna Extra High. Esta rodada não modifica código de produto nem marca gates históricos como concluídos. A coordenação/ownership da rodada está contida nesta pasta.

## Evidências técnicas

- `evidencias/dev.log`: inicialização Vite.
- `evidencias/testes-automatizados.log`: suíte completa sem `--aplica`.
- `evidencias/build.log`: TypeScript e build de produção.
- `evidencias/preview.log`: preview de produção.

## Relatórios

- [Mestre — desktop](mestre.md): campanha, mapa, diário, elenco, sessões, iniciativa, dados, compêndio e colaboração.
- [Jogador — mobile](jogador.md): criação/ficha, ações, magia, navegação mobile, papel de jogador, colaboração e falhas observadas.
- [Validação técnica e produção](tecnico.md): suíte/build, reteste das falhas, backup, PWA, diagnóstico e inspeção localizada do crash.

Cada relatório distingue comportamento observado, reprodução, pontos positivos, problemas, melhorias e limitações. Capturas ficam em `evidencias/`; os logs completos estão disponíveis nesta pasta mesmo quando ignorados pelo Git.

## Resultados consolidados

| Área | Resultado observado |
| --- | --- |
| Inicialização e build | Aplicação iniciou; TypeScript/build passaram. |
| Suíte automatizada | 1.002 passaram, 13 falharam, 1 ignorado intencionalmente. Mesmas falhas em reteste serial. |
| Autenticação QA | Duas contas distintas usadas; falha de rede inicial do mestre recuperada no reteste. |
| Convite e membro | Convite aceito; mestre confirmou membro ativo; jogador viu a campanha QA. |
| Papel do jogador | Interface ocultou controles de mestre, mas também tornou inacessível o vínculo da própria ficha: Conta → Abrir colaboração leva à visão geral. Não equivale a auditoria completa de segurança do backend. |
| NPC e privacidade | Nome/presença revelados chegaram ao jogador; categoria/detalhes permaneceram ocultos. |
| Palpite de criatura | Digitar nota derrubou a página do jogador; crash reproduzido duas vezes. |
| Diário compartilhado | Salvo e persistente localmente; escrita remota recusada com `permission-denied`; mestre não recebeu entrada QA após reload. |
| Mapa compartilhado | Escrita remota recusada; jogador permaneceu sem mapa. Importação, zoom e marcador locais funcionaram. |
| Sessão e iniciativa locais | Criar/iniciar sessão, próximo turno e nova rodada funcionaram no mestre. Sincronização completa não aprovada. |
| Dados e compêndio | Mestre conferiu totais, vantagem/desvantagem, histórico, busca, fonte e favoritos. |
| Criação de personagens QA | Fichas criadas; dificuldades de seleção, localização e término do wizard registradas pelo jogador. |
| PV, temporários e cura | Dano, absorção temporária e cura executados. Cair a zero marcou falha de morte automaticamente, divergindo do contrato local; cura recuperou consciência e zerou contadores. |
| Descanso | Curto concluiu; longo recuperou 9 PV após retry com reload. Prévia dizia PV cheios em 1/10 e ficha manteve valor antigo até recarregar. Primeiro comando teve conflito de revisão recuperável. |
| Magia do jogador | Seleção de magias e rolagem de cura funcionaram; confirmar Curar Ferimentos ficou bloqueado por prévia ausente. Aplicação e consumo de recurso não foram aprovados. |
| Backup | Exportação e restauração em origem limpa funcionaram; envelope inválido rejeitado; importação com conflito ficou bloqueada em ambas as políticas. |
| PWA | Jornada abriu com servidor da origem desligado; campanha criada nesse estado persistiu depois de reload. Prova restrita a cache previamente preenchido. |

## Prioridades

1. **P1 — crash de palpite:** entrada de texto deixa a sessão em branco e exige reload. Hipótese corroborada no handler de `PlayerCreatureBoard.tsx:53`.
2. **P1 — vínculo inacessível:** jogador com ficha QA e convite aceito não encontra controle para vinculá-la. Painel com o controle é fornecido somente ao mestre pela composição de Jornada.
3. **P1 — colaboração parcial:** investigar permissões/contratos implantados para mapas e diários; retestar cada canal entre as duas contas. Convite e NPC funcionando não aprovam todas as coleções.
4. **P1 — recuperação com conflito:** habilitar políticas de cópia/substituição conforme contrato, com validação e confirmação adequadas.
5. **P1 — suíte vermelha:** triar as 13 falhas. Parte dos sintomas envolve seletores/assincronismo e WebGL no jsdom; não presumir 13 defeitos de produto independentes.
6. **P2 — feedback e mobile:** tornar estados de sincronização coerentes, encerrar operação recusada com erro acionável, melhorar escolhas do wizard e localizar identificadores internos. Ver recomendações por papel.
7. **P2 — regra de morte:** corrigir/verificar falha automática ao cair de PV positivo a zero, preservando a regra de dano recebido já em zero.
8. **P2 — desempenho:** bundle principal de 4.462,76 kB, gzip 1.386,82 kB; medir celular físico/rede limitada e investigar carregamento inicial.
9. **P2 — execução e descanso:** prover prévia válida para confirmar magia/ataque, conferir atualização da ficha após descanso e orientar recuperação de conflito de revisão. A rolagem manual não comprova aplicação automática nem consumo de recurso.

## Limites e dados QA

Esta rodada executou os fluxos acessíveis e documentou falhas/dependências bloqueadas. Não constitui aprovação integral do RPG, conformidade de acessibilidade ou garantia de funcionamento em todos os aparelhos. Mobile foi viewport de navegador, não celular físico. Instalação/atualização PWA, voz/chat dedicado, segurança completa do backend e todas as combinações de classe/magia permanecem fora da prova manual realizada.

As campanhas `QA Mestre Desktop 2026-10-04`, `QA Mestre Compartilhado 2026-10-04`, `QA Backup Produção 2026-10-04` e `QA Escrita Offline 2026-10-04`, contas sintéticas e personagens QA foram criados para esta rodada. Registros reais pré-existentes não foram editados. Os artefatos QA foram preservados para reprodução; nenhum token de convite ou senha está nos relatórios. Não houve alteração de código de produto nem publicação de regras Firebase.

## Correção posterior

O pedido seguinte abriu a [rodada de correções e reteste](correcoes.md). Os resultados acima descrevem a avaliação original; o status das correções e seus limites ficam nesse novo relatório.

## Fechamento das correções — 05/10/2026

[Consolidado final](correcoes.md), [Mestre desktop](correcao-mestre-final.md), [Jogador mobile](correcao-jogador-fechamento.md) e [Validação técnica final](correcao-validacao-final.md). Suíte atual:1083 aprovados/1 ignorado; typecheck e build aprovados. Os resultados acima pertencem à avaliação original.

Dev ativo em http://127.0.0.1:5173. Previews isolados mencionados na avaliação são históricos. Pendência externa: entrega remota de mapas C03, bucket inexistente e billing desabilitado. A imagem local e a recuperação do upload estão preservadas; não houve ativação de faturamento.
