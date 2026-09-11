# Jornada — campanha local

## Modelo de interação

Uma campanha reúne personagens vinculados por ID, mapas, locais, notas, diário, NPCs conhecidos, missões/objetivos e registros de sessão. Identidade compartilhada pertence ao modelo de campanha; textos livres não são definições do ruleset. Tudo reside no dispositivo; não há presença online, chat, conta ou sincronização.

Subáreas Mapa, Diário, Missões e Pessoas/Locais ficam dentro de Jornada, nunca novos destinos principais. Mobile: seletor de subárea e lista/detalhe; desktop: lista e editor/painel contextual. Cabeçalho informa campanha ativa. Trocar campanha trata draft pendente antes de desmontar editor.

## Fluxos

Criar campanha pede nome, descrição opcional e vínculo com personagem. Novo registro de sessão contém título, data editável, resumo, referências de locais/NPCs e notas; autosave com indicador após commit. Missão possui título, descrição, objetivos ordenados e estado local; conclusão não concede XP automaticamente. NPC guarda nome/descrição/relacionamento/notas, sem ficha de combate inventada. Local pode existir sem marcador; excluir marcador não exclui nota/local silenciosamente.

Editor V1: texto simples ou subconjunto de Markdown definido no contrato, com renderização segura e sem HTML executável. Busca interna por título/tags/texto, dados carregados sob demanda. Imagens de mapa são anexos locais com referência por ID; exportação de campanha deve incluir anexos conforme envelope de backup, com limites explicitados. Ver [Mapa](mapa.md).

## Estados e aceite

Sem campanha: Criar/Importar; campanha vazia: criar primeiro registro/mapa, mantendo demais ações. Anexo ausente mostra placeholder com opções de substituir e manter notas. Falha autosave não apaga draft e oferece exportação/retentativa. Exclusão de campanha usa ConfirmModal nomeando conteúdo e opção de backup. Testes futuros cobrem reload offline, vínculos ausentes, edição simultânea em abas, export/import com anexos e teclado no editor. Tasks: JOUR-001, MAP-001, DATA-006.
