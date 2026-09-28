import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Asset, CampaignAudience, MapPin, MapRecord } from "@domain/contracts/campaign";
import type { AppError, Result } from "@domain/contracts/errors";
import type { Uuid } from "@domain/contracts/ids";
import type { Revision } from "@domain/contracts/versioning";
import type { NormalizedCoordinate } from "@domain/campaign/maps";
import { AppModal, Button, Input, InlineStatus } from "@components/ui";
import { CloudCheck, CloudSlash, Eye, EyeSlash, MapTrifold, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { MapViewer } from "./MapViewer";
import styles from "./map-workspace.module.css";

export interface MapImportInput {
  readonly campaignId: Uuid;
  readonly name: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
  readonly hash: string;
  readonly width: number;
  readonly height: number;
  readonly originalName: string;
}

export interface MapWorkspaceProps {
  readonly campaignId?: Uuid;
  readonly canManage?: boolean;
  readonly listMaps: (campaignId: Uuid) => Promise<Result<readonly MapRecord[], AppError>>;
  readonly getAsset?: (assetId: Uuid) => Promise<Result<Asset, AppError>>;
  readonly importMap?: (input: MapImportInput) => Promise<Result<{ readonly map: MapRecord; readonly asset: Asset }, AppError>>;
  readonly addPin?: (input: { readonly mapId: Uuid; readonly x: number; readonly y: number; readonly label: string; readonly expectedRevision: Revision }) => Promise<Result<{ readonly pin: MapPin; readonly revision: Revision }, AppError>>;
  readonly updatePin?: (mapId: Uuid, pin: MapPin, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
  readonly removePin?: (mapId: Uuid, pinId: Uuid, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
  readonly saveMap?: (map: MapRecord, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
  readonly deleteMap?: (id: Uuid, expectedRevision: Revision) => Promise<Result<void, AppError>>;
  /** Imagem local ou baixada do Firebase; tem precedência sobre `getAsset`. */
  readonly loadImage?: (map: MapRecord) => Promise<Result<Asset, AppError>>;
  /** Envio ao Firebase e compartilhamento com jogadores (somente mestre). */
  readonly publication?: {
    readonly canPublish: boolean;
    readonly publish: (map: MapRecord) => Promise<Result<MapRecord, AppError>>;
    readonly share: (map: MapRecord, audience: CampaignAudience) => Promise<Result<MapRecord, AppError>>;
  };
  readonly players?: readonly { readonly accountId: string; readonly name: string }[];
}

function audienceLabel(map: MapRecord, players: readonly { readonly accountId: string; readonly name: string }[]): string {
  const audience = map.visibleTo ?? [];
  if (audience.length === 0) return "Só o mestre";
  if (audience.includes("*")) return "Todos os jogadores";
  const names = players.filter((player) => audience.includes(player.accountId as never)).map((player) => player.name);
  return names.length === 1 ? names[0]! : `${audience.length} jogadores`;
}

// Mesmos limites do Cloud Storage: um mapa importado sempre pode ser compartilhado.
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

async function inspectImage(file: File): Promise<{ bytes: Uint8Array; width: number; height: number; hash: string }> {
  if (!allowedTypes.has(file.type)) throw new Error("Use uma imagem PNG, JPG ou WebP.");
  if (file.size > maxBytes) throw new Error("A imagem precisa ter até 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 10000 || image.naturalHeight > 10000) {
      throw new Error("A imagem precisa ter dimensões válidas, com no máximo 10.000 px por lado.");
    }
    const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer as ArrayBuffer);
    const hash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    return { bytes, width: image.naturalWidth, height: image.naturalHeight, hash };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function formatBytes(size: number): string {
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function MapWorkspace({ campaignId, canManage = false, listMaps, getAsset, importMap, addPin, updatePin, removePin, saveMap, deleteMap, loadImage, publication, players = [] }: MapWorkspaceProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [maps, setMaps] = useState<readonly MapRecord[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [mapListFailed, setMapListFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [imageUrl, setImageUrl] = useState<string>();
  const [asset, setAsset] = useState<Asset>();
  const [draftName, setDraftName] = useState("");
  const [pinCoordinate, setPinCoordinate] = useState<NormalizedCoordinate>();
  const [pinName, setPinName] = useState("");
  const [editingPinId, setEditingPinId] = useState<string>();
  const [selectedPinId, setSelectedPinId] = useState<string>();
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [cloudBusy, setCloudBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDraft, setShareDraft] = useState<readonly string[]>([]);
  const selectedMap = maps.find((map) => String(map.id) === selectedId);
  const markers = useMemo(() => selectedMap?.pins ?? [], [selectedMap]);

  async function reload(preferredId?: string) {
    if (!campaignId) { setMaps([]); setSelectedId(undefined); setMapListFailed(false); setLoadingMaps(false); return; }
    setLoadingMaps(true);
    try {
      const result = await listMaps(campaignId);
      if (!result.ok) { setMapListFailed(true); setMessage(result.error.message); return; }
      setMapListFailed(false);
      setMaps(result.value);
      setSelectedId((current) => {
        const preferred = preferredId ?? current;
        return result.value.some((map) => String(map.id) === preferred) ? preferred : result.value[0] ? String(result.value[0].id) : undefined;
      });
    } catch (error) {
      setMapListFailed(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar os mapas desta campanha.");
    } finally {
      setLoadingMaps(false);
    }
  }

  useEffect(() => { void reload(); }, [campaignId, listMaps]);
  useEffect(() => {
    let active = true;
    setAsset(undefined);
    setImageUrl(undefined);
    const load = loadImage && selectedMap ? () => loadImage(selectedMap) : getAsset && selectedMap ? () => getAsset(selectedMap.assetId) : undefined;
    if (!selectedMap || !load) { setImageUrl(undefined); return () => { active = false; }; }
    void load().then((result) => {
      if (!active) return;
      if (!result.ok) { setAsset(undefined); setImageUrl(undefined); setMessage(result.error.code === "not-found" ? "A imagem deste mapa ainda não chegou. Toque em Atualizar em instantes." : result.error.message); return; }
      setAsset(result.value);
      const buffer = result.value.bytes.slice().buffer as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: result.value.mediaType }));
      setImageUrl(url);
    });
    return () => { active = false; };
  }, [getAsset, loadImage, selectedMap?.assetId]);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  async function importFile(file?: File) {
    if (!campaignId || !file || !importMap) return;
    setBusy(true); setMessage(undefined);
    try {
      const inspected = await inspectImage(file);
      const result = await importMap({ campaignId, name: draftName.trim() || file.name.replace(/\.[^.]+$/, ""), mediaType: file.type, bytes: inspected.bytes, hash: inspected.hash, width: inspected.width, height: inspected.height, originalName: file.name });
      if (!result.ok) { setMessage(result.error.message); return; }
      setDraftName(""); setMessage(`Mapa “${result.value.map.name}” importado · ${formatBytes(file.size)}.`);
      await reload(String(result.value.map.id));
      if (publication?.canPublish) void publishSelected(result.value.map);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ler essa imagem.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function replaceMap(next: MapRecord, previousId = next.id) {
    setMaps((current) => current.map((map) => map.id === previousId ? next : map));
  }

  async function publishSelected(target = selectedMap) {
    if (!target || !publication) return;
    setCloudBusy(true); setMessage(undefined);
    const result = await publication.publish(target);
    setCloudBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    replaceMap(result.value, target.id);
    setMessage(`Imagem de “${result.value.name}” confirmada no Firebase.`);
  }

  async function saveAudience() {
    if (!selectedMap || !publication) return;
    const audience = (shareDraft.includes("*") ? ["*"] : shareDraft) as unknown as CampaignAudience;
    setCloudBusy(true); setMessage(undefined);
    const result = await publication.share(selectedMap, audience);
    setCloudBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    replaceMap(result.value, selectedMap.id);
    setShareOpen(false);
    setMessage(audience.length === 0 ? "Mapa visível só para você." : `Mapa compartilhado · ${audienceLabel(result.value, players)}. Os jogadores veem ao atualizar.`);
  }

  async function renameSelected() {
    if (!selectedMap || !saveMap || !draftName.trim()) return;
    setBusy(true); setMessage(undefined);
    const result = await saveMap({ ...selectedMap, name: draftName.trim() }, selectedMap.revision);
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setMaps((current) => current.map((map) => map.id === selectedMap.id ? { ...map, name: draftName.trim(), revision: result.value } : map));
    setDraftName(""); setRenaming(false); setMessage("Nome do mapa atualizado.");
  }

  async function savePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMap || !pinCoordinate || !pinName.trim()) return;
    setBusy(true); setMessage(undefined);
    if (editingPinId) {
      if (!updatePin) { setBusy(false); return; }
      const currentPin = selectedMap.pins.find((pin) => String(pin.id) === editingPinId);
      if (!currentPin) { setBusy(false); setEditingPinId(undefined); setPinCoordinate(undefined); return; }
      const pin = { ...currentPin, label: pinName.trim() };
      const result = await updatePin(selectedMap.id, pin, selectedMap.revision);
      setBusy(false);
      if (!result.ok) { setMessage(result.error.message); return; }
      setMaps((current) => current.map((map) => map.id === selectedMap.id ? { ...map, pins: map.pins.map((item) => item.id === pin.id ? pin : item), revision: result.value } : map));
      setEditingPinId(undefined); setPinCoordinate(undefined); setPinName("");
      setMessage(`Local “${pin.label}” atualizado.`);
      return;
    }
    if (!addPin) { setBusy(false); return; }
    const result = await addPin({ mapId: selectedMap.id, x: pinCoordinate.x, y: pinCoordinate.y, label: pinName.trim(), expectedRevision: selectedMap.revision });
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setMaps((current) => current.map((map) => map.id === selectedMap.id ? { ...map, pins: [...map.pins, result.value.pin], revision: result.value.revision } : map));
    setSelectedPinId(String(result.value.pin.id));
    setPinCoordinate(undefined); setPinName("");
    setMessage(`Local “${result.value.pin.label}” marcado no mapa.`);
  }

  function editPin(pinId: string) {
    const pin = selectedMap?.pins.find((entry) => String(entry.id) === pinId);
    if (!pin || !updatePin) return;
    setSelectedPinId(pinId); setEditingPinId(pinId); setPinName(pin.label);
    setPinCoordinate({ x: pin.normalizedX, y: pin.normalizedY });
  }

  function startNewPin(coordinate: NormalizedCoordinate) {
    setEditingPinId(undefined); setPinName(""); setPinCoordinate(coordinate);
  }

  async function removeSelectedPin(pinId: string) {
    if (!selectedMap || !removePin) return;
    const pin = selectedMap.pins.find((entry) => String(entry.id) === pinId);
    if (!pin || !window.confirm(`Remover o local “${pin.label}” deste mapa?`)) return;
    setBusy(true); setMessage(undefined);
    const result = await removePin(selectedMap.id, pin.id, selectedMap.revision);
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setMaps((current) => current.map((map) => map.id === selectedMap.id ? { ...map, pins: map.pins.filter((entry) => entry.id !== pin.id), revision: result.value } : map));
    if (selectedPinId === pinId) setSelectedPinId(undefined);
    if (editingPinId === pinId) { setEditingPinId(undefined); setPinCoordinate(undefined); setPinName(""); }
    setMessage(`Local “${pin.label}” removido do mapa.`);
  }

  async function removeSelected() {
    if (!selectedMap || !deleteMap || !window.confirm(`Remover “${selectedMap.name}” da campanha?`)) return;
    setBusy(true); setMessage(undefined);
    const result = await deleteMap(selectedMap.id, selectedMap.revision);
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setMessage("Mapa removido da campanha.");
    await reload();
  }

  return <section className={styles.workspace} aria-labelledby="map-workspace-title">
    <header className={styles.heading}>
      <div className={styles.headingCopy}><p className={styles.eyebrow}>JORNADA · CARTOGRAFIA</p><h1 id="map-workspace-title">Mapas da campanha</h1><p>Territórios, lugares descobertos e caminhos da aventura.</p></div>
      {canManage && maps.length > 0 ? <Button onClick={() => fileInput.current?.click()} busy={busy} disabled={!campaignId || busy}><UploadSimple size={17} aria-hidden="true" /> Importar mapa</Button> : null}
    </header>
    <input ref={fileInput} className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Escolher imagem do mapa" onChange={(event) => void importFile(event.currentTarget.files?.[0])} />
    <AppModal open={canManage && renaming} title="Renomear mapa" onClose={() => { setRenaming(false); setDraftName(""); }}><div className={styles.nameEditor}><Input label="Nome do mapa" value={draftName} onChange={(event) => setDraftName(event.currentTarget.value)} maxLength={80} /><Button size="sm" disabled={busy || !draftName.trim()} onClick={() => void renameSelected()}>Salvar nome</Button><Button size="sm" variant="ghost" onClick={() => { setRenaming(false); setDraftName(""); }}>Cancelar</Button></div></AppModal>
    {message ? <InlineStatus tone={/importado|atualizado|removido|confirmada|compartilhado|visível só/.test(message) ? "success" : message.includes("ainda não chegou") ? "info" : "error"}>{message}</InlineStatus> : null}
    {!campaignId ? <div className={styles.empty}><MapTrifold size={36} weight="duotone" aria-hidden="true" /><strong>Escolha uma campanha</strong><span>Os mapas ficam guardados junto à campanha selecionada.</span></div> : loadingMaps ? <div className={styles.empty} role="status"><MapTrifold size={34} weight="duotone" aria-hidden="true" /><strong>Consultando o atlas…</strong><span>Carregando os mapas salvos nesta campanha.</span></div> : mapListFailed ? <div className={styles.empty}><MapTrifold size={34} weight="duotone" aria-hidden="true" /><strong>Não foi possível carregar os mapas</strong><span>O atlas da campanha não respondeu. Tente carregar novamente.</span><Button variant="secondary" onClick={() => { setMessage(undefined); void reload(); }}>Tentar novamente</Button></div> : maps.length === 0 ? <div className={styles.empty}><span className={styles.emptySeal}><MapTrifold size={34} weight="duotone" aria-hidden="true" /></span><p className={styles.eyebrow}>A CARTOGRAFIA COMEÇA AQUI</p><h2>Nenhum mapa nesta campanha</h2><p>{canManage ? "Importe o mapa do mundo, uma cidade ou uma região. Ele começa visível só para você; depois escolha quem pode ver." : "O mestre ainda não liberou nenhum mapa para você."}</p>{canManage ? <div className={styles.importForm}><Input label="Nome do mapa (opcional)" value={draftName} onChange={(event) => setDraftName(event.currentTarget.value)} placeholder="Ex.: Costa das Brumas" /><Button onClick={() => fileInput.current?.click()} busy={busy}><Plus size={17} aria-hidden="true" /> Escolher imagem</Button><small>PNG, JPG ou WebP · até 10 MB</small></div> : null}</div> : <div className={styles.mapLayout}>
      <aside className={styles.mapRail} aria-label="Mapas desta campanha"><div className={styles.railHeading}><strong>Atlas</strong><span>{maps.length}</span></div><ul>{maps.map((map, index) => <li key={String(map.id)}><button type="button" aria-current={selectedId === String(map.id) ? "true" : undefined} onClick={() => { setSelectedId(String(map.id)); setSelectedPinId(undefined); setEditingPinId(undefined); setPinCoordinate(undefined); setRenaming(false); }}><span className={styles.mapIndex}>{String(index + 1).padStart(2, "0")}</span><span><strong>{map.name}</strong><small>{map.pins.length} {map.pins.length === 1 ? "local" : "locais"}{canManage ? ` · ${audienceLabel(map, players)}` : ""}</small></span>{canManage ? (map.visibleTo?.length ? <Eye size={16} className={styles.railEye} aria-label="Compartilhado" /> : <EyeSlash size={16} className={styles.railEye} aria-label="Só o mestre" />) : null}</button></li>)}</ul><p className={styles.railNote}>{canManage ? "Mapas começam visíveis só para você." : "Mapas liberados pelo mestre."}</p></aside>
      <div className={styles.mapStage}>
        {selectedMap ? <><div className={styles.mapToolbar}><div><span className={styles.mapKicker}>MAPA ATUAL</span><h2>{selectedMap.name}</h2></div>{canManage ? <div className={styles.mapActions}>{publication ? <Button size="sm" variant={selectedMap.visibleTo?.length ? "secondary" : "primary"} disabled={cloudBusy} onClick={() => { setShareDraft((selectedMap.visibleTo ?? []) as readonly string[]); setShareOpen(true); }}>{selectedMap.visibleTo?.length ? <Eye size={16} aria-hidden="true" /> : <EyeSlash size={16} aria-hidden="true" />} {audienceLabel(selectedMap, players)}</Button> : null}<Button size="sm" variant="secondary" onClick={() => { setDraftName(selectedMap.name); setRenaming(true); }}><PencilSimple size={16} aria-hidden="true" /> Renomear</Button><Button size="sm" variant="ghost" onClick={() => void removeSelected()} disabled={busy}><Trash size={16} aria-hidden="true" /> Remover</Button></div> : null}</div><MapViewer compactHeading map={selectedMap} image={imageUrl && asset ? { src: imageUrl, width: asset.width, height: asset.height, alt: `Mapa ${selectedMap.name}` } : undefined} markers={markers} selectedMarkerId={selectedPinId} onMarkerSelect={setSelectedPinId} onMarkerEdit={canManage && updatePin ? editPin : undefined} onMarkerRemove={canManage && removePin ? (pinId) => void removeSelectedPin(pinId) : undefined} onAddMarker={canManage && addPin && imageUrl ? startNewPin : undefined} /><div className={styles.imageMeta}>{asset ? <span>{asset.width} × {asset.height} px · {formatBytes(asset.bytes.byteLength)}</span> : <span>Carregando imagem…</span>}{canManage && publication ? selectedMap.image ? <span className={styles.cloudOk}><CloudCheck size={16} aria-hidden="true" /> Imagem confirmada no Firebase{cloudBusy ? "" : <button type="button" className={styles.linkButton} onClick={() => void publishSelected()}>verificar</button>}</span> : <span className={styles.cloudPending}><CloudSlash size={16} aria-hidden="true" /> {cloudBusy ? "Enviando ao Firebase…" : publication.canPublish ? "Só neste aparelho" : "Entre na conta para enviar ao Firebase"}{publication.canPublish && !cloudBusy ? <button type="button" className={styles.linkButton} onClick={() => void publishSelected()}>enviar agora</button> : null}</span> : null}</div>
        <AppModal open={shareOpen} title="Quem vê este mapa" onClose={() => { if (!cloudBusy) setShareOpen(false); }}><div className={styles.shareForm}>
          <p>Jogadores só enxergam mapas liberados. A imagem é enviada ao Firebase antes de compartilhar.</p>
          <label className={styles.shareOption}><input type="radio" name="map-audience" checked={shareDraft.length === 0} onChange={() => setShareDraft([])} /><span><strong>Só o mestre</strong><small>Rascunho privado.</small></span></label>
          <label className={styles.shareOption}><input type="radio" name="map-audience" checked={shareDraft.includes("*")} onChange={() => setShareDraft(["*"])} /><span><strong>Todos os jogadores</strong><small>Inclui quem entrar depois.</small></span></label>
          {players.length > 0 ? <fieldset className={styles.sharePlayers}><legend>Ou jogadores específicos</legend>{players.map((player) => <label key={player.accountId}><input type="checkbox" checked={!shareDraft.includes("*") && shareDraft.includes(player.accountId)} onChange={(event) => { const checked = event.currentTarget.checked; setShareDraft((current) => { const base = current.filter((id) => id !== "*" && id !== player.accountId); return checked ? [...base, player.accountId] : base; }); }} /> {player.name}</label>)}</fieldset> : <p className={styles.shareHint}>Nenhum jogador ativo ainda; “Todos os jogadores” já vale para quem entrar.</p>}
          <div className={styles.shareActions}><Button variant="ghost" disabled={cloudBusy} onClick={() => setShareOpen(false)}>Cancelar</Button><Button busy={cloudBusy} disabled={cloudBusy} onClick={() => void saveAudience()}>{cloudBusy ? "Enviando…" : "Salvar visibilidade"}</Button></div>
        </div></AppModal><AppModal open={Boolean(pinCoordinate)} title={editingPinId ? "Editar local" : "Marcar local"} onClose={() => { setEditingPinId(undefined); setPinCoordinate(undefined); setPinName(""); }}><form className={styles.pinForm} onSubmit={(event) => void savePin(event)}><Input label="Nome do local" value={pinName} onChange={(event) => setPinName(event.currentTarget.value)} maxLength={80} required placeholder="Ex.: Entrada da masmorra" /><p>Posição: {Math.round((pinCoordinate?.x ?? 0) * 100)}% na horizontal · {Math.round((pinCoordinate?.y ?? 0) * 100)}% na vertical.</p><div><Button size="sm" type="submit" disabled={busy || !pinName.trim() || (editingPinId ? !updatePin : !addPin)}>{editingPinId ? "Salvar alterações" : "Salvar local"}</Button><Button size="sm" type="button" variant="ghost" disabled={busy} onClick={() => { setEditingPinId(undefined); setPinCoordinate(undefined); setPinName(""); }}>Cancelar</Button></div></form></AppModal></> : null}
      </div>
    </div>}
  </section>;
}
