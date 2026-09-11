# Árvore documental

Inventário completo dos documentos desta fase. Todos os caminhos abaixo são documentação; caminhos de implementação aparecem apenas dentro dos textos como planejamento futuro.

```text
docs/criacao
├── 00-START-HERE.md
├── 01-VISAO-DO-PRODUTO.md
├── 02-ESCOPO.md
├── 03-ARQUITETURA.md
├── 04-WIREFRAMES.md
├── 05-DESIGN-SYSTEM.md
├── 06-RESPONSIVIDADE.md
├── 07-PWA-OFFLINE.md
├── 08-PERSISTENCIA-LOCAL.md
├── 09-MODELO-DE-DADOS.md
├── 10-RULES-ENGINE.md
├── 11-DICE-ENGINE.md
├── 12-TESTES.md
├── 13-ACESSIBILIDADE.md
├── 14-CONTEUDO-E-FONTES.md
├── ARVORE.md
├── AUDITORIA.md
├── README.md
├── dados
│   ├── README.md
│   ├── estado-personagem.md
│   ├── ids.md
│   ├── migracoes.md
│   ├── persistencia.md
│   ├── regras-estaticas.md
│   └── schemas.md
├── decisoes
│   ├── ADR-0001-stack.md
│   ├── ADR-0002-local-first.md
│   ├── ADR-0003-navegacao.md
│   ├── ADR-0004-rules-engine.md
│   ├── ADR-0005-fonte-local.md
│   ├── PENDENCIAS.md
│   └── README.md
├── equipamento
│   ├── README.md
│   ├── armaduras.md
│   ├── armas.md
│   ├── ferramentas.md
│   ├── inventario.md
│   └── itens.md
├── interface
│   ├── README.md
│   ├── app-shell.md
│   ├── dice-overlay.md
│   ├── estados-visuais.md
│   ├── header.md
│   ├── mapa.md
│   ├── modais.md
│   ├── navegacao.md
│   ├── pagina-acoes.md
│   ├── pagina-compendio.md
│   ├── pagina-jornada.md
│   └── pagina-personagem.md
├── magia
│   ├── README.md
│   ├── classes
│   │   ├── README.md
│   │   ├── barbaro.md
│   │   ├── bardo.md
│   │   ├── bruxo.md
│   │   ├── clerigo.md
│   │   ├── druida.md
│   │   ├── feiticeiro.md
│   │   ├── guerreiro.md
│   │   ├── ladino.md
│   │   ├── mago.md
│   │   ├── monge.md
│   │   ├── paladino.md
│   │   └── patrulheiro.md
│   ├── componentes.md
│   ├── concentracao.md
│   ├── conjuracao.md
│   ├── exemplos.md
│   ├── rituais.md
│   ├── schema-magia.md
│   ├── slots.md
│   └── truques.md
├── passos
│   ├── 00-fundacao.md
│   ├── 01-design-system.md
│   ├── 02-app-shell.md
│   ├── 03-modelo-personagem.md
│   ├── 04-dice-engine.md
│   ├── 05-ficha.md
│   ├── 06-rules-engine.md
│   ├── 07-criacao-personagem.md
│   ├── 08-classes-racas.md
│   ├── 09-combate.md
│   ├── 10-magia.md
│   ├── 11-inventario.md
│   ├── 12-jornada.md
│   ├── 13-compendio.md
│   ├── 14-persistencia.md
│   ├── 15-pwa.md
│   ├── 16-responsividade.md
│   ├── 17-acessibilidade.md
│   ├── 18-testes.md
│   ├── 19-polimento.md
│   └── README.md
├── personagem
│   ├── README.md
│   ├── antecedentes
│   │   ├── README.md
│   │   ├── acolito.md
│   │   ├── artesao-de-guilda.md
│   │   ├── artista.md
│   │   ├── charlatao.md
│   │   ├── criminoso.md
│   │   ├── eremita.md
│   │   ├── forasteiro.md
│   │   ├── heroi-do-povo.md
│   │   ├── marinheiro.md
│   │   ├── nobre.md
│   │   ├── orfao.md
│   │   ├── sabio.md
│   │   └── soldado.md
│   ├── atributos.md
│   ├── classes
│   │   ├── README.md
│   │   ├── barbaro
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── bardo
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── bruxo
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── clerigo
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── divergencias-da-fonte.md
│   │   ├── druida
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── estilos-de-luta.md
│   │   ├── feiticeiro
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── guerreiro
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── ladino
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── mago
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── monge
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   ├── paladino
│   │   │   ├── README.md
│   │   │   ├── dados.md
│   │   │   ├── magia.md
│   │   │   ├── progressao.md
│   │   │   ├── recursos.md
│   │   │   ├── regras-especiais.md
│   │   │   ├── subclasses.md
│   │   │   └── testes.md
│   │   └── patrulheiro
│   │       ├── README.md
│   │       ├── dados.md
│   │       ├── magia.md
│   │       ├── progressao.md
│   │       ├── recursos.md
│   │       ├── regras-especiais.md
│   │       ├── subclasses.md
│   │       └── testes.md
│   ├── criacao-personagem.md
│   ├── ficha.md
│   ├── pericias.md
│   ├── progressao.md
│   ├── racas
│   │   ├── README.md
│   │   ├── anao.md
│   │   ├── draconato.md
│   │   ├── elfo.md
│   │   ├── gnomo.md
│   │   ├── halfling.md
│   │   ├── humano.md
│   │   ├── meio-elfo.md
│   │   ├── meio-orc.md
│   │   └── tiefling.md
│   ├── recursos.md
│   └── talentos
│       ├── README.md
│       └── catalogo.md
├── regras
│   ├── README.md
│   ├── aventura.md
│   ├── combate.md
│   ├── condicoes.md
│   ├── dano-e-cura.md
│   ├── descanso.md
│   ├── morte.md
│   ├── movimento.md
│   ├── multiclasses.md
│   └── testes.md
└── swarm
    ├── AGENT-PROTOCOL.md
    ├── CHECKPOINTS.md
    ├── DECISIONS.md
    ├── DEPENDENCIES.md
    ├── HANDOFF.md
    ├── OWNERSHIP.md
    ├── QA.md
    ├── README.md
    ├── RISKS.md
    └── TASKS.md
```
