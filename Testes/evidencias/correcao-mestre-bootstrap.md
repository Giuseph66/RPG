# Evidência mestre — bootstrap e estado remoto

Data da captura: 2026-10-05.

A aba `http://localhost:5173/` carregou a mesa e a rota Conta sem reproduzir `getFirebaseConfigDiagnostic is not defined`. O cabeçalho exibiu `erro de sincronização` para uma conta antiga porque a hidratação encontrou coleção legada recusada pelas rules; o runtime não permaneceu silenciosamente em “sincronizado”. A campanha QA nova confirmou escrita remota válida.

O erro de export `DiceHistoryProps` do gate atual pertence à alteração concorrente de `src/app/feature-registry.ts`/`src/features/dice`, fora da reserva desta correção.
