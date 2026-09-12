import { describe, expect, it } from "vitest";

import {
  createMapMarker,
  deserializeMapMarker,
  imagePointToNormalized,
  markerToMapPin,
  normalizedToViewportPoint,
  serializeMapMarker,
  updateMapMarker,
  validateAttachmentQuota,
  validateMapAttachment,
  viewportPointToNormalized,
} from "./index";

const id = "00000000-0000-4000-8000-000000000001" as never;

describe("map domain", () => {
  it("round trips marker coordinates and preserves notes on metadata-only updates", () => {
    const created = createMapMarker({ id, x: 0.25, y: 0.75, label: "Torre", noteIds: ["note-1" as never], type: "location", description: "Ponto antigo" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const updated = updateMapMarker(created.value, { label: "Torre antiga" });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.noteIds).toEqual(["note-1"]);
    expect(deserializeMapMarker(serializeMapMarker(updated.value))).toMatchObject({ x: 0.25, normalizedX: 0.25, y: 0.75, normalizedY: 0.75, label: "Torre antiga", noteIds: ["note-1"], type: "location", description: "Ponto antigo" });
    expect(markerToMapPin(updated.value).normalizedX).toBe(0.25);
  });

  it("keeps image coordinates stable through zoom and resize", () => {
    const original = imagePointToNormalized(400, 300, 800, 600);
    const viewport = { width: 500, height: 400, zoom: 2, offsetX: 30, offsetY: -12 };
    const screen = normalizedToViewportPoint(original, 1600, 1200, viewport);
    expect(viewportPointToNormalized(screen.x, screen.y, 1600, 1200, viewport)).toEqual(original);
    expect(imagePointToNormalized(800, 600, 1600, 1200)).toEqual(original);
  });

  it("reports missing, invalid, oversized and quota failures as structured errors", () => {
    const missing = validateMapAttachment(undefined);
    const invalidType = validateMapAttachment({ mediaType: "image/svg+xml", bytes: new Uint8Array(1) });
    const oversized = validateMapAttachment({ id, mediaType: "image/png", bytes: new Uint8Array(11), width: 1, height: 1, hash: "hash", originalName: "map.png" }, { maxBytes: 10 });
    const quota = validateAttachmentQuota(11, { usedBytes: 90, quotaBytes: 100 });
    expect(missing).toMatchObject({ ok: false, error: { code: "missing-attachment" } });
    expect(invalidType).toMatchObject({ ok: false, error: { code: "invalid-media-type" } });
    expect(oversized).toMatchObject({ ok: false, error: { code: "attachment-too-large" } });
    expect(quota).toMatchObject({ ok: false, error: { code: "quota-exceeded", requestedBytes: 11, availableBytes: 10 } });
  });
});
