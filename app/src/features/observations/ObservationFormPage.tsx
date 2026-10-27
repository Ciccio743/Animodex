import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import type { PickedFilesState } from '../../app/AddSheet';
import { Camera, ChevronLeft, ChevronRight, Clock, History, ImagePlus, MapPin, PawPrint, ShieldCheck, Trash2, Eye } from 'lucide-react';
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
import { formatDateTime, toLocalInputValue } from '../../utils/format';
import { SpeciesPicker } from './SpeciesPicker';
import { LocationPicker, type LatLng, type PickedPrecision } from './LocationPicker';
import { displayName } from '../../domain/models';
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
  // Nouvelle observation guidée en 3 étapes : l'animal, une photo (facultative), puis la vérification.
  const handed = !!(useLocation().state as PickedFilesState | null)?.files?.length;
  const [step, setStep] = useState<0 | 1 | 2>(() => (initialSpecies || initialTaxon ? (handed ? 2 : 1) : 0));
  const [showWhere, setShowWhere] = useState(false);
  const [showWhen, setShowWhen] = useState(params.get('passe') === '1');
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
      else if (res.finishNew) navigate(`/cartes/${res.observation.speciesId}?finition=${res.finishDrawn}`, { replace: true });
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

  if (!editing) {
    const sp = knownSpecies ? speciesById.get(knownSpecies) : undefined;
    const photoCount = pending.length;
    const goNext = () => setStep((st) => (st === 0 && handed ? 2 : ((st + 1) as 0 | 1 | 2)));
    const goBack = () => (step === 0 ? navigate(-1) : setStep((st) => (st === 2 && handed ? 0 : ((st - 1) as 0 | 1 | 2))));
    const row = 'flex items-center gap-3 rounded-2xl bg-white/5 p-3';
    const change = 'btn btn-ghost min-h-10 shrink-0 px-3 text-sm text-moss-300';
    const animalBanner = (
      <div className={row}>
        <PawPrint className="shrink-0 text-moss-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold" data-testid="selected-species">
            {sp ? displayName(sp) : 'Animal à identifier'}
          </div>
          {alreadyKnown && <div className="text-xs text-moss-300">Déjà dans ta collection : une rencontre de plus !</div>}
        </div>
        <button type="button" className={change} onClick={() => setStep(0)}>
          Changer
        </button>
      </div>
    );
    const photoInputs = (
      <>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void addFiles(e.target.files, 'camera')} />
        <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label="Importer des photos" data-testid="photo-input" onChange={(e) => void addFiles(e.target.files, 'import')} />
      </>
    );
    const whereText = position
      ? !manualPosition.current && fix
        ? `Ta position actuelle (±${fix.accuracyM} m)`
        : 'Point placé sur la carte'
      : geoStatus === 'waiting'
        ? 'Recherche de ta position…'
        : 'Pas de lieu (facultatif)';

    return (
      <form
        onSubmit={(e) => {
          if (step === 2) return void onSubmit(e);
          e.preventDefault(); // Entrée dans une recherche ne doit pas enregistrer avant la fin.
        }}
        className="flex flex-col gap-5 animate-fade-up"
        noValidate
      >
        <header className="no-print flex items-center gap-2 pt-2">
          <button type="button" className="btn btn-ghost -ml-3 px-3" onClick={goBack} aria-label="Retour">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-moss-300">
              Étape {step + 1} sur 3
              {past && (
                <span className="ml-2 rounded-full bg-violet-400/20 px-2 py-0.5 normal-case text-violet-200" data-testid="past-mode">
                  Rencontre passée
                </span>
              )}
            </p>
            <h1 className="font-display text-[1.75rem] font-bold leading-tight">{['Quel animal as-tu vu ?', 'Une photo ?', 'C’est tout bon ?'][step]}</h1>
          </div>
        </header>
        <div className="-mt-3 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-moss-300' : 'bg-white/10'}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            {photoCount > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {pending.map((p) => (
                  <img key={p.key} src={p.url} alt="Photo ajoutée" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
            <SpeciesPicker
              value={knownSpecies}
              onChange={(id) => {
                setSpeciesId(id);
                if (id) goNext();
              }}
            />
            <div className="flex flex-col gap-2">
              {knownSpecies && (
                <button type="button" className="btn btn-primary min-h-14 text-lg" onClick={goNext}>
                  Continuer <ChevronRight aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSpeciesId(undefined);
                  goNext();
                }}
              >
                Je ne sais pas encore
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            {animalBanner}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-secondary min-h-24 flex-col gap-1" onClick={() => cameraRef.current?.click()}>
                <Camera size={28} aria-hidden="true" /> Prendre une photo
              </button>
              <button type="button" className="btn btn-secondary min-h-24 flex-col gap-1" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={28} aria-hidden="true" /> Choisir une photo
              </button>
            </div>
            {photoInputs}
            {photoCount > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {pending.map((p) => (
                  <PhotoTile key={p.key} url={p.url} onRemove={() => setPending((x) => x.filter((y) => y.key !== p.key))} />
                ))}
              </div>
            )}
            <button type="button" className={`btn min-h-14 text-lg ${photoCount > 0 ? 'btn-primary' : 'btn-secondary'}`} onClick={goNext}>
              {photoCount > 0 ? 'Continuer' : 'Passer'} <ChevronRight aria-hidden="true" />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {animalBanner}
            <div className={row}>
              <Camera className="shrink-0 text-sky-300" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">{photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'Pas de photo'}</div>
              {photoCount > 0 && (
                <img src={pending[0].url} alt="Photo ajoutée" className="h-10 w-10 rounded-lg object-cover" />
              )}
              <button type="button" className={change} onClick={() => setStep(1)}>
                {photoCount > 0 ? 'Changer' : 'Ajouter'}
              </button>
            </div>

            <div className={row}>
              <MapPin className="shrink-0 text-amber-300" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm" data-testid="where-summary">
                {whereText}
              </div>
              <button type="button" className={change} onClick={() => setShowWhere((v) => !v)} aria-expanded={showWhere}>
                {showWhere ? 'Fermer' : position ? 'Changer' : 'Placer'}
              </button>
            </div>
            {showWhere && (
              <LocationPicker
                value={position}
                onChange={(v) => {
                  manualPosition.current = true;
                  setPosition(v);
                }}
                me={fix}
                following={!manualPosition.current && !!fix}
                geoMessage={geoStatus !== 'ok' && geoStatus !== 'off' ? GEO_STATUS_TEXT[geoStatus] : undefined}
                startOpen
                precision={precision}
                onPrecision={setPrecision}
                sensitive={sp?.sensitive}
              />
            )}

            <div className={row}>
              <Clock className="shrink-0 text-violet-300" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">{Math.abs(Date.now() - new Date(observedAt).getTime()) < 10 * 60_000 ? 'Maintenant' : formatDateTime(new Date(observedAt).toISOString())}</div>
              <button type="button" className={change} onClick={() => setShowWhen((v) => !v)} aria-expanded={showWhen}>
                {showWhen ? 'Fermer' : 'Changer'}
              </button>
            </div>
            {showWhen && dateField}

            <details className="rounded-2xl bg-white/5 p-3">
              <summary className="cursor-pointer text-sm font-semibold">Ajouter des détails (facultatif)</summary>
              <div className="mt-3 flex flex-col gap-4">
                {knownSpecies && (
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" className="h-5 w-5 accent-moss-500" checked={status === 'uncertain'} onChange={(e) => setStatus(e.target.checked ? 'uncertain' : 'confirmed')} />
                    Je ne suis pas sûr de l’espèce
                  </label>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Nom du lieu (facultatif)</span>
                  <input type="text" className="field" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Ex. : étang du parc, jardin…" maxLength={200} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Notes (facultatif)</span>
                  <textarea className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ce que l’animal faisait, la météo…" maxLength={5000} />
                </label>
              </div>
            </details>

            {errors.length > 0 && (
              <div role="alert" className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-100 ring-1 ring-red-400/30">
                {errors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            )}
            {/* Toujours visible au-dessus de la barre du bas : pas besoin de descendre pour enregistrer. */}
            <div className="sticky bottom-[calc(3.75rem+var(--safe-bottom))] z-[1000] -mx-4 bg-gradient-to-t from-night-950 via-night-950/95 to-transparent px-4 pb-8 pt-4">
              <button type="submit" className="btn btn-primary min-h-14 w-full text-lg shadow-[0_6px_20px_rgb(0_0_0_/_0.5)]" disabled={busy || !db}>
                {busy ? 'Enregistrement…' : 'Enregistrer l’observation'}
              </button>
            </div>
          </>
        )}
        {step !== 2 && errors.length > 0 && (
          <div role="alert" className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-100 ring-1 ring-red-400/30">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5 animate-fade-up" noValidate>
      <PageHeader back title={editing ? 'Modifier l’observation' : 'Nouvelle observation'} subtitle="Une rencontre réelle avec un animal, à une date donnée." />

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
