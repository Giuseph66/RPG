# RPG Companion — guia da entrega aceita

Esta é uma aplicação local para acompanhar personagens e campanhas de RPG. A
entrega atual não tem backend, contas, sincronização ou colaboração entre
dispositivos. O estado durável fica no navegador em que foi criado.

## Executar localmente

O `package.json` declara Node.js `>=24.12.0`. A rodada final foi executada com
Node.js `v24.12.0` e npm `11.6.2`; essas são as versões do ambiente validado.

```text
npm install
npm run dev
```

Abra a URL mostrada pelo Vite. Para gerar e servir o artefato de produção:

```text
npm run build
npx vite preview --host 127.0.0.1 --port 5183 --strictPort
```

O projeto não possui script `npm run preview`; o segundo comando é a forma
registrada de verificar o build. A primeira abertura precisa obter o shell e
os dados empacotados. Depois que o Service Worker preparar o cache, o shell e o
rule pack local podem continuar disponíveis sem rede.

## Usar a aplicação

As rotas primárias são:

- `/character`: ficha do personagem ativo; `/character/create` abre o wizard de
  criação.
- `/actions`: capacidades e custos disponíveis para o personagem ativo. O
  caller fornece decisões como alvo e entradas exigidas; opções sem cobertura
  ficam bloqueadas ou pendentes.
- `/journey`: criação/seleção de campanhas locais. A campanha persistida é
  restaurada no novo runtime; sem preferência `activeCampaignId`, a seleção de
  retomada usa `updatedAt` mais recente, depois `createdAt` mais recente e ID
  ascendente.
- `/compendium`: busca e detalhe do catálogo local, com fonte e metadados.
- `/settings`: tema, redução de movimento, idioma e retenção do histórico de
  dados.

O cabeçalho abre a rolagem de dados. A rolagem usa o RNG de plataforma e o
  resultado é gravado no histórico local quando o armazenamento está disponível.
O catálogo publicado pelo runtime contém 1.383 entradas no build validado:
1.319 entradas anteriores, mais 64 verbetes estáticos de Regras, Combate,
Atributos, Perícias, Descanso, Movimentação e Aventura. Armas (37) e
Armaduras (13) são subconjuntos dos 220 equipamentos existentes, portanto não
duplicam esse total. As nove categorias antes incompletas agora têm conteúdo
local consultável; Aventura permanece limitada à cobertura mecânica parcial do
Livro do Jogador, sem campanhas, PNJs, mapas ou procedimentos do Mestre.
Algumas decisões de regras e a cobertura de magias continuam parciais e podem
exigir entrada ou decisão da mesa.

## Persistência e recuperação

IndexedDB guarda personagens, campanhas, diário, mapas, anexos, histórico de
rolagens, favoritos, rascunhos, recibos de comandos, metadados e registros de
recuperação. Preferências pequenas ficam em `localStorage`. Cache Storage é
reservado ao shell/corpus PWA e não substitui backup nem guarda o estado dos
agregados.

As operações de estado confirmam o commit antes de apresentar `clean`; falha
de gravação preserva rascunho e conflito CAS permanece explícito. Reset exige
confirmação explícita e não é uma limpeza automática para liberar quota.

O formato de backup é JSON versionado. As APIs disponíveis são
`createBackupService`, `DefaultBackupService` e `DataManagementService`, com
exportação/importação de personagem ou campanha, prévia de conflitos,
migrações e recuperação de registros corrompidos. A confirmação de importação e
o modo `copy`/`replace` são decisões do caller.

Backup e recuperação ainda não estão montados em uma rota da aplicação. Para o
uso atual, a tela `DataManagementPanel` existe como componente e os serviços
podem ser compostos por um host; não há fluxo de exportação/importação na UI
aceita até essa superfície ser conectada. Também não existe cópia automática
fora deste navegador.

## Instalação e uso offline

O manifesto está em `/manifest.webmanifest`, com ícones locais de 192 e 512 px.
O worker `/pwa-worker.js` usa caches versionados `rpg-companion-pwa-shell-2026.09.11`
e `rpg-companion-pwa-corpus-2026.09.11`. O bootstrap registra o worker somente
depois do runtime pronto, ignora falha de registro e não força reload.

Instalação depende do navegador e de contexto seguro (HTTPS ou localhost).
Após uma abertura online completa e a preparação dos caches, o build validado
reabriu `/compendium` e `/compendium/spells/fire-bolt` com a rede desligada no
Chromium. A primeira visita offline, uma instalação em Android/iOS e a
atualização durante um rascunho não foram provadas nesta entrega.
