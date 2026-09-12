# Matriz de aceite externo — dispositivos reais

**Status:** `EXTERNAL-PENDING`
**Escopo:** Chrome Android e Safari iOS em dispositivos físicos
**Data da criação:** 2026-09-12

Este roteiro complementa [QA-004](./QA-004-completude-2026-09-12.md),
[A11Y-001](../acessibilidade/A11Y-001.md) e a evidência limitada do
[emulador Android](../offline/ANDROID-EMULATOR-2026-09-12.md). Cada caso deve
ser executado nos dois ambientes, salvo quando indicado. O aceite só pode ser
marcado depois de anexar evidência observável e reproduzível.

## Regras de execução

- Usar uma implantação HTTPS ou um servidor local acessível pelo dispositivo,
  informado no campo de evidência. O roteiro não presume, inicia ou altera a
  porta `5173`.
- Registrar modelo, versão do Android/iOS, versão do Chrome/Safari, origem
  testada, data, resultado (`PASS`, `FAIL` ou `BLOCKED`) e anexos.
- Começar cada cenário com um perfil/banco de teste conhecido. Não usar dados
  reais de campanha.
- Para cenários offline, confirmar a ausência de rede no dispositivo e
  registrar também o estado exibido pela aplicação.
- Não considerar o AVD `Wear_OS_Square` como execução Android: o relatório
  existente comprova que ele não possui navegador Web utilizável.

## Identificação do ambiente

| Campo | Android Chrome | iOS Safari |
| --- | --- | --- |
| Modelo / identificador | `________________` | `________________` |
| Sistema e versão | `________________` | `________________` |
| Navegador e versão | `________________` | `________________` |
| Origem HTTPS testada | `________________` | `________________` |
| Data/hora | `________________` | `________________` |
| Executor | `________________` | `________________` |
| Evidência geral (vídeo/log) | `________________` | `________________` |

## Casos de aceite

### DM-01 — instalação e contexto seguro

**Passos:** abrir a origem HTTPS no navegador; confirmar que o manifesto e o
Service Worker são registrados; instalar pela opção do navegador (Adicionar à
tela de início/Instalar); abrir o ícone instalado e navegar por `/character`,
`/journey`, `/settings/data` e `/compendium`.

**Esperado:** a instalação é oferecida somente em contexto seguro; o ícone
abre a aplicação em modo standalone ou equivalente; as quatro rotas carregam
sem erro e a navegação preserva o estado local.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; captura do prompt/ícone instalado,
manifesto/worker e das quatro telas; URL/origem: `________________`.

### DM-02 — cold start e warm start offline

**Passos:** com a aplicação online, visitar as quatro rotas e recarregar cada
uma uma vez; fechar completamente o navegador; desligar rede; abrir a PWA
instalada (cold start) e depois recarregar a mesma rota (warm start).

**Esperado:** cold e warm start exibem o shell e o indicador de disponibilidade
offline; nenhuma tela fica branca; o conteúdo local previamente cacheado abre;
uma operação que exige rede informa a limitação sem perder dados locais.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; vídeo ou sequência de capturas com
rede desligada, rota, indicador offline e resultado de cold/warm: `________`.

### DM-03 — rota profunda offline

**Passos:** online, abrir uma rota profunda existente do compêndio (por
exemplo `/compendium/spells/fire-bolt`) e uma rota profunda de jornada se
disponível; fechar o navegador, desligar rede e abrir diretamente as mesmas
URLs; recarregar.

**Esperado:** a URL profunda é preservada e o fallback do shell renderiza a
tela correta offline; não ocorre redirecionamento para uma página inexistente.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; URLs, capturas antes/depois e
console/registro de rede quando disponível: `________________`.

### DM-04 — atualização do worker com diário sujo

**Passos:** criar ou abrir uma entrada em `/journey`; editar texto sem salvar e
confirmar o estado de rascunho pendente; disponibilizar uma nova versão do
worker na mesma origem; reabrir a aplicação até aparecer a atualização; tentar
aplicá-la com o rascunho nos estados `dirty` e, separadamente, `error`.

**Esperado:** a atualização é adiada enquanto há trabalho pendente; não há
`SKIP_WAITING` automático nem reload destrutivo; o texto do rascunho continua
visível e intacto; a interface explica que é preciso salvar ou descartar.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; versões dos workers, capturas do
estado dirty/error, console/mensagens e vídeo do reload impedido: `________`.

### DM-05 — liberar atualização por salvar e descartar

**Passos:** repetindo DM-04, salvar o rascunho e solicitar a atualização;
confirmar que a nova versão ativa; repetir com outro rascunho, escolher
descartar explicitamente e solicitar a atualização.

**Esperado:** salvar preserva a entrada após reload e libera a atualização;
descartar exige ação explícita, remove somente o rascunho escolhido e libera a
atualização; em ambos os fluxos a nova versão é identificável e a campanha não
é perdida.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; conteúdo antes/depois, versão ativa,
capturas do diálogo e resultado após fechar/reabrir: `________________`.

### DM-06 — chunks lazy carregados offline

**Passos:** online, abrir `/compendium` e o overlay de dados; abrir também as
rotas lazy disponíveis (seleção, diário, dados, dados/backup); aguardar cada
carregamento; desligar rede; fechar e reabrir a PWA e repetir as rotas e o
overlay.

**Esperado:** cada chunk requisitado online permanece disponível no cache; as
rotas e o overlay abrem offline, incluindo a mesa de dados quando já foi
carregada; nenhum chunk lazy cacheado causa tela de erro.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; lista de chunks/recursos observados,
capturas online/offline e resultado por rota: `________________`.

### DM-07 — viewport móvel, teclado e safe area

**Passos:** testar retrato e paisagem no menor e maior viewport do dispositivo;
abrir teclado virtual nos campos de busca, diário e formulário; abrir menu de
navegação, bottom sheet e botão flutuante; repetir em aparelho com notch,
Dynamic Island ou barra de gestos.

**Esperado:** não há corte, sobreposição ou overflow horizontal; o campo ativo
permanece visível acima do teclado; controles não ficam sob notch/barra de
gestos; fechar teclado e modal devolve o foco e a posição de rolagem de forma
utilizável.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; dimensões/orientação, modelo com
safe area, capturas retrato/paisagem/teclado/notch e observações: `________`.

### DM-08 — zoom 200% e 400% / tamanho de texto

**Passos:** no Android aplicar zoom de página/tamanho de texto equivalente a
200% e 400%; no iOS usar zoom de página e o maior tamanho de texto acessível
disponível; visitar as quatro rotas, abrir modal, formulário e diário.

**Esperado:** texto e controles continuam legíveis e operáveis; conteúdo não
fica escondido atrás de outro elemento; não há rolagem horizontal para ler
informação essencial; ações, mensagens de erro e foco continuam identificáveis.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; configuração exata, capturas em
200%/400% (ou equivalente documentado) e falhas encontradas: `____________`.

### DM-09 — TalkBack e VoiceOver

**Passos:** ativar TalkBack no Android e VoiceOver no iOS; percorrer landmarks,
skip link, navegação, seleção de personagem, campos do diário, backup e
overlay de dados; abrir/fechar modal e provocar erro de validação.

**Esperado:** cada controle tem nome e estado anunciáveis; a ordem de foco é
coerente; modal anuncia seu nome e limite; mudanças e erros são comunicados;
fechar retorna ao acionador; canvas 3D não impede o resultado textual nem a
rolagem acessível.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; gravação de áudio/vídeo ou lista de
anúncios, rota/controle testado, versão do leitor e defeitos: `____________`.

### DM-10 — duas abas e CAS entre abas

**Passos:** abrir duas abas/janelas da mesma origem com a mesma campanha;
editar e salvar o mesmo diário alternadamente; provocar conflito deliberado;
abrir uma atualização do worker nas duas abas enquanto uma mantém rascunho;
salvar/descartar em uma aba e observar a outra.

**Esperado:** o conflito é detectado e não sobrescreve silenciosamente dados;
o estado comunicado entre abas é apenas o de atualização/PWA; rascunhos e
campanha permanecem isolados conforme o contrato; nenhuma aba aplica worker
enquanto houver trabalho pendente e a decisão de salvar/descartar é observável.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; vídeo com duas abas, sequência
temporal dos eventos, mensagens de conflito/atualização e dados finais:
`________________`.

### DM-11 — persistência, armazenamento cheio e eviction

**Passos:** criar campanha, personagem e entrada de diário; fechar e reabrir
para confirmar persistência; no Android/iOS consultar o armazenamento do site
quando o sistema permitir; simular ou atingir quota baixa com dados de teste;
reabrir após pressão/limpeza automática e tentar backup/exportação antes e
depois.

**Esperado:** dados persistem após cold start; erro de quota ou eviction é
reportado de forma compreensível; a aplicação não confirma uma gravação que
falhou; backup exportado antes da pressão continua importável; após eviction,
o estado vazio/recuperável é explícito e não é apresentado como dado salvo.

**Evidência:** `PASS/FAIL/BLOCKED: ____`; método de pressão/eviction, quota
observada, logs, arquivo de backup e resultado de restauração: `____________`.

## Resultado da rodada

| Ambiente | DM-01 | DM-02 | DM-03 | DM-04 | DM-05 | DM-06 | DM-07 | DM-08 | DM-09 | DM-10 | DM-11 | Aceite |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Android Chrome |  |  |  |  |  |  |  |  |  |  |  |  |
| iOS Safari |  |  |  |  |  |  |  |  |  |  |  |  |

**Decisão da rodada:** `EXTERNAL-PENDING / ACCEPT / REJECT`
**Responsável:** `________________`
**Data:** `________________`
**Links para evidências:** `________________________________________________`

Um caso só é `PASS` quando o resultado esperado foi observado no ambiente
indicado. `BLOCKED` exige registrar a capacidade ausente (por exemplo,
dispositivo, navegador ou permissão); não deve ser convertido em `PASS` por
evidência de Chromium, emulador Wear OS ou teste unitário.
