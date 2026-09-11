/**
 * Clock. Autoridade: 03-ARQUITETURA.md ("domínio não importa ... relógio global").
 * Timestamp e ID são injetados pela aplicação (11-DICE-ENGINE.md); o domínio nunca chama
 * `Date.now()`/`new Date()` diretamente.
 */

import { type IsoTimestamp } from "@domain/contracts/ids";

export interface Clock {
  now(): IsoTimestamp;
}
