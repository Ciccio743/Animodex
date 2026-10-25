import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { useData } from '../../hooks/useData';
import {
  applyImport,
  buildBackup,
  markBackupDone,
  observationsToCsv,
  parseBackup,
  previewImport,
  resetAllData,
  type BackupFile,
  type ImportMode,
  type ImportPreview,
} from '../../services/backupService';
import { dateStamp, downloadBlob } from '../../services/download';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDateTime } from '../../utils/format';

export function BackupSection() {
  const { db, observations, lastBackupAt, speciesById } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string }>();
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<{ backup: BackupFile; preview: ImportPreview; fileName: string }>();
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onExport() {
    if (!db) return;
    setBusy(true);
    try {
      const backup = await buildBackup(db);
      downloadBlob(new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' }), `animodex-sauvegarde-${dateStamp()}.json`);
      await markBackupDone(db);
      setMessage({ tone: 'ok', text: `Sauvegarde générée : ${backup.data.observations.length} observations, ${backup.data.photos.length} photos.` });
    } catch (e) {
      setMessage({ tone: 'error', text: `Export impossible : ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  }

  function onCsv() {
    downloadBlob(new Blob(['﻿' + observationsToCsv(observations, speciesById)], { type: 'text/csv;charset=utf-8' }), `animodex-observations-${dateStamp()}.csv`);
  }

  // Fichier choisi avant l'ouverture de la base (page juste chargée) : la prévisualisation attend la base.
  const [parsedFile, setParsedFile] = useState<{ backup: BackupFile; fileName: string }>();
  useEffect(() => {
    if (!db || !parsedFile) return;
    let cancelled = false;
    void previewImport(db, parsedFile.backup).then((preview) => {
      if (!cancelled) setPending({ ...parsedFile, preview });
    });
    return () => {
      cancelled = true;
    };
  }, [db, parsedFile]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(undefined);
    setErrors([]);
    setPending(undefined);
    setParsedFile(undefined);
    const parsed = parseBackup(await file.text());
    if (!parsed.ok || !parsed.backup) {
      setErrors(parsed.errors);
      return;
    }
    setParsedFile({ backup: parsed.backup, fileName: file.name });
  }

  async function onImport(mode: ImportMode) {
    if (!db || !pending) return;
    setBusy(true);
    setConfirmReplace(false);
    try {
      await applyImport(db, pending.backup, mode);
      setMessage({ tone: 'ok', text: mode === 'merge' ? 'Sauvegarde fusionnée avec ta collection.' : 'Collection remplacée par la sauvegarde.' });
      setPending(undefined);
      setParsedFile(undefined);
    } catch (e) {
      setMessage({ tone: 'error', text: `Import annulé, aucune donnée modifiée : ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onReset() {
    if (!db) return;
    setConfirmReset(false);
    await resetAllData(db);
    setMessage({ tone: 'ok', text: 'Toutes les données de cet appareil ont été effacées.' });
  }

  const p = pending?.preview;
  return (
    <section className="surface flex flex-col gap-3 p-4" aria-labelledby="backup-title">
      <h2 id="backup-title" className="font-display text-lg font-semibold">
        Sauvegarde
      </h2>
      <p className="text-sm text-white/70">
        Ta collection est stockée uniquement sur cet appareil. Exporte-la régulièrement pour ne rien perdre en changeant de téléphone ou de navigateur.
      </p>
      <p className="text-xs text-white/60" data-testid="last-backup">
        Dernière sauvegarde : {lastBackupAt ? formatDateTime(lastBackupAt) : 'jamais'}
      </p>
      <button type="button" className="btn btn-primary" onClick={() => void onExport()} disabled={busy || !db}>
        <Download size={18} aria-hidden="true" /> Exporter toutes mes données (JSON)
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-secondary text-sm" onClick={onCsv} disabled={observations.length === 0}>
          <FileSpreadsheet size={18} aria-hidden="true" /> Observations (CSV)
        </button>
        <button type="button" className="btn btn-secondary text-sm" onClick={() => fileRef.current?.click()} disabled={busy || !db}>
          <Upload size={18} aria-hidden="true" /> Importer
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Fichier de sauvegarde" data-testid="backup-input" onChange={(e) => void onFile(e.target.files?.[0])} />

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm text-red-100 ring-1 ring-red-400/30">
          <p className="font-semibold">Fichier refusé — tes données n’ont pas été modifiées.</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {pending && p && (
        <div className="rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10" data-testid="import-preview">
          <p className="font-semibold">Aperçu de « {pending.fileName} »</p>
          <p className="text-xs text-white/60">Sauvegarde du {formatDateTime(p.exportedAt)}</p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Observations : {p.observations.added} nouvelle{p.observations.added > 1 ? 's' : ''}, {p.observations.updated} plus récente{p.observations.updated > 1 ? 's' : ''} dans le
              fichier, {p.observations.unchanged} identique{p.observations.unchanged > 1 ? 's' : ''}
              {p.observations.keptLocal > 0 && `, ${p.observations.keptLocal} plus récente(s) sur l’appareil (conservées)`}
            </li>
            <li>
              Catalogue : {p.species.added} espèce{p.species.added > 1 ? 's' : ''} nouvelle{p.species.added > 1 ? 's' : ''}, {p.species.existing} déjà présente{p.species.existing > 1 ? 's' : ''}
            </li>
            <li>
              Cartes : {p.cards.added} nouvelle{p.cards.added > 1 ? 's' : ''}, {p.cards.existing} déjà présente{p.cards.existing > 1 ? 's' : ''}
            </li>
            <li>Photos : {p.photos.added} nouvelle{p.photos.added > 1 ? 's' : ''}</li>
          </ul>
          <p className="mt-2 text-xs text-white/60">
            Actuellement sur l’appareil : {p.current.observations} observations, {p.current.cards} cartes, {p.current.photos} photos.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-primary text-sm" onClick={() => void onImport('merge')} disabled={busy}>
              Fusionner
            </button>
            <button type="button" className="btn btn-secondary text-sm" onClick={() => setConfirmReplace(true)} disabled={busy}>
              Remplacer…
            </button>
          </div>
          <button type="button" className="btn btn-ghost mt-1 w-full text-sm" onClick={() => { setPending(undefined); setParsedFile(undefined); }}>
            Annuler
          </button>
        </div>
      )}

      {message && (
        <p role="status" className={`text-sm ${message.tone === 'ok' ? 'text-moss-300' : 'text-red-300'}`}>
          {message.text}
        </p>
      )}

      <button type="button" className="btn btn-ghost mt-2 text-sm text-red-300" onClick={() => setConfirmReset(true)}>
        <Trash2 size={16} aria-hidden="true" /> Effacer toutes mes données
      </button>

      <ConfirmDialog
        open={confirmReplace}
        title="Remplacer toute la collection ?"
        confirmLabel="Remplacer"
        danger
        requireText="REMPLACER"
        onCancel={() => setConfirmReplace(false)}
        onConfirm={() => void onImport('replace')}
      >
        Les {p?.current.observations ?? 0} observations actuelles seront remplacées par celles du fichier. Pense à exporter d’abord ta collection actuelle.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmReset}
        title="Effacer toutes les données ?"
        confirmLabel="Tout effacer"
        danger
        requireText="EFFACER"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void onReset()}
      >
        Observations, photos, cartes et réglages seront supprimés définitivement de cet appareil. Cette action est irréversible.
      </ConfirmDialog>
    </section>
  );
}
