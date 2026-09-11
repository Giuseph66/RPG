# IDs estáveis

IDs de entidade são identificadores canônicos definidos uma vez, em inglês kebab-case: `dwarf`, `druid`, `cure-wounds`, `longsword`. Características podem qualificar origem com ponto, como `druid.wild-shape`; cada segmento é estável. Não gerar ID em runtime a partir do nome traduzido. Referência pública: `{rulesetId, entityId}`; lookup tem categoria declarada pelo contrato, por exemplo `resolveSpell(ref)`. Para referências genéricas (favoritos/busca), acrescentar `entityType`. Colisão é proibida dentro da categoria e pack; tipos distinguem IDs homônimos entre categorias.

Pack inicial: `phb-ptbr-local-2017`. Nome técnico identifica o arquivo local com metadados de 2017, não nova edição oficial. Versão inicial proposta `1.0.0`; idioma `pt-BR`; edição “5e, compilação fornecida, base 2014 com divergências registradas”. [Fontes](../14-CONTEUDO-E-FONTES.md).

IDs de estado: UUID para personagem, campanha, item de inventário, nota, mapa, pin, aplicação de condição, fonte de conjuração e comando. Duas espadas idênticas podem ser instâncias diferentes. `entityId` de equipamento nunca é ID de instância.

Renomear label preserva ID. Remover entidade exige manter tombstone/alias e migração explícita; ID aposentado não é reciclado. Alias não altera semântica: uma regra revisada recebe nova versão do pack ou novo ID quando for opção distinta. Importação sem pack exato fica pendente; não escolher automaticamente versão “mais próxima”.

Critérios: reordenar catálogo não altera save; trocar idioma preserva referência; importar cópia remapeia UUIDs e todos os vínculos internos, preservando IDs estáticos.
