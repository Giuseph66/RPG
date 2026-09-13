import { useCallback, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, WheelEvent } from "react";

import { Button } from "@components/ui";
import { ArrowsOut, Crosshair, MapPin, MapTrifold, Minus, Plus } from "@phosphor-icons/react";
import { normalizeCoordinate } from "@domain/campaign/maps";

import { markerViewCoordinate, markerViewId, markerViewLabel, type MapViewerProps } from "./types";
import styles from "./map-viewer.module.css";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

interface ViewportState {
  readonly zoom: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function initialViewport(): ViewportState {
  return { zoom: 1, offsetX: 0, offsetY: 0 };
}

function changedViewport(previous: ViewportState, next: ViewportState): boolean {
  return previous.zoom !== next.zoom || previous.offsetX !== next.offsetX || previous.offsetY !== next.offsetY;
}

function markerCoordinateStyle(marker: NonNullable<MapViewerProps["markers"]>[number]): CSSProperties {
  const coordinate = markerViewCoordinate(marker);
  return { left: `${normalizeCoordinate(coordinate.x) * 100}%`, top: `${normalizeCoordinate(coordinate.y) * 100}%` };
}

export function MapViewer({
  map,
  image,
  imageUrl,
  imageAlt,
  markers = [],
  selectedMarkerId,
  groupPosition,
  onMarkerSelect,
  onAddMarker,
  onViewportChange,
  className,
}: MapViewerProps) {
  const [viewport, setViewport] = useState<ViewportState>(initialViewport);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ readonly x: number; readonly y: number; readonly offsetX: number; readonly offsetY: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const source = image?.src ?? imageUrl;
  const title = map?.name ?? "Mapa da campanha";

  const updateViewport = useCallback((next: ViewportState) => {
    setViewport((previous) => {
      if (!changedViewport(previous, next)) return previous;
      onViewportChange?.(next);
      return next;
    });
  }, [onViewportChange]);

  const zoomBy = (amount: number) => updateViewport({ ...viewport, zoom: clampZoom(viewport.zoom + amount) });
  const resetViewport = () => updateViewport(initialViewport());
  const selectedMarker = selectedMarkerId === undefined ? undefined : markers.find((marker) => markerViewId(marker) === selectedMarkerId);
  const focusSelectedMarker = () => {
    if (!selectedMarker) return;
    const surface = surfaceRef.current;
    const coordinate = markerViewCoordinate(selectedMarker);
    const width = surface?.clientWidth ?? 0;
    const height = surface?.clientHeight ?? 0;
    updateViewport({ ...viewport, offsetX: width / 2 - normalizeCoordinate(coordinate.x) * width * viewport.zoom, offsetY: height / 2 - normalizeCoordinate(coordinate.y) * height * viewport.zoom });
  };

  const onSurfaceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const movement = 24;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const x = event.key === "ArrowLeft" ? movement : event.key === "ArrowRight" ? -movement : 0;
      const y = event.key === "ArrowUp" ? movement : event.key === "ArrowDown" ? -movement : 0;
      updateViewport({ ...viewport, offsetX: viewport.offsetX + x, offsetY: viewport.offsetY + y });
    } else if (event.key === "+" || event.key === "=" || event.key === "Add") {
      event.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (event.key === "-" || event.key === "Subtract") {
      event.preventDefault();
      zoomBy(-ZOOM_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetViewport();
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    setIsPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    panStart.current = { x: event.clientX, y: event.clientY, offsetX: viewport.offsetX, offsetY: viewport.offsetY };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    updateViewport({ ...viewport, offsetX: panStart.current.offsetX + event.clientX - panStart.current.x, offsetY: panStart.current.offsetY + event.clientY - panStart.current.y });
  };
  const stopPanning = () => { panStart.current = null; setIsPanning(false); };
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  };

  const selectMarker = (id: string) => onMarkerSelect?.(id);

  return (
    <section id="journey-map" className={[styles.mapViewer, className ?? ""].filter(Boolean).join(" ")} aria-labelledby="map-viewer-title">
      <div className={styles.heading}>
        <div className={styles.titleBlock}><span className={styles.titleIcon} aria-hidden="true"><MapTrifold size={23} weight="duotone" /></span><div><p className={styles.eyebrow}>Jornada · cartografia</p><h1 id="map-viewer-title">{title}</h1></div></div>
        <div className={styles.controls} aria-label="Controles do mapa">
          <Button size="sm" variant="secondary" aria-label="Reduzir zoom" onClick={() => zoomBy(-ZOOM_STEP)}><Minus size={17} aria-hidden="true" /></Button>
          <span className={styles.zoomValue} aria-live="polite">{Math.round(viewport.zoom * 100)}%</span>
          <Button size="sm" variant="secondary" aria-label="Aumentar zoom" onClick={() => zoomBy(ZOOM_STEP)}><Plus size={17} aria-hidden="true" /></Button>
          <Button size="sm" variant="ghost" aria-label="Ajustar mapa" onClick={resetViewport}><ArrowsOut size={17} aria-hidden="true" /> Ajustar</Button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mapColumn}>
          <div
            ref={surfaceRef}
            className={[styles.surface, isPanning ? styles.panning : ""].filter(Boolean).join(" ")}
            role="application"
            aria-label={`${title}. Use as setas para mover, mais e menos para zoom.`}
            tabIndex={0}
            onKeyDown={onSurfaceKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopPanning}
            onPointerCancel={stopPanning}
            onWheel={onWheel}
          >
            {source ? (
              <div className={styles.canvas} style={{ transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})` }}>
                <img className={styles.image} src={source} width={image?.width} height={image?.height} alt={image?.alt ?? imageAlt ?? `Imagem do mapa ${title}`} draggable={false} />
                {markers.map((marker) => {
                  const id = markerViewId(marker);
                  return <button key={id} type="button" className={[styles.marker, selectedMarkerId === id ? styles.selectedMarker : ""].filter(Boolean).join(" ")} style={markerCoordinateStyle(marker)} aria-label={`Local: ${markerViewLabel(marker)}`} aria-pressed={selectedMarkerId === id} onPointerDown={(event) => event.stopPropagation()} onClick={() => selectMarker(id)}><span aria-hidden="true">{marker.iconToken || "•"}</span></button>;
                })}
                {groupPosition !== undefined ? (() => { const position = typeof groupPosition === "number" ? { x: groupPosition, y: groupPosition } : groupPosition; return <span className={styles.groupPosition} style={{ left: `${normalizeCoordinate(position.x) * 100}%`, top: `${normalizeCoordinate(position.y) * 100}%` }} aria-label="Posição do grupo" title="Posição do grupo">◎</span>; })() : null}
              </div>
            ) : (
              <div className={styles.emptyImage} role="status"><MapTrifold size={40} weight="duotone" aria-hidden="true" /><strong>Este mapa não tem imagem.</strong><span>Importe uma imagem local para visualizar os marcadores.</span></div>
            )}
          </div>
          <div className={styles.mapActions}>
            {onAddMarker ? <Button size="sm" variant="secondary" onClick={() => onAddMarker({ x: 0.5, y: 0.5 })}><MapPin size={17} aria-hidden="true" /> Adicionar local</Button> : null}
            <Button size="sm" variant="ghost" aria-label="Voltar ao marcador" disabled={!selectedMarker} disabledReason={selectedMarker ? undefined : "Selecione um local para centralizá-lo."} onClick={focusSelectedMarker}><Crosshair size={17} aria-hidden="true" /> Voltar ao marcador</Button>
          </div>
        </div>

        <aside className={styles.markerPanel} aria-labelledby="map-locations-title">
          <div className={styles.panelHeading}><div className={styles.panelTitle}><MapPin size={19} weight="duotone" aria-hidden="true" /><h2 id="map-locations-title">Locais</h2></div><span>{markers.length}</span></div>
          {markers.length === 0 ? <p className={styles.muted}>Nenhum local marcado ainda.</p> : <ul className={styles.markerList}>{markers.map((marker) => { const id = markerViewId(marker); return <li key={id}><button type="button" className={styles.markerListButton} aria-current={selectedMarkerId === id ? "true" : undefined} onClick={() => selectMarker(id)}><span className={styles.markerDot} aria-hidden="true"><MapPin size={18} weight="duotone" /></span><span>{markerViewLabel(marker)}</span></button></li>; })}</ul>}
        </aside>
      </div>
      <p className={styles.help}>Arraste para mover. Use as setas, + e − com o mapa focado.</p>
    </section>
  );
}

export const LocalMap = MapViewer;
