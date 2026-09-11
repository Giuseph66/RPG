# 07 — PWA e funcionamento offline

## Contrato de produto

Após o primeiro carregamento completo, os quatro destinos, dados, personagem, regras instaladas e imagens locais continuam utilizáveis sem conexão. Instalação é conveniência; o navegador também funciona. Primeira visita offline não pode obter arquivos ainda inexistentes no dispositivo.

Manifest futuro: `id`, `name`, `short_name`, `lang: pt-BR`, `start_url`, `scope`, `display: standalone`, `background_color`, `theme_color`, ícones comuns 192/512 e maskable com área segura. Cores derivam dos tokens aprovados. Ícone para tela inicial Apple é previsto. Splash depende de plataforma; não prometer arte/tempo idênticos. HTTPS ou ambiente local seguro é necessário. Instalação e promoção variam entre navegadores; oferecer instruções contextuais, não botão que presume suporte universal a prompt. [MDN: instalação](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Cache e prontidão

| Recurso | Estratégia proposta | Falha |
| --- | --- | --- |
| Shell, CSS, fontes próprias, ícones e chunks necessários | Precache com hash de build | Instalação não termina até conjunto consistente |
| Navegação dentro do escopo | Shell em cache; atualização controlada | Rota desconhecida abre estado próprio 404 |
| Rule pack fixado | Cache por ID/versão/hash, validado antes de ativar | Pack incompleto permanece anterior ou bloqueado |
| Imagens do jogador | IndexedDB por assetId | Ausência mostra placeholder recuperável |
| Texto/personagem/campanha | IndexedDB, nunca Cache Storage | Recuperação via backup |

Rotas carregam módulos de forma lazy na UI, mas a preparação offline baixa todos os chunks da versão necessária. Indicador distingue “preparando offline”, “pronto offline” e “preparação falhou”. Arquivos de cache não substituem exportação. Service worker intercepta somente rotas/assets conhecidos; não arquiva indiscriminadamente URLs ou downloads pessoais. [MDN: operações offline](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation).

## Atualização sem interromper sessão

1. Nova versão instala cache separado e verifica sua integridade.
2. Worker aguarda; UI mostra banner próprio “Atualização disponível”.
3. Jogador pode adiar indefinidamente durante a sessão.
4. Aplicar exige fila de gravações concluída e rascunhos tratados; conflito/falha impede reload.
5. Coordenar abas abertas: todas salvam e reconhecem atualização; aba antiga incompatível não pode escrever schema novo.
6. Ativar, recarregar uma vez, executar migração transacional e restaurar rota/personagem.
7. Remover caches obsoletos somente após versão nova utilizável; não apagar IndexedDB na limpeza de assets.

Sem `skipWaiting` incondicional na primeira detecção. Compatibilidade build/schema/pack é declarada pelo app. Falha de cache conserva versão anterior; falha de migração entra em recuperação, sem downgrade destrutivo automático.

## Armazenamento e ciclo de vida

Pedir persistência do armazenamento quando suportado pode reduzir despejo; concessão não é garantida. Quota, limpeza pelo usuário e políticas do navegador continuam relevantes. Não depender de tarefa de fundo ou evento de fechamento para concluir save; salvar recursos durante a interação. [Política WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).

Aceite futuro: Chrome Android, Safari/iOS, tablet e desktop em versões registradas; abrir, instalar quando possível, fechar, reabrir sem rede, consultar rota nunca visitada após preparação completa, atualizar com rascunho e recuperar erro. Offline não implica sincronização posterior. [Passo PWA](passos/15-pwa.md).
