import { toPng } from 'html-to-image';
import { downloadBlob } from './download';

/** Exporte le nœud DOM d'une carte (et lui seul) en PNG haute résolution. */
export async function exportCardPng(node: HTMLElement, filename: string): Promise<void> {
  await document.fonts?.ready;
  const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true, backgroundColor: 'transparent' });
  const blob = await (await fetch(dataUrl)).blob();
  downloadBlob(blob, filename);
}
