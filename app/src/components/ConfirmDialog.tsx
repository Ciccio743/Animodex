import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Boîte de confirmation modale. `requireText` impose de taper un mot pour les actions destructrices. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  requireText,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setTyped('');
      d.showModal?.();
      if (!d.showModal) d.setAttribute('open', '');
    }
    if (!open && d.open) d.close?.();
  }, [open]);
  if (!open) return null;
  const blocked = requireText !== undefined && typed.trim().toUpperCase() !== requireText;
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,420px)] rounded-3xl border border-white/15 bg-night-800 p-6 text-white backdrop:bg-black/70"
    >
      <h2 id="confirm-title" className="font-display text-xl font-bold">
        {title}
      </h2>
      <div className="mt-3 text-sm text-white/80">{children}</div>
      {requireText && (
        <label className="mt-4 block text-sm">
          Tape <b>{requireText}</b> pour confirmer
          <input className="field mt-2" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={blocked} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
