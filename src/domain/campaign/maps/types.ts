import type { Asset, MapPin, MapRecord } from "@domain/contracts/campaign";
import type { Result } from "@domain/contracts/errors";
import type { Uuid } from "@domain/contracts/ids";

export interface NormalizedCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface MapMarker extends Omit<MapPin, "normalizedX" | "normalizedY" | "label"> {
  readonly x: number;
  readonly y: number;
  /** Canonical persistence names, kept alongside x/y for adapter ergonomics. */
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly label: string;
  /** An optional semantic category for the marker (for example, city or objective). */
  readonly type?: string;
  readonly description?: string;
}

export interface MapAttachment extends Asset {
  readonly mediaType: MapRasterMediaType;
  readonly width: number;
  readonly height: number;
}

export type MapRasterMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface MapValidationPolicy {
  readonly allowedMediaTypes?: readonly MapRasterMediaType[];
  readonly maxBytes?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly quotaBytes?: number;
  readonly usedBytes?: number;
}

export interface AttachmentQuota {
  readonly usedBytes: number;
  readonly quotaBytes: number;
}

export interface MapMarkerPatch {
  readonly x?: number;
  readonly y?: number;
  readonly normalizedX?: number;
  readonly normalizedY?: number;
  readonly label?: string;
  readonly type?: string;
  readonly description?: string;
  readonly locationId?: Uuid;
  readonly noteIds?: readonly Uuid[];
  readonly iconToken?: string;
}

export interface MapViewport {
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface MapAttachmentState {
  readonly map: MapRecord;
  readonly attachment?: MapAttachment;
  readonly markers: readonly MapMarker[];
}

export type MapDomainError =
  | { readonly code: "invalid-marker"; readonly message: string; readonly field: "label" }
  | { readonly code: "missing-attachment"; readonly message: string; readonly field: "asset" }
  | { readonly code: "invalid-media-type"; readonly message: string; readonly field: "mediaType" }
  | { readonly code: "attachment-too-large"; readonly message: string; readonly field: "bytes"; readonly maxBytes: number; readonly actualBytes: number }
  | { readonly code: "invalid-dimensions"; readonly message: string; readonly field: "width" | "height" }
  | { readonly code: "quota-exceeded"; readonly message: string; readonly field: "quota"; readonly requestedBytes: number; readonly availableBytes: number }
  | { readonly code: "inconsistent-attachment"; readonly message: string; readonly field: "assetId" };

export type MapResult<T> = Result<T, MapDomainError>;
