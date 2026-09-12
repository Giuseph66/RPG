import type { MapPin } from "@domain/contracts/campaign";
import type { Uuid } from "@domain/contracts/ids";

import { normalizeCoordinates } from "./coordinates";
import type { MapDomainError, MapMarker, MapMarkerPatch, MapResult, NormalizedCoordinate } from "./types";

function markerError(field: string, message: string): MapDomainError {
  return { code: "invalid-marker", field: field as "label", message };
}

export function createMapMarker(input: {
  readonly id: Uuid;
  readonly x?: number;
  readonly y?: number;
  readonly normalizedX?: number;
  readonly normalizedY?: number;
  readonly label: string;
  readonly locationId?: Uuid;
  readonly noteIds?: readonly Uuid[];
  readonly iconToken?: string;
  readonly type?: string;
  readonly description?: string;
}): MapResult<MapMarker> {
  const coordinates: NormalizedCoordinate = normalizeCoordinates(input.x ?? input.normalizedX ?? 0, input.y ?? input.normalizedY ?? 0);
  if (!input.label.trim()) return { ok: false, error: markerError("label", "O marcador precisa de um título.") };
  return {
    ok: true,
    value: {
      id: input.id,
      x: coordinates.x,
      y: coordinates.y,
      normalizedX: coordinates.x,
      normalizedY: coordinates.y,
      label: input.label,
      locationId: input.locationId,
      noteIds: [...(input.noteIds ?? [])],
      iconToken: input.iconToken ?? "pin",
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.description === undefined ? {} : { description: input.description }),
    },
  };
}

export function updateMapMarker(marker: MapMarker, patch: MapMarkerPatch): MapResult<MapMarker> {
  const coordinates = normalizeCoordinates(patch.x ?? patch.normalizedX ?? marker.x, patch.y ?? patch.normalizedY ?? marker.y);
  if (patch.label !== undefined && !patch.label.trim()) return { ok: false, error: markerError("label", "O marcador precisa de um título.") };
  return {
    ok: true,
    value: {
      ...marker,
      ...patch,
      x: coordinates.x,
      y: coordinates.y,
      normalizedX: coordinates.x,
      normalizedY: coordinates.y,
      // noteIds are copied and only replaced when the caller explicitly supplies them.
      noteIds: patch.noteIds === undefined ? [...marker.noteIds] : [...patch.noteIds],
    },
  };
}

export function markerToMapPin(marker: MapMarker): MapPin {
  return {
    id: marker.id,
    normalizedX: marker.normalizedX,
    normalizedY: marker.normalizedY,
    label: marker.label,
    locationId: marker.locationId,
    noteIds: [...marker.noteIds],
    iconToken: marker.iconToken,
    ...(marker.type === undefined ? {} : { type: marker.type }),
    ...(marker.description === undefined ? {} : { description: marker.description }),
  };
}

export function mapPinToMarker(pin: MapPin): MapMarker {
  const metadata = pin as MapPin & { readonly type?: string; readonly description?: string };
  return {
    id: pin.id,
    x: pin.normalizedX,
    y: pin.normalizedY,
    normalizedX: pin.normalizedX,
    normalizedY: pin.normalizedY,
    label: pin.label,
    locationId: pin.locationId,
    noteIds: [...pin.noteIds],
    iconToken: pin.iconToken,
    ...(metadata.type === undefined ? {} : { type: metadata.type }),
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
  };
}

export function serializeMapMarker(marker: MapMarker): MapPin {
  return markerToMapPin(marker);
}

export function deserializeMapMarker(pin: MapPin): MapMarker {
  return mapPinToMarker(pin);
}

export const createMarker = createMapMarker;
export const updateMarker = updateMapMarker;
export const toMapPin = markerToMapPin;
export const fromMapPin = mapPinToMarker;
