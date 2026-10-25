import { Search } from 'lucide-react';
import { ANIMODEX_TYPES, RARITIES, TAXON_GROUPS } from '../../domain/models';
import { GROUP_LABELS, RARITY_LABELS, TYPE_LABELS } from '../../domain/labels';
import type { SpeciesFilter } from '../../domain/discovery';

/** Barre de filtres partagée par Découvrir et Collection. */
export function SpeciesFilters({
  value,
  onChange,
  withRarity = false,
  withType = true,
}: {
  value: SpeciesFilter;
  onChange: (f: SpeciesFilter) => void;
  withRarity?: boolean;
  withType?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Rechercher une espèce</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
        <input
          type="search"
          className="field pl-10"
          placeholder="Rechercher : héron, Ardea…"
          value={value.query ?? ''}
          onChange={(e) => onChange({ ...value, query: e.target.value || undefined })}
        />
      </label>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrer par groupe">
        <button type="button" className="chip" aria-pressed={!value.group} onClick={() => onChange({ ...value, group: undefined })}>
          Tous
        </button>
        {TAXON_GROUPS.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={value.group === g} onClick={() => onChange({ ...value, group: value.group === g ? undefined : g })}>
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>
      {(withType || withRarity) && (
      <div className={`grid gap-2 ${withRarity && withType ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {withType && (
        <label className="text-xs text-white/70">
          Type Animodex
          <select className="field mt-1 min-h-11 text-sm" value={value.type ?? ''} onChange={(e) => onChange({ ...value, type: (e.target.value || undefined) as SpeciesFilter['type'] })}>
            <option value="">Tous</option>
            {ANIMODEX_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        )}
        {withRarity && (
          <label className="text-xs text-white/70">
            Rareté
            <select className="field mt-1 min-h-11 text-sm" value={value.rarity ?? ''} onChange={(e) => onChange({ ...value, rarity: (e.target.value || undefined) as SpeciesFilter['rarity'] })}>
              <option value="">Toutes</option>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {RARITY_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      )}
    </div>
  );
}
