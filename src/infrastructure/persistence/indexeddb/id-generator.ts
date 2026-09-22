/**
 * Implementação de infraestrutura de `IdGenerator` (src/application/ports/id-generator.ts).
 * O domínio nunca gera UUID/CommandId diretamente; só este ponto único chama `crypto`.
 *
 * `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost). Ao abrir o dev server
 * pela rede (`http://<ip-lan>:5173`) a função não existe; nesse caso gera UUID v4 a partir de
 * `crypto.getRandomValues`, que continua disponível em contexto inseguro.
 */

import { asCommandId, asUuid, type CommandId, type Uuid } from "@domain/contracts/ids";
import { type IdGenerator } from "@application/ports/id-generator";

function randomUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class CryptoIdGenerator implements IdGenerator {
  uuid(): Uuid {
    return asUuid(randomUuid());
  }

  commandId(): CommandId {
    return asCommandId(randomUuid());
  }
}
