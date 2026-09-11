# ADR-0001 — Stack e estado

Estado: adotado no plano; implementação não iniciada.

## Contexto

Produto exige React, TypeScript, web/PWA e offline sem backend. Repositório inicial contém somente PDFs; não há arquitetura de aplicativo a preservar ou dependências instaladas.

## Decisão

Planejar React+TypeScript, Vite para desenvolvimento/bundle e React Router para rotas. Estado persistente observado por agregado via external store e `useSyncExternalStore`; Context para composição/UI, estado local para formulários. Nenhum Zustand/Redux obrigatório nesta fase. Fixar versões compatíveis apenas na tarefa de fundação; registrar dependências e autorização vigente antes de instalação.

## Alternativas e consequência

Context único para ficha inteira provoca acoplamento de render e mistura transitório/durável. Biblioteca de estado pode reduzir código depois, mas ainda não existe necessidade demonstrada. SSR/framework com servidor não é necessário para sessão local. Escolha não impede backend futuro por repositórios. Contratos de snapshot e assinatura seguem [React](https://react.dev/reference/react/useSyncExternalStore).

Aceite futuro: domínio sem React, UI sem IndexedDB, store sem regra duplicada, selectors limitam atualização e save não depende de render.
