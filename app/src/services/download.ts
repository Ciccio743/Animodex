/** Déclenche le téléchargement d'un fichier généré localement. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function dateStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
