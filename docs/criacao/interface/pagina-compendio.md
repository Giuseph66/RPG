# Compêndio — consulta local

## Informação e categorias

Busca global dentro do compêndio aceita nome, categoria e tags; normaliza acentos/caixa sem alterar IDs. Categorias: regras, combate, condições, atributos, perícias, raças/sub-raças, classes/subclasses, antecedentes, equipamentos, armas, armaduras, talentos, magia, truques, magias, descanso, movimentação e aventura. Tipo/subtipo são metadados, não rotas duplicadas para a mesma entidade. Favorites são preferência persistente do usuário referenciando ruleset + tipo + ID.

Carregar índice leve na abertura; carregar conteúdo de categoria/detalhe sob demanda, com dados disponíveis offline após instalação definida em PWA. Consulta não pode depender de API. Busca retorna título, tipo, resumo mecânico curto, tags e referência de fonte; priorizar correspondência exata de nome, depois aliases/tags, de forma determinística. Texto narrativo integral do livro não é requisito de indexação nem autorização de redistribuição.

## Detalhe e vínculo com ações

Detalhe inclui ID estável para diagnóstico, título, versão/pack, referência de capítulo/página, mecânica parafraseada e links de relações. ID técnico pode ficar em seção expandida; usuário comum vê fonte legível. Botão contextual “Usar em Ações” só aparece quando personagem tem capacidade validada. Consultar magia não adiciona magia conhecida automaticamente. Favorito inexistente após troca de pack fica indicado, sem migração por nome.

## Layout e estados

Mobile: busca no topo do conteúdo, filtros em expansão e resultados em lista; detalhe navegável com voltar preservando busca e posição. Desktop: filtros laterais e lista/detalhe quando espaço permite. Vazio distingue “nenhum resultado”, “categoria ainda não disponível”, “pack ausente” e “conteúdo bloqueado por pendência”. Erro de conteúdo não impede abrir ficha/backup. Leitor de tela recebe contagem após busca estabilizar, sem anúncio por tecla. Task COMP-001 depende dos catálogos reais, não apenas de mocks.
