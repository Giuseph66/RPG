# Mapa local — escopo V1

Imagem importada pelo usuário, viewport com pan/zoom, marcadores, locais/notas e posição opcional do grupo. Fora: grid de combate, fog of war, alcance automático, iniciativa por tokens, multiplayer e servidor. Extensão futura não deve alterar coordenadas/vínculos do mapa atual.

## Dados e operações

Map pertence à campanha; Asset tem ID estável, MIME permitido, dimensões e conteúdo local no repositório de anexos. Marker tem ID, mapId, coordenadas normalizadas na imagem (0–1), título, tipo e referência opcional a local/nota. Transformação de viewport é estado de apresentação, nunca coordenada persistida do marcador. Trocar resolução da mesma imagem conserva localização relativa; substituir imagem distinta exige revisar marcadores.

Fluxo importar → validar tipo/tamanho/dimensões → gerar preview adequado → salvar anexo e metadados com consistência → ajustar viewport. Limites numéricos e formatos permitidos devem ser contratados antes de implementar; sugerir imagens raster, rejeitar conteúdo ativo. Se quota falha, rollback não deixa mapa apontando para anexo inexistente. Export/import da campanha precisa transportar todos anexos ou declarar arquivo incompleto antes de concluir, nunca omitir silenciosamente.

## Interação

Pan arrastando dentro da superfície, zoom por gesto e botões +/−, Ajustar e voltar ao marcador. Marcador criado por modo “Adicionar local” ou formulário de posição, não por toque acidental durante pan. Lista alternativa abre todos locais por teclado; seleção sincroniza mapa e painel. Exclusão de marcador pergunta se mantém local/nota; padrão conserva referência independente. Posição do grupo é informativa, editável e opcional.

## Performance e estados

Não decodificar todos mapas na entrada; carregar mapa ativo e preview. Revogar object URLs quando não necessários. Preservar viewport ao abrir detalhe, sem ler memória da imagem em cada movimento. Sem imagem oferece importar; imagem ausente mantém lista de notas; imagem excessiva propõe redução/rejeita de forma explícita, nunca trava navegador. Descrever mapa com texto alternativo editável. Testes futuros: round trip de coordenadas com zoom, resize, substituição de imagem, quota, export/import e navegação por teclado. Task MAP-001.
