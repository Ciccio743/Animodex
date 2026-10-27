import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import type { PickedFilesState } from '../../app/AddSheet';
import { Camera, History, ImagePlus, ShieldCheck, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Notice } from '../../components/Notice';
import { useData, usePhotoUrl } from '../../hooks/useData';
import { ensureSpecies } from '../../services/catalogService';
import { apiErrorMessage } from '../../services/sources/http';
import type { IdentificationStatus } from '../../domain/models';
import { STATUS_LABELS } from '../../domain/labels';
import { isSpeciesKnown } from '../../domain/progress';
import { createObservation, ObservationValidationError, updateObservation, type NewPhoto } from '../../services/observationService';
import { processPhoto } from '../../services/photoProcessing';
import { toLocalInputValue } from '../../utils/format';
import { SpeciesPicker } from './SpeciesPicker';
import { LocationPicker, type LatLng, type PickedPrecision } from './LocationPicker';
import { GEO_STATUS_TEXT, useGeolocation } from '../../hooks/useGeolocation';
import { NotFoundPage } from '../../app/NotFoundPage';

interface PendingPhoto {
  key: string;
  photo: NewPhoto;
  url: string;
}

const STATUSES: { value: IdentificationStatus; help: string }[] = [
  { value: 'confirmed', help: 'Je suis sûr de l’espèce. Débloque la carte.' },
  { value: 'uncertain', help: 'Je crois que c’est elle, mais j’ai un doute.' },
  { value: 'to_identify', help: 'Je ne sais pas encore quel animal c’est.' },
];

export function ObservationFormPage() {
  const { observationId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { db, observations, status: loadStatus, speciesById, settings } = useData();
  const existing = observationId ? observations.find((o) => o.id === observationId) : undefined;
  const editing = !!observationId;

  const initialSpecies = params.get('species');
  const initialTaxon = params.get('taxon');
  const [speciesId, setSpeciesId] = useState<string | undefined>(initialSpecies ?? undefined);
  const [status, setStatus] = useState<IdentificationStatus>('confirmed');
  const [observedAt, setObservedAt] = useState(() => toLocalInputValue(new Date()));
  const [locationLabel, setLocationLabel] = useState('');
  const [position, setPosition] = useState<LatLng>();
  const [precision, setPrecision] = useState<PickedPrecision>(
    params.get('passe') === '1' || settings.defaultLocationPrecision === 'approximate' ? 'approximate' : 'exact',
  );
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Nouvelle observation : la position du téléphone est placée d'office et suivie
  // tant que l'utilisateur ne déplace pas le point lui-même.
  // « Rencontre passée » : pas de GPS, date à choisir, lieu approximatif posé à la main.
  const [when, setWhen] = useState<'now' | 'past'>(params.get('passe') === '1' ? 'past' : 'now');
  const past = !editing && when === 'past';
  const { fix, status: geoStatus } = useGeolocation(settings.autoLocate && !editing && !past);
  const manualPosition = useRef(false);
  function switchMode(next: 'now' | 'past') {
    if (next === when) return;
    setWhen(next);
    manualPosition.current = false;
    setPosition(undefined);
    setPrecision(next === 'past' ? 'approximate' : 'exact');
  }
  useEffect(() => {
    if (fix && !manualPosition.current) setPosition({ lat: fix.lat, lng: fix.lng });
  }, [fix]);
  // Photos choisies depuis le bouton « + » (appareil photo ou galerie).
  const location = useLocation();
  const handedFiles = useRef(false);
  useEffect(() => {
    const st = location.state as PickedFilesState | null;
    if (handedFiles.current || !st?.files?.length) return;
    handedFiles.current = true;
    void addFiles(st.files, st.source);
    // Oublie les fichiers transmis (sans recharger la page) pour ne pas les rajouter après un rechargement.
    window.history.replaceState({ ...window.history.state, usr: null }, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedFor = useRef<string>(undefined);

  useEffect(() => {
    if (!existing || loadedFor.current === existing.id) return;
    loadedFor.current = existing.id;
    setSpeciesId(existing.speciesId);
    setStatus(existing.identificationStatus);
    setObservedAt(toLocalInputValue(new Date(existing.observedAt)));
    setLocationLabel(existing.locationLabel ?? '');
    if (existing.latitude !== undefined && existing.longitude !== undefined) setPosition({ lat: existing.latitude, lng: existing.longitude });
    if (existing.locationPrecision !== 'none') setPrecision(existing.locationPrecision);
    setNotes(existing.notes ?? '');
  }, [existing]);

  // Lien depuis une suggestion (?taxon=) : la fiche rejoint le catalogue local avant l'observation.
  useEffect(() => {
    if (!db || !initialTaxon || !/^\d+$/.test(initialTaxon)) return;
    ensureSpecies(db, Number(initialTaxon))
      .then(({ species }) => setSpeciesId(species.id))
      .catch((e) => setErrors([apiErrorMessage(e)]));
  }, [db, initialTaxon]);

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.url)), [pending]);

  const alreadyKnown = useMemo(
    () => !!speciesId && isSpeciesKnown(speciesId, observations.filter((o) => o.id !== observationId)),
    [speciesId, observations, observationId],
  );

  if (editing && loadStatus === 'ready' && !existing) return <NotFoundPage />;
  const knownSpecies = speciesId && speciesById.has(speciesId) ? speciesId : undefined;

  async function addFiles(files: FileList | File[] | null, source: NewPhoto['source']) {
    if (!files) return;
    setErrors([]);
    for (const file of Array.from(files)) {
      try {
        const photo = await processPhoto(file, source);
        setPending((p) => [...p, { key: crypto.randomUUID(), photo, url: URL.createObjectURL(photo.thumbBlob) }]);
      } catch (e) {
        setErrors((x) => [...x, `${file.name} : ${e instanceof Error ? e.message : 'photo illisible'}`]);
      }
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    setErrors([]);
    const input = {
      speciesId: knownSpecies,
      identificationStatus: knownSpecies ? status : 'to_identify',
      observedAt: new Date(observedAt).toISOString(),
      locationLabel,
      ...(position ? { latitude: position.lat, longitude: position.lng, locationPrecision: precision } : { locationPrecision: 'none' as const }),
      notes,
    } as const;
    try {
      const res =
        editing && existing
          ? await updateObservation(db, existing.id, input, { addPhotos: pending.map((p) => p.photo), removePhotoIds: removed })
          : await createObservation(db, input, pending.map((p) => p.photo));
      // Demande au navigateur de protéger le stockage local (utile sur iOS), sans bloquer.
      void navigator.storage?.persist?.().catch(() => undefined);
      if (res.cardCreated) navigate(`/cartes/${res.observation.speciesId}?nouvelle=1&finition=${res.finishDrawn}`, { replace: true });
      else if (res.finishUpgraded) navigate(`/cartes/${res.observation.speciesId}?finition=${res.finishDrawn}`, { replace: true });
      else navigate(`/observations/${res.observation.id}`, { replace: true });
    } catch (err) {
      setErrors(err instanceof ObservationValidationError ? err.issues.map((i) => i.message) : [err instanceof Error ? err.message : 'Enregistrement impossible']);
      setBusy(false);
    }
  }

  const dateField = (
    <label className="flex flex-col gap-1">
      <span className="font-semibold">{past ? 'Quand l’as-tu vu ?' : 'Date et heure'}</span>
      <input type="datetime-local" className="field" data-testid="observed-at" value={observedAt} max={toLocalInputValue(new Date())} onChange={(e) => setObservedAt(e.target.value)} required />
    </label>
  );

  const keptPhotoIds = existing?.photoIds.filter((id) => !removed.includes(id)) ?? [];

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5 animate-fade-up" noValidate>
      <PageHeader back title={editing ? 'Modifier l’observation' : 'Nouvelle observation'} subtitle="Une rencontre réelle avec un animal, à une date donnée." />

      {!editing && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Quand ?">
          {(
            [
              ['now', Eye, 'Je le vois maintenant'],
              ['past', History, 'Rencontre passée'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={when === value}
              onClick={() => switchMode(value)}
              className={`btn min-h-14 px-2 text-sm leading-tight ${when === value ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Icon size={18} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      )}
      {past && (
        <>
          <Notice>Ajoute un animal déjà rencontré : choisis la date, puis place l’endroit sur la carte (cherche le lieu ou touche la carte).</Notice>
          {dateField}
        </>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">Photo (facultative)</legend>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => cameraRef.current?.click()} autoFocus={params.get('photo') === '1'}>
            <Camera size={18} aria-hidden="true" /> Prendre une photo
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={18} aria-hidden="true" /> Importer
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void addFiles(e.target.files, 'camera')} />
        <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label="Importer des photos" data-testid="photo-input" onChange={(e) => void addFiles(e.target.files, 'import')} />
        {(keptPhotoIds.length > 0 || pending.length > 0) && (
          <div className="grid grid-cols-3 gap-2">
            {keptPhotoIds.map((id) => (
              <ExistingPhoto key={id} id={id} onRemove={() => setRemoved((r) => [...r, id])} />
            ))}
            {pending.map((p) => (
              <PhotoTile key={p.key} url={p.url} onRemove={() => setPending((x) => x.filter((y) => y.key !== p.key))} />
            ))}
          </div>
        )}
        <p className="text-xs text-white/50">Les photos sont réduites et gardées uniquement sur cet appareil. Leur position GPS éventuelle est retirée.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Quel animal ?</legend>
        <SpeciesPicker value={knownSpecies} onChange={setSpeciesId} />
        {alreadyKnown && <p className="text-sm text-moss-300">Tu connais déjà cette espèce : cette rencontre enrichira son historique.</p>}
      </fieldset>

      {knownSpecies && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Identification</legend>
          {STATUSES.map((s) => (
            <label key={s.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ${status === s.value ? 'bg-white/10 ring-moss-300/60' : 'ring-white/10'}`}>
              <input type="radio" name="status" className="mt-1 h-5 w-5 accent-moss-500" checked={status === s.value} onChange={() => setStatus(s.value)} />
              <span>
                <span className="block font-medium">{STATUS_LABELS[s.value]}</span>
                <span className="block text-xs text-white/60">{s.help}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {!knownSpecies && <Notice>Sans espèce choisie, l’observation sera enregistrée « À identifier ». Tu pourras la compléter plus tard.</Notice>}

      {!past && dateField}

<LocationPicker
        value={position}
        onChange={(v) => {
          manualPosition.current = true;
          setPosition(v);
        }}
        me={fix}
        following={!manualPosition.current && !!fix}
        geoMessage={geoStatus !== 'ok' && geoStatus !== 'off' ? GEO_STATUS_TEXT[geoStatus] : undefined}
        startOpen={past}
        precision={precision}
        onPrecision={setPrecision} sensitive={knownSpecies ? speciesById.get(knownSpecies)?.sensitive : false} />

      <label className="flex flex-col gap-1">
        <span className="font-semibold">Nom du lieu (facultatif)</span>
        <input type="text" className="field" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Ex. : étang du parc, jardin…" maxLength={200} />
        <span className="text-xs text-white/50">Privé, reste sur cet appareil. Évite d’écrire ton adresse.</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">Notes (facultatif)</span>
        <textarea className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ce que l’animal faisait, la météo…" maxLength={5000} />
      </label>

      <p className="flex items-start gap-2 text-sm text-white/70">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-moss-300" aria-hidden="true" /> Observe sans toucher, sans nourrir et sans t’approcher : le souvenir suffit.
      </p>

      {errors.length > 0 && (
        <div role="alert" className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-100 ring-1 ring-red-400/30">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      <button type="submit" className="btn btn-primary min-h-14 text-lg" disabled={busy || !db}>
        {busy ? 'Enregistrement…' : editing ? 'Enregistrer les modifications' : 'Enregistrer l’observation'}
      </button>
    </form>
  );
}

function PhotoTile({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="relative">
      <img src={url} alt="Photo ajoutée" className="aspect-square w-full rounded-xl object-cover" />
      <button type="button" onClick={onRemove} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-black/70" aria-label="Retirer cette photo">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function ExistingPhoto({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = usePhotoUrl(id);
  return url ? <PhotoTile url={url} onRemove={onRemove} /> : <div className="aspect-square rounded-xl bg-white/5" />;
}
