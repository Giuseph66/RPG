# Evidência Android emulador — 2026-09-12

## Resultado

**LIMITADO: ambiente sem navegador Web.** O AVD `Wear_OS_Square` iniciou e
ficou disponível via ADB como `emulator-5554`, mas sua imagem Wear OS não
possui Chrome, Android Browser, Firefox, Opera ou WebView utilizável para
abrir a aplicação. Por isso, as rotas e o overlay não foram executados neste
emulador e não há evidência de PWA Android neste relatório.

## Ambiente observado

O AVD foi iniciado de forma headless com:

```text
emulator -avd Wear_OS_Square -no-window -no-audio -no-boot-anim \
  -gpu swiftshader_indirect -no-snapshot
```

Após o boot, o ADB reportou:

```text
emulator-5554  device  product:sdk_gwear_x86_64 model:sdk_gwear_x86_64
sys.boot_completed=1
ro.build.version.release=16
Physical size: 360x360
Physical density: 320
```

## Verificação de navegador

A busca de pacotes não encontrou nenhum pacote correspondente a Chrome,
Browser, Firefox, Opera ou WebView. A resolução de uma URL HTTP encontrou
somente o redirecionador próprio do Wear OS:

```text
1 activities found:
com.google.android.wearable.app/
  com.google.android.clockwork.wcs.remoteintent.UriRedirectActivity
```

Ao tentar abrir a URL, o Android recusou o redirecionamento porque a chamada
ADB não possui a permissão privada exigida:

```text
Permission Denial: ... UriRedirectActivity ...
requires com.google.android.wearable.permission.URI_REDIRECT_TO_REMOTE
```

Esse componente não é um navegador e não oferece uma superfície para testar
`/character`, `/journey`, `/settings/data`, `/compendium`, o overlay de dados,
cache offline ou a atualização do Service Worker.

## Escopo não executado

Não foi instalado software adicional, não foi servido o projeto em uma porta
auxiliar e nenhum resultado de navegador foi inventado. A porta 5173 não foi
tocada. Como não há navegador capaz de carregar a aplicação, ficaram sem
execução no AVD:

- montagem e navegação das quatro rotas;
- abertura e fechamento do overlay;
- recarga offline de `/compendium` ou de um chunk lazy;
- instalação, atualização e armazenamento do PWA.

## Limites

Este é um resultado de **emulador Android Wear OS**, não de um dispositivo
Android físico. Ele não substitui a validação em Chrome Android físico.
Continuam pendentes, por exigirem os ambientes correspondentes, iOS/Safari,
leitor de tela nativo, zoom físico de 200/400%, CAS entre abas reais,
suspensão pelo sistema operacional e atualização do Service Worker durante
uma sessão real com rascunho.

## Encerramento

O emulador foi encerrado após a coleta com `adb emu kill`; nenhum servidor
auxiliar foi iniciado. A porta 5173 permaneceu fora do escopo.
