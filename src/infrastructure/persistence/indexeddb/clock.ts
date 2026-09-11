/**
 * Implementação de infraestrutura de `Clock` (src/application/ports/clock.ts).
 * O domínio e os adapters de persistência nunca chamam `Date.now()`/`new Date()`
 * diretamente; só este ponto único produz o timestamp real da plataforma.
 */

import { asIsoTimestamp, type IsoTimestamp } from "@domain/contracts/ids";
import { type Clock } from "@application/ports/clock";

export class SystemClock implements Clock {
  now(): IsoTimestamp {
    return asIsoTimestamp(new Date().toISOString());
  }
}
