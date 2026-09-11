# Superfícies próprias e feedback

Proibidos: `window.alert()`, `window.confirm()`, `window.prompt()` e aliases `alert()`, `confirm()`, `prompt()`. Mensagens, confirmação e coleta de valores usam design system. Controles HTML semânticos estilizados e file picker para importação continuam permitidos; não confundir API funcional do navegador com diálogo de feedback proibido.

| Componente | Uso | Fechamento/foco |
| --- | --- | --- |
| AppModal | Edição/revisão focal. | Modal único, fundo inerte, título e retorno ao acionador. |
| ConfirmModal | Reset, exclusão, importação substitutiva e perda de draft. | Nomear alvo/efeito; cancelamento inicial seguro; botão destrutivo explícito. |
| BottomSheet | Dados/ajuste curto no mobile. | Mesmo contrato modal; arrastar não é único modo de fechar. |
| Popover | Explicação curta ou seletor contextual. | Não modal por padrão; fecha por Escape/fora, sem perder dado confirmado. |
| Drawer | Detalhe lateral ou filtros extensos. | Declarar modal ou não modal; sem comportamento ambíguo. |
| ContextMenu | Operações secundárias. | Botão visível alternativo a clique direito/toque longo. |
| InlineStatus | Falha de campo, autosave e bloqueio. | Persistente quando requer ação; não rouba foco. |

Confirmação destrutiva informa nome do personagem/campanha, alcance e efeito local; exportar disponível quando pertinente. Reset seletivo e completo são distintos. Cancelar preserva estado; confirmar é comando com revisão e operação de aplicação, não `db.clear()` em componente. Se ocorrer conflito durante revisão, invalidar confirmação e pedir nova leitura.

Não empilhar modais independentes. Uma superfície pode trocar etapa/conteúdo ou abrir popover subordinado. Não fechar sheet com erro por timeout. Toast não é único lugar de informação essencial. Loading não destrói formulário. Debounce visual não é proteção contra comando duplicado; aplicação valida identidade. Ver [acessibilidade](../13-ACESSIBILIDADE.md) para aria/foco e [persistência](../08-PERSISTENCIA-LOCAL.md) para recuperação.
