# Handoff: Resultado depende da física real do dado 3D

## Objetivo
Quando o usuário clica "Rolar dados", o dado cai com física real, para, e SÓ ENTÃO o número aparece — lido da face que ficou para cima. Nada de número fictício sorteado antes.

## O que já foi feito (NÃO REFAZER)

### `src/domain/dice/random-source.ts`
Adicionado após a constante `RNG_VERSION`:
```ts
export const RNG_VERSION_PHYSICAL = "physical-v1";
```

### `src/domain/dice/roll.ts`
- Importa `RNG_VERSION_PHYSICAL` de `./random-source`
- Exporta a nova função `buildRollFromValues` (ver abaixo)

A função já está no arquivo, no final, antes do bloco de reexportações:
```ts
export function buildRollFromValues(
  expr: DiceExpression,
  physicalValues: readonly number[],
  meta: RollMeta,
): Result<DiceRoll, AppError>
```
Monta um `DiceRoll` a partir de valores físicos sem chamar RNG. Valida expressão, quantidade de valores, range, aplica vantagem/desvantagem, calcula total. Grava `rngVersion: "physical-v1"`.

### `src/domain/dice/roll.test.ts`
Adicionados 18 testes de `buildRollFromValues` no final do arquivo.

### `src/features/dice/controller.ts`
Já tem o import adicionado no topo:
```ts
import { buildRollFromValues } from "@domain/dice/roll";
```
**MAS O RESTO DO CONTROLLER AINDA NÃO FOI ALTERADO.**

---

## O que FALTA implementar

### PASSO 4 — `src/features/dice/controller.ts`

#### 4a. Adicionar `onPhysicsResult` na interface `DiceOverlayController`
```ts
export interface DiceOverlayController {
  // ... existentes ...
  /**
   * Chamado pelo PhysicalDiceStage quando todos os dados pararam.
   * `values` são os resultados lidos de lerDado() — um por dado.
   * Monta o DiceRoll com buildRollFromValues, persiste e publica.
   */
  onPhysicsResult(values: number[]): Promise<void>;
}
```

#### 4b. Alterar `DiceOverlayState` — adicionar campo `awaitingPhysics`
```ts
export interface DiceOverlayState {
  // ... existentes ...
  /**
   * true = o controller está aguardando os dados físicos pararem.
   * O PhysicalDiceStage monitora este flag e, quando vira true,
   * rola os dados SEM results (física livre) e chama onPhysicsResult.
   */
  readonly awaitingPhysics: boolean;
  /** Expressão e meta guardadas enquanto aguarda física. */
  readonly pendingExpression?: DiceExpression;
  readonly pendingMeta?: { id: string; timestamp: string; purpose: DicePurpose; characterId?: string };
}
```
Inicializar `awaitingPhysics: false` no estado inicial.

#### 4c. Alterar `executeRoll` — separar em dois modos

**Quando há física disponível** (padrão — o PhysicalDiceStage vai chamar onPhysicsResult):
```ts
async function executeRoll(expressionOverride?, metadataSource?) {
  const expressionResult = expressionOverride ? ok(expressionOverride) : expressionForRoll();
  if (!expressionResult.ok) {
    publish({ status: "error", validationError: expressionResult.error.message });
    return expressionResult;
  }
  const meta = {
    id: idGenerator.uuid(),
    timestamp: clock.now(),
    purpose: metadataSource?.purpose ?? state.purpose,
    characterId: metadataSource?.characterId ?? state.characterId,
  };
  // Publica "rolling" + awaitingPhysics=true, sem chamar RNG
  publish({
    status: "rolling",
    awaitingPhysics: true,
    pendingExpression: expressionResult.value,
    pendingMeta: meta,
    validationError: undefined,
    persistenceError: undefined,
  });
  // Retorna uma Promise que resolve quando onPhysicsResult for chamado
  return new Promise<Result<DiceRoll, AppError>>((resolve) => {
    pendingResolve = resolve;
  });
}
```

**Fallback sem física** (para reroll e casos sem WebGL — ver seção de fallback abaixo).

#### 4d. Implementar `onPhysicsResult`
```ts
async function onPhysicsResult(values: number[]): Promise<void> {
  const expr = state.pendingExpression;
  const meta = state.pendingMeta;
  if (!expr || !meta) return;

  const result = buildRollFromValues(expr, values, meta as RollMeta);
  if (!result.ok) {
    publish({ status: "error", awaitingPhysics: false, validationError: result.error.message });
    pendingResolve?.(result);
    pendingResolve = null;
    return;
  }
  const saveResult = await persist(result.value);
  if (!saveResult.ok) {
    publish({
      status: "error",
      awaitingPhysics: false,
      result: result.value,
      persistenceError: saveResult.error,
      announcement: announcementFor(result.value),
    });
  } else {
    publish({
      status: "idle",
      awaitingPhysics: false,
      result: result.value,
      history: [result.value, ...state.history.filter((i) => i.id !== result.value.id)],
      announcement: announcementFor(result.value),
    });
  }
  pendingResolve?.(ok(result.value));
  pendingResolve = null;
}
```

Declarar `let pendingResolve: ((r: Result<DiceRoll, AppError>) => void) | null = null;` dentro de `createDiceOverlayController`.

#### 4e. Fallback para `reroll` (sem 3D — usa RNG normal)
O `reroll` deve usar `rollExpression` diretamente, pois não há animação ligada a ele:
```ts
reroll(roll = state.result) {
  if (!roll) return Promise.resolve(err(...));
  // reroll não passa pela física — usa RNG diretamente
  return executeRollWithRng(roll.expression, roll);
},
```
Criar `executeRollWithRng` que é o `executeRoll` original (com `rollExpression`), sem o modo awaitingPhysics.

---

### PASSO 5 — `src/features/dice3d/PhysicalDiceStage.tsx`

#### 5a. Adicionar prop `onResult`
```ts
export interface PhysicalDiceStageProps {
  // ... existentes ...
  /**
   * Callback chamado quando todos os dados pararam.
   * Recebe os valores lidos de lerDado() — um número por dado.
   */
  onResult?: (values: number[]) => void;
}
```

#### 5b. Monitorar `awaitingPhysics` em vez de `roll`
O stage hoje reage quando `roll.id` muda. No novo modo, ele deve reagir quando `awaitingPhysics` vira `true` — **sem** `results` na chamada de `mesa.roll()`.

Alterar o `useEffect` que chama `mesa.roll(...)`:
```ts
// ANTES (linha atual):
await mesa.roll(undefined, { results: valores });

// DEPOIS — sem results, física livre:
const outcomes = await mesa.roll(undefined, {});
// outcomes é RollOutcome[] — cada um tem .value lido da física
if (!cancelado && onResult) {
  onResult(outcomes.map((o) => o.value));
}
```

**Como o stage sabe quando rolar?**

Opção A (recomendada): o `PhysicalDiceStage` recebe uma prop `awaitingPhysics: boolean` e `expression: DiceExpression | undefined`. Quando `awaitingPhysics` vira `true`, ele monta a mesa e rola. Quando `onResult` é chamado, o controller vira `awaitingPhysics` para `false`.

Opção B: continuar monitorando `roll`, mas ignorar `roll.rawDice` e não passar `results`. Menos limpo mas menor diff.

**Recomendo a Opção B para menor diff:**
- Remover `{ results: valores }` da chamada de `mesa.roll()`
- Após `mesa.roll()` resolver, chamar `onResult(outcomes.map(o => o.value))`
- O `roll` continua sendo a trigger (quando `roll.id` muda, rola de novo)
- MAS: o `roll` chega com `rawDice` vazio/placeholder porque o controller ainda não tem o resultado — então o stage não deve ler `roll.rawDice` para montar a mesa

Para a Opção B funcionar, o controller deve publicar um `DiceRoll` "placeholder" com `id` único mas `rawDice: []` quando entra em `awaitingPhysics`. O stage vê o novo `id`, rola a física, chama `onResult`, e o controller publica o `DiceRoll` real.

**Opção A é mais limpa. Detalhando:**

Props adicionais:
```ts
awaitingPhysics?: boolean;
physicsExpression?: DiceExpression;
```

No `useEffect` que reage a rolagens:
```ts
useEffect(() => {
  const mesa = mesaRef.current;
  if (!mesa || !awaitingPhysics || !physicsExpression || reducedMotion) return;

  const id = ID_POR_FACES[physicsExpression.faces];
  const quantity = physicsExpression.mode === "normal"
    ? physicsExpression.quantity
    : 2; // vantagem/desvantagem = 2 dados físicos
  if (!id || quantity === 0) return;

  let cancelado = false;
  void (async () => {
    mesa.clear();
    try {
      for (let i = 0; i < quantity; i++) {
        if (cancelado) return;
        await mesa.add(id, appearance);
      }
    } catch { return; }
    if (cancelado) return;
    // SEM results — física decide
    const outcomes = await mesa.roll(undefined, {});
    if (!cancelado && onResult) {
      onResult(outcomes.map((o) => o.value));
    }
  })();

  return () => { cancelado = true; };
}, [awaitingPhysics, physicsExpression, appearance, mobile, reducedMotion, onResult]);
```

**Fallback quando reducedMotion=true ou WebGL falhou:**
O `onResult` nunca é chamado. O controller precisa detectar isso.
Solução: no controller, se `awaitingPhysics` ficar `true` por mais de X ms sem `onPhysicsResult` ser chamado, fazer fallback com `rollExpression`. Ou melhor: o `DiceOverlay` passa `reducedMotion` para o controller via um flag antes de rolar. Se `reducedMotion`, o controller usa `executeRollWithRng` diretamente.

---

### PASSO 6 — `src/features/dice/DiceOverlay.tsx`

#### 6a. Passar props novas para `PhysicalDiceStage`
```tsx
<PhysicalDiceStage
  roll={state.result}
  active={state.open}
  variant="inline"
  // NOVO:
  awaitingPhysics={state.awaitingPhysics}
  physicsExpression={state.pendingExpression}
  onResult={(values) => void controller.onPhysicsResult(values)}
/>
```

#### 6b. Fallback reducedMotion
O botão de rolar já detecta `reducedMotion`. Quando `reducedMotion=true`, chamar uma versão do roll que usa RNG direto. O controller pode expor `rollWithRng()` para esse caso, ou detectar internamente. Mais simples: o `DiceOverlay` passa `usePhysics={!reducedMotion}` para o controller.

---

## Resumo do fluxo final

```
Usuário clica "Rolar"
  → controller.roll()
  → publica status="rolling", awaitingPhysics=true, pendingExpression=expr

PhysicalDiceStage vê awaitingPhysics=true
  → mesa.clear()
  → mesa.add(id) × quantity
  → outcomes = await mesa.roll(undefined, {})   ← SEM results, física livre
  → dado cai, quica, para
  → onResult(outcomes.map(o => o.value))        ← chama callback

controller.onPhysicsResult(values)
  → buildRollFromValues(pendingExpression, values, pendingMeta)
  → persist(roll)
  → publica status="idle", result=roll, awaitingPhysics=false

DiceResult renderiza o número
  → usuário vê o resultado DEPOIS do dado parar ✓
```

---

## Arquivos envolvidos

| Arquivo | Status |
|---------|--------|
| `src/domain/dice/random-source.ts` | ✅ Feito |
| `src/domain/dice/roll.ts` | ✅ Feito |
| `src/domain/dice/roll.test.ts` | ✅ Feito |
| `src/features/dice/controller.ts` | ✅ Feito |
| `src/features/dice3d/PhysicalDiceStage.tsx` | ✅ Feito |
| `src/features/dice/DiceOverlay.tsx` | ✅ Feito |
| `src/features/dice/controller.test.ts` | ✅ 8 testes do fluxo físico |

## Notas importantes

- **Não alterar** `rollSimulation.ts`, `DiceTable.ts`, `readout.ts`, `orientationFor.ts` — a física já funciona corretamente sem tremor
- `mesa.roll(undefined, {})` **sem** `results` já funciona hoje — a física rola livre e retorna `RollOutcome[]` com `.value` lido de `lerDado()`
- O `rngVersion: "physical-v1"` já está implementado em `buildRollFromValues`
- Reroll por regra (`rerollDice` em `reroll.ts`) não muda — continua usando RNG
- "Rolar novamente" da UI deve usar o novo fluxo físico (awaitingPhysics) quando 3D disponível


---

# ✅ IMPLEMENTADO — desvios do plano original

Seguiu-se a **Opção A** (`awaitingPhysics` + `physicsExpression`), como o próprio
handoff recomendava. Quatro pontos saíram do roteiro:

### 1. `setPhysicsAvailable(available)` no lugar de um flag `usePhysics`
Só o `PhysicalDiceStage` sabe se a mesa existe de verdade — WebGL pode falhar na
construção do `DiceTable`. Então é ele quem avisa, no mount/unmount. O padrão é
`false`: **sem aviso explícito o controller usa o RNG**. Isso faz o fallback ser
seguro por omissão e manteve os testes antigos passando sem alteração (jsdom não
tem `getContext()`, a mesa nunca monta, o RNG decide).

### 2. `declinePhysics()` — buraco que o handoff não previu
`dicePerformancePolicy` corta a quantidade de dados na mesa
(`maxPhysicalInstances`). Num `10d6` em que a política só deixa cair 6, voltariam
6 valores para uma expressão que pede 10 e `buildRollFromValues` recusaria — a
rolagem morreria. O stage agora confere `maxPhysicalInstances < quantidade`
**antes** de animar e devolve a decisão ao RNG.

Ficou separado de `setPhysicsAvailable(false)` de propósito: disponibilidade é
ciclo de vida da mesa (pegajoso), recusa vale só para a rolagem pendente — a
próxima volta a tentar a física.

### 3. Watchdog de 12 s
Se a mesa morrer no meio da queda (contexto WebGL perdido, aba suspensa), a
Promise de `roll()` ficaria pendurada e o botão girando para sempre. Passado o
teto, o RNG fecha a rolagem. `setPhysicsAvailable(false)` com rolagem em voo
também cai no RNG na hora, sem esperar os 12 s.

### 4. Bug pré-existente corrigido: `hydrate()` apagava o status "rolando"
`open()` dispara `hydrate()`, que ao terminar publicava `status: "idle"`. Com a
rolagem durando segundos, isso apagava o estado "rolando" com os dados ainda no
ar — o botão parava de girar antes do resultado. `hydrate()` agora preserva
`rolling`/`saving`/`awaitingPhysics`. Era um race que já existia; a física só o
tornou visível.

### Detalhes de UI ajustados
- O resultado anterior é limpo ao entrar em `awaitingPhysics` — deixar o número
  velho na tela contradiz o objetivo do fluxo.
- O medalhão do palco sai quando os dados entram em queda, não só quando o
  número chega (senão ficaria por cima dos dados caindo).
- `close()` durante a queda cancela a rolagem sem persistir: o histórico não
  pode ganhar um resultado que o usuário nunca viu.

**Verificação:** `tsc -b` limpo, 810 testes passando (122 arquivos).
