# RPG Companion — plano de criação

**IMPLEMENTAÇÃO DO SOFTWARE NÃO INICIADA.** Documentação de produto, regras, arquitetura e execução por agentes. Fontes locais estudadas; ambiguidades registradas, sem substituição silenciosa por outra edição.

Começar em [00-START-HERE](00-START-HERE.md). Um arquivo para acompanhar tarefas, prontidão e bloqueios: [painel do swarm](swarm/README.md). [Árvore completa](ARVORE.md) e [auditoria](AUDITORIA.md).

## Produto e contratos

| Assunto | Documento |
| --- | --- |
| Objetivo e corte | [Visão](01-VISAO-DO-PRODUTO.md), [escopo](02-ESCOPO.md) |
| Fronteiras e stack | [Arquitetura](03-ARQUITETURA.md), [ADRs](decisoes/README.md) |
| Dados e regras | [Modelo](09-MODELO-DE-DADOS.md), [schemas](dados/schemas.md), [Rules Engine](10-RULES-ENGINE.md), [Dice Engine](11-DICE-ENGINE.md) |
| Persistência | [Local](08-PERSISTENCIA-LOCAL.md), [backup](dados/persistencia.md), [migrações](dados/migracoes.md) |
| PWA | [Offline, instalação e atualização](07-PWA-OFFLINE.md) |
| Visual | [Wireframes](04-WIREFRAMES.md), [design system](05-DESIGN-SYSTEM.md), [responsividade](06-RESPONSIVIDADE.md), [interface](interface/README.md) |
| Qualidade | [Testes futuros](12-TESTES.md), [acessibilidade](13-ACESSIBILIDADE.md), [fontes](14-CONTEUDO-E-FONTES.md) |

## Regras e personagem

| Módulo | Cobertura |
| --- | --- |
| [Personagem](personagem/README.md) | Wizard12 etapas, ficha3 páginas, atributos, perícias, XP/progressão e recursos |
| [Raças](personagem/racas/README.md) | 9 raças, sub-raças e variantes explicitadas |
| [Classes](personagem/classes/README.md) | 12 classes e41 subclasses da compilação; Druida como referência complexa |
| [Antecedentes](personagem/antecedentes/README.md) | Catálogo e variantes, escolhas e proveniência |
| [Talentos](personagem/talentos/README.md) | Catálogo da fonte; fase opcional posterior |
| [Regras](regras/README.md) | Testes, aventura, combate, dano/cura, morte, condições, descanso e multiclasse |
| [Magia](magia/README.md) | Contratos, conjuração, componentes, concentração, slots, rituais, truques e classes |
| [Equipamento](equipamento/README.md) | Armas, armaduras, ferramentas, itens e inventário |

## Roadmap e execução

Fundação/contratos → dados e repositórios → motores → ficha/criação → combate/magia/inventário → Jornada/Compêndio → integração/backup → PWA → QA/polimento. Dados pode avançar cedo após contrato; UI e catálogos ocupam frentes independentes.

[20 passos](passos/README.md) detalham objetivo, arquivos, regras, testes, aceite e handoff. [TASKS](swarm/TASKS.md) contém36 unidades com ownership e dependências. [Checkpoints](swarm/CHECKPOINTS.md) definem provas de integração, com alocação para4/6/8/12 agentes em [dependências](swarm/DEPENDENCIES.md).

## Bloqueios conhecidos

Não há implementação concluída. Regras ambíguas/ausentes estão em [PENDENCIAS](decisoes/PENDENCIAS.md): exemplos contraditórios, ritual/preparação, recuperação, pré-requisito circular, CDs e estatísticas faltantes. Fonte não foi corrigida por memória externa. Publicação de textos/assets é gate separado; não foi autorizada nem executada.
