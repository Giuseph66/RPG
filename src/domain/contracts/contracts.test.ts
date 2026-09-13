import { describe, expect, it } from "vitest";

import { appError, err, isErr, isOk, ok, type AppError } from "./errors";
import { asCommandId, asEntityId, asUuid, isEntityId } from "./ids";
import { asRevision } from "./versioning";
import { type Character } from "./character";
import { type Command, type RuleResult, type RuleResultRejected } from "./rules";
import { type DiceExpression } from "./dice";
import { fixtureShortSwordPriceCp, minimalCharacter, ruleResultSamples } from "./fixtures";

describe("Result helpers", () => {
  it("ok() produces a success result narrowed by isOk", () => {
    const result = ok(42);
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it("err() produces a failure result narrowed by isErr", () => {
    const result = err(appError.notFound("Character", "abc"));
    expect(isErr(result)).toBe(true);
    expect(isOk(result)).toBe(false);
    if (isErr(result)) {
      expect(result.error.code).toBe("not-found");
    }
  });
});

describe("appError construtores", () => {
  it("notFound produz mensagem legível com entidade e id", () => {
    const error = appError.notFound("Character", "char-1");
    expect(error.code).toBe("not-found");
    expect(error.message).toContain("Character");
    expect(error.message).toContain("char-1");
  });

  it("conflict carrega expectedRevision e actualRevision", () => {
    const expected = asRevision(3);
    const actual = asRevision(4);
    const error = appError.conflict(expected, actual);
    expect(error.code).toBe("conflict");
    expect(error.expectedRevision).toBe(expected);
    expect(error.actualRevision).toBe(actual);
  });

  it("validation carrega field e message", () => {
    const error = appError.validation("hp.current", "PV atual não pode exceder o máximo.");
    expect(error).toEqual({
      code: "validation-error",
      field: "hp.current",
      message: "PV atual não pode exceder o máximo.",
    });
  });

  it("unresolvedRule aceita pendencyId e sourceRef opcionais", () => {
    const error = appError.unresolvedRule("Pré-requisito autorreferente não resolvido.", "PEND-006");
    expect(error.code).toBe("unresolved-rule");
    expect(error.pendencyId).toBe("PEND-006");
  });
});

describe("Brands e helpers de ID", () => {
  it("aceita EntityId kebab-case simples e qualificado por ponto", () => {
    expect(() => asEntityId("druid")).not.toThrow();
    expect(() => asEntityId("druid.wild-shape")).not.toThrow();
    expect(() => asEntityId("cure-wounds")).not.toThrow();
  });

  it("rejeita EntityId fora do formato kebab-case", () => {
    expect(() => asEntityId("Druid")).toThrow();
    expect(() => asEntityId("druid_wild_shape")).toThrow();
    expect(() => asEntityId("")).toThrow();
    expect(() => asEntityId("druid..wild")).toThrow();
  });

  it("isEntityId narrows sem lançar exceção", () => {
    expect(isEntityId("longsword")).toBe(true);
    expect(isEntityId("Longsword")).toBe(false);
  });

  it("aceita Uuid em formato canônico e rejeita string arbitrária", () => {
    expect(() => asUuid("11111111-1111-4111-8111-111111111111")).not.toThrow();
    expect(() => asUuid("not-a-uuid")).toThrow();
  });

  it("asCopperPieces (via fixture) produz um branded number íntegro", () => {
    expect(fixtureShortSwordPriceCp).toBe(1000);
  });
});

describe("Narrowing de RuleResult", () => {
  function describeResult(result: RuleResult): string {
    switch (result.status) {
      case "success":
        return `success:${result.nextState.id}`;
      case "needsInput":
        return `needsInput:${result.requests.length}`;
      case "rejected":
        return `rejected:${result.errors.length}`;
    }
  }

  it("narrows success com nextState acessível", () => {
    expect(describeResult(ruleResultSamples.success)).toBe(`success:${minimalCharacter.id}`);
  });

  it("narrows needsInput com requests acessível", () => {
    expect(describeResult(ruleResultSamples.needsInput)).toBe("needsInput:1");
  });

  it("narrows rejected com errors acessível", () => {
    expect(describeResult(ruleResultSamples.rejected)).toBe("rejected:1");
  });
});

describe("Narrowing de AppError", () => {
  function codeOf(error: AppError): string {
    switch (error.code) {
      case "validation-error":
        return `field:${error.field}`;
      case "not-found":
        return `entity:${error.entity}`;
      case "conflict":
        return `revisions:${error.expectedRevision}-${error.actualRevision}`;
      case "quota-exceeded":
      case "storage-unavailable":
      case "unsupported-schema":
      case "missing-ruleset":
      case "corrupt-record":
      case "unresolved-rule":
      case "membership-unauthenticated":
      case "membership-forbidden":
      case "membership-not-found":
      case "membership-invalid-state":
      case "membership-validation":
      case "membership-unavailable":
        return error.code;
    }
  }

  it("narrows validation-error com field tipado", () => {
    expect(codeOf(appError.validation("name", "obrigatório"))).toBe("field:name");
  });

  it("narrows not-found com entity tipado", () => {
    expect(codeOf(appError.notFound("Campaign", "camp-1"))).toBe("entity:Campaign");
  });
});

describe("Narrowing de Command", () => {
  function summarize(command: Command): string {
    switch (command.kind) {
      case "apply-damage":
        return `damage:${command.payload.amount}:${command.payload.damageType}`;
      case "apply-healing":
        return `healing:${command.payload.amount}`;
      case "apply-temp-hp":
        return `temp-hp:${command.payload.amount}`;
      case "spend-resource":
        return `spend:${command.payload.resourceStateId}`;
      case "resolve-attack":
        return `attack:${command.payload.attackRollId}`;
      case "cast-spell":
        return `cast:${command.payload.mode}`;
      case "end-concentration":
        return `end-concentration:${command.payload.reason}`;
      case "resolve-saving-throw":
        return `save:${command.payload.ability}`;
      case "resolve-death-save":
        return `death-save:${command.payload.rollId}`;
      case "rest":
        return `rest:${command.payload.restKind}`;
      case "equip-item":
        return `equip:${command.payload.equippedState}`;
      case "update-choices":
        return `choices:${command.payload.selections.length}`;
      case "level-up":
        return `level-up:${command.payload.classId}`;
    }
    return command.kind;
  }

  it("narrows apply-damage com payload tipado por kind", () => {
    const command: Command = {
      commandId: asCommandId("cmd-1"),
      characterId: minimalCharacter.id,
      expectedRevision: minimalCharacter.revision,
      kind: "apply-damage",
      payload: { amount: 5, damageType: "slashing", diceResultIds: [] },
    };
    expect(summarize(command)).toBe("damage:5:slashing");
  });

  it("narrows rest com restKind tipado", () => {
    const command: Command = {
      commandId: asCommandId("cmd-2"),
      characterId: minimalCharacter.id,
      expectedRevision: minimalCharacter.revision,
      kind: "rest",
      payload: { restKind: "long" },
    };
    expect(summarize(command)).toBe("rest:long");
  });
});

describe("Tipos inválidos são rejeitados em tempo de compilação", () => {
  it("RuleResultRejected não aceita nextState (needsInput/rejected sem estado aplicável)", () => {
    const invalidRejected: RuleResultRejected = {
      status: "rejected",
      errors: [],
      sourceRefs: [],
      // @ts-expect-error rejected não pode conter nextState — ver 10-RULES-ENGINE.md
      nextState: minimalCharacter,
    };
    expect(invalidRejected.status).toBe("rejected");
  });

  it("DiceExpression.faces é uma união fechada do catálogo de dados", () => {
    const invalidExpression: DiceExpression = {
      quantity: 1,
      // @ts-expect-error faces:9 não pertence à união fechada de DiceFaces
      faces: 9,
      modifier: 0,
      mode: "normal",
    };
    expect(invalidExpression.faces).toBe(9);
  });

  it("Character exige schemaVersion", () => {
    const { schemaVersion: _omitted, ...rest } = minimalCharacter;
    // @ts-expect-error schemaVersion é obrigatório em Character (schemaVersion 1)
    const invalidCharacter: Character = { ...rest };
    expect(invalidCharacter.name).toBe(minimalCharacter.name);
  });
});
