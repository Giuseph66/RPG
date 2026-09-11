# ADR-0004 — Regras puras e contratos compartilhados

Estado: adotado no plano.

## Decisão

Separar definitions, estado e derivados. Rules Engine recebe pack fixado, estado, contexto e resultados aleatórios; devolve RuleResult explicável sem IO. Dice Engine recebe RNG controlável e não decide acerto/crítico. Spellcasting Engine usa contratos de regras e dados, sem segunda lógica dentro de cards.

Contratos pertencem a `src/domain/contracts/` futuro e são documentados antes de consumidores. ChoiceDefinitions, recursos e operadores são declarativos tipados, não strings executáveis. IDs estáveis por pack/categoria. Persistência é responsabilidade da aplicação.

## Alternativas rejeitadas

Fórmula em componente mistura regra e visual. Regras com acesso direto ao store/banco impedem determinismo. Um motor genérico que executa JavaScript importado aumenta risco e escopo; V1 usa operadores conhecidos e extensões versionadas.

## Consequências

Regra incompleta produz needsInput/UnresolvedRule, nunca default silencioso. Fonte e explicação acompanham resultado. Nova edição requer novo pack e avaliação de compatibilidade. [Contratos](../dados/schemas.md), [Rules Engine](../10-RULES-ENGINE.md), [Dice Engine](../11-DICE-ENGINE.md).
