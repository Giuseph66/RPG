# Interface — mapa de leitura

Estado: especificação; nenhuma interface implementada. [Wireframes](../04-WIREFRAMES.md), [tokens](../05-DESIGN-SYSTEM.md), [responsividade](../06-RESPONSIVIDADE.md) e [acessibilidade](../13-ACESSIBILIDADE.md) são contratos transversais.

| Documento | Responsabilidade |
| --- | --- |
| [App shell](app-shell.md) | Composição, regiões, estado e recuperação. |
| [Header](header.md) | Informação crítica fixa e compactação. |
| [Navegação](navegacao.md) | Quatro destinos e rotas utilitárias. |
| [Personagem](pagina-personagem.md) | Ficha rápida/expandida e correspondência com PDF. |
| [Ações](pagina-acoes.md) | Capacidades, custos e execução. |
| [Jornada](pagina-jornada.md) | Campanha local e narrativa. |
| [Compêndio](pagina-compendio.md) | Consulta, fontes e favoritos. |
| [Dados](dice-overlay.md) | Ferramenta global e resultado. |
| [Modais](modais.md) | Superfícies próprias, foco e confirmação. |
| [Mapa](mapa.md) | Imagem local, pan/zoom e marcadores. |
| [Estados](estados-visuais.md) | Erros, vazios, offline e estados de sessão. |

Princípio: UI lê definições/seletores e envia intenções aos serviços de aplicação; não importa IndexedDB, calcula CA, sorteia dados ou implementa gasto de slot. Contratos compartilhados: [modelo](../09-MODELO-DE-DADOS.md), [regras](../10-RULES-ENGINE.md), [dados](../11-DICE-ENGINE.md). Context serve composição e UI pequena; external store por agregado usa `useSyncExternalStore`; formulários são locais.
