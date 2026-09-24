import type { NormalizedCoordinate, MapMarker } from "@domain/campaign/maps";

/** UI accepts persisted branded IDs as well as plain IDs from adapters and fixtures. */
export interface MapMarkerView {
  readonly id: string;
  readonly x?: number;
  readonly y?: number;
  readonly normalizedX?: number;
  readonly normalizedY?: number;
  readonly label: string;
  readonly locationId?: string;
  readonly noteIds?: readonly string[];
  readonly iconToken?: string;
  readonly type?: string;
  readonly description?: string;
}

export interface MapImageSource {
  readonly src: string;
  readonly alt?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface MapViewerProps {
  readonly map?: { readonly id: string; readonly name: string; readonly assetId: string };
  readonly image?: MapImageSource | null;
  readonly imageUrl?: string;
  readonly imageAlt?: string;
  readonly markers?: readonly MapMarkerView[];
  readonly selectedMarkerId?: string;
  readonly groupPosition?: NormalizedCoordinate | number;
  readonly onMarkerSelect?: (markerId: string) => void;
  readonly onMarkerEdit?: (markerId: string) => void;
  readonly onMarkerRemove?: (markerId: string) => void;
  readonly onAddMarker?: (coordinate: NormalizedCoordinate) => void;
  readonly onViewportChange?: (viewport: { readonly zoom: number; readonly offsetX: number; readonly offsetY: number }) => void;
  readonly className?: string;
}

export function markerViewCoordinate(marker: MapMarkerView | MapMarker): NormalizedCoordinate {
  const view = marker as MapMarkerView;
  if (view.x !== undefined && view.y !== undefined) return { x: view.x, y: view.y };
  const persisted = marker as { readonly normalizedX?: number; readonly normalizedY?: number };
  return { x: persisted.normalizedX ?? 0, y: persisted.normalizedY ?? 0 };
}

export function markerViewLabel(marker: MapMarkerView): string {
  return marker.label;
}

export function markerViewId(marker: MapMarkerView): string {
  return String(marker.id);
}
