# Evidência de QA da interface

Sessão local sintética em `http://127.0.0.1:5174/`, Chrome via CUA, sem uso de conta remota.

- Viewport 360: wizard abriu; preencher `QA Mobile` e `QA Sintético` manteve `Etapa 1 de 9: Identidade` sem clicar em Continuar.
- Viewport 390: fluxo novo alcançou Bardo → Artista → equipamento → Magias. A tela publicou os grupos `Truques · Bardo` (2 escolhas) e `Magias · Bardo` (4 escolhas), mas o catálogo local exibiu 0 truques e só 3 opções de nível 1 (`Curar Ferimentos`, `Detectar Magia`, `Palavra Curativa`). A conclusão ponta a ponta fica bloqueada pela publicação incompleta das magias do rule pack, fora deste owner.
- Viewport 390: `document.documentElement.scrollWidth` não excedeu a largura do documento; campos da ficha passaram a altura computada de 44 px. Quantidades do Inventário continuam em 36 px por regra de `src/features/inventory/inventory.module.css`; esse path requer reserva antes de edição.
- Desktop: ficha sintética `Validação DM` abriu com atributos, perícias, equipamento, condições, salvamentos contra morte e inventário sem perda de layout.
- Compêndio: busca `cura de ferimentos` retornou 29 correspondências, incluindo `Curar Ferimentos` com lista Bardo.
- Backup: o painel local abriu e preservou a campanha sintética. Upload do fixture `Testes/evidencias/backup-campanha-qa.json` não pôde ser concluído porque a extensão Chrome exige habilitar acesso a `file://`; não foi alterada configuração do navegador. A exportação não produziu evento de download observável nesta sessão.
- Estado final: viewport resetado para o padrão do navegador após as capturas.

As capturas 360/390, da tela de magias Bardo e da ficha desktop foram emitidas diretamente pela sessão CUA durante o QA; o arquivo mantém os sinais DOM e os bloqueios reproduzíveis.

