import type { NormalizedCoordinate, MapViewport } from "./types";

const MIN_NORMALIZED = 0;
const MAX_NORMALIZED = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} deve ser finito.`);
}

/** Keeps persisted marker coordinates independent from viewport zoom and pan. */
export function normalizeCoordinate(value: number): number {
  assertFinite(value, "Coordenada");
  return clamp(value, MIN_NORMALIZED, MAX_NORMALIZED);
}

export function normalizeCoordinates(x: number, y: number): NormalizedCoordinate {
  return { x: normalizeCoordinate(x), y: normalizeCoordinate(y) };
}

export function normalizedToImagePoint(coordinate: NormalizedCoordinate, width: number, height: number): { readonly x: number; readonly y: number } {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("Dimensões da imagem devem ser positivas e finitas.");
  }
  return { x: normalizeCoordinate(coordinate.x) * width, y: normalizeCoordinate(coordinate.y) * height };
}

export function imagePointToNormalized(x: number, y: number, width: number, height: number): NormalizedCoordinate {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("Dimensões da imagem devem ser positivas e finitas.");
  }
  return normalizeCoordinates(x / width, y / height);
}

/** Converts a persisted image coordinate to the viewport without changing the persisted value. */
export function normalizedToViewportPoint(coordinate: NormalizedCoordinate, imageWidth: number, imageHeight: number, viewport: MapViewport): { readonly x: number; readonly y: number } {
  const imagePoint = normalizedToImagePoint(coordinate, imageWidth, imageHeight);
  return { x: imagePoint.x * viewport.zoom + viewport.offsetX, y: imagePoint.y * viewport.zoom + viewport.offsetY };
}

/** Inverse of normalizedToViewportPoint; useful for creating a marker from a pointer event. */
export function viewportPointToNormalized(x: number, y: number, imageWidth: number, imageHeight: number, viewport: MapViewport): NormalizedCoordinate {
  if (!(viewport.zoom > 0) || !Number.isFinite(viewport.zoom)) throw new Error("Zoom deve ser positivo e finito.");
  return imagePointToNormalized((x - viewport.offsetX) / viewport.zoom, (y - viewport.offsetY) / viewport.zoom, imageWidth, imageHeight);
}

export const screenToNormalized = viewportPointToNormalized;
export const normalizedToScreen = normalizedToViewportPoint;
export const normalizeMapCoordinates = normalizeCoordinates;
