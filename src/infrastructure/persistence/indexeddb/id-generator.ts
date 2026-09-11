/**
 * Implementação de infraestrutura de `IdGenerator` (src/application/ports/id-generator.ts).
 * O domínio nunca gera UUID/CommandId diretamente; só este ponto único chama `crypto`.
 */

import { asCommandId, asUuid, type CommandId, type Uuid } from "@domain/contracts/ids";
import { type IdGenerator } from "@application/ports/id-generator";

export class CryptoIdGenerator implements IdGenerator {
  uuid(): Uuid {
    return asUuid(crypto.randomUUID());
  }

  commandId(): CommandId {
    return asCommandId(crypto.randomUUID());
  }
}
