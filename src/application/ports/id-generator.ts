/**
 * IdGenerator. Autoridade: dados/ids.md ("IDs de estado: UUID ...").
 * O domínio nunca gera UUID/CommandId diretamente; a aplicação injeta este contrato.
 */

import { type CommandId, type Uuid } from "@domain/contracts/ids";

export interface IdGenerator {
  uuid(): Uuid;
  commandId(): CommandId;
}
