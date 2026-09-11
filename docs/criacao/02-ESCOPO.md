# 02 — Escopo e fases

## Esta entrega

Somente documentação. Nenhuma pasta `src`, componente funcional, dependência instalada, servidor, teste de aplicativo ou configuração executável deve ser criada nesta etapa. Caminhos futuros neste conjunto são especificações, não arquivos existentes.

## V1 implementável em etapas

| Marco | Entrega | Limite |
| --- | --- | --- |
| Fundação | Contratos, shell, tema, repositórios, Dice Engine | Regras não dependem de React |
| Sessão mínima | Personagem criado, ficha, vida, recursos, rolagens e backup | Sem personagem de demonstração confundido com save real |
| Regras completas do pack | Raças, classes, subclasses, equipamento, combate e magia documentados | Exceções ambíguas obedecem [pendências](decisoes/PENDENCIAS.md) |
| Jornada e consulta | Mapas de imagem, registros, busca e favoritos | Sem simulação espacial de batalha |
| Entrega offline | PWA, recuperação, exportação/importação e QA | Primeiro carregamento exige obter o aplicativo |

O wizard inicial cria nível 1; progressão permite alcançar 20. Criação em nível superior reutiliza progressão sequencial, sem ignorar escolhas de níveis intermediários. Regras opcionais de multiclasse, talentos e carga variante ficam em fase posterior explícita, mantendo contratos e documentação nesta entrega. Humano variante depende da fase de talentos. O produto não pode anunciar suporte a uma opção cuja execução ainda esteja bloqueada.

## Fora do escopo inicial

Backend, contas, Supabase, Firebase, sincronização, colaboração em tempo real, VTT multiplayer, fog of war, automação de mestre, combate de todos os adversários, marketplace, pagamento, integração obrigatória com APIs, suplementos externos e edição 2024.

## Automação e decisão da mesa

Automatizar operações cuja entrada e resultado são definidos. Contexto externo — cobertura, alvo visível, criatura já vista pelo druida, consentimento para opcionais — é informado pelo jogador, com procedência. Efeitos narrativos recebem fluxo assistido e resumo referenciado. Não inventar resposta automática quando a fonte não define dado necessário.

Classes, raças e magias devem ter capacidade declarada por efeito: `automated`, `assisted` ou `blocked`. `Assisted` é suporte deliberado a julgamento da mesa; não encobre fórmula faltante. `Blocked` aponta pendência e impede consumo parcial.

## Critério de corte

V1 só se encerra com sessão offline completa, invariantes de recursos, backup restaurável, navegação acessível e cobertura funcional das opções anunciadas. Existência de arquivos não é aceite. Planejamento temporal e responsáveis: [passos](passos/README.md) e [swarm](swarm/README.md).
