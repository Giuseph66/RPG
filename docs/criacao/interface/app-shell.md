# App shell

## Regiões e composição

Futuro AppShell contém link pular, CharacterHeader, PrimaryNavigation, main/router outlet e OverlayHost único. Dependências de repositórios entram pela composição; React não conhece IndexedDB. O shell recebe seletores de personagem ativo e capacidades globais. Store persistente por agregado usa `useSyncExternalStore`; Context injeta aplicação e guarda somente estado pequeno de UI. Sem server state nesta versão.

Boot: carregar preferências pequenas → abrir repositórios/migrações → resolver personagem/campanha ativos → carregar pack compatível → montar snapshot derivado → liberar comandos. Shell continua mostrando progresso e recuperação quando banco falhar. ID ativo inexistente vai para seletor/criação, sem ficha fictícia. Hidratação não grava valores default por cima dos existentes. Regras ausentes deixam leitura/backup disponível, mas bloqueiam comandos afetados.

## Layout e segurança de interação

Header e navegação reservam espaço; main é região principal de scroll. OverlayHost serve FAB, header e rolagens contextuais. Só um modal ativo; popovers subordinados pertencem ao modal. Trocar personagem fecha draft contextual ou pede descarte via diálogo próprio antes de abrir novo contexto. Comandos incluem ID/revisão do agregado; resultado tardio nunca aplica a outra ficha.

Instalação/atualização, preferências e exportação acessíveis por menu utilitário. Aviso de armazenamento local aparece no onboarding e backup, sem faixa permanente consumindo espaço. Offline é capacidade normal; erro de storage é estado diferente.

## Aceite futuro

Shell abre em cada rota principal e preserva seleção ao mudar breakpoint; dados abrem de qualquer uma. Sem personagem permite criar/importar e rolagem avulsa. Falha de migração oferece recuperação; não inicia comandos mutáveis. Foco nunca fica sob regiões fixas. Integração real requer repositório, store e engine reais; mocks só provam renderização isolada. Tasks: UI-002 e CORE-002.
