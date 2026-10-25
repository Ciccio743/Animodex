import { PageHeader } from '../../components/PageHeader';
import { SAFETY_TIPS } from '../home/safetyTips';
import { SURPRISE_WEIGHTS, HP_RANGES } from '../../domain/gameConfig';
import { RARITY_LABELS } from '../../domain/labels';
import { RARITIES } from '../../domain/models';

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <PageHeader back title="À propos" subtitle={`Animodex version ${__APP_VERSION__}`} />
      <section className="surface p-4 text-sm">
        <h2 className="mb-2 font-display text-lg font-semibold">Règle d’or</h2>
        <p>On ne capture jamais les animaux : on capture le souvenir de leur découverte.</p>
        <ul className="mt-2 list-disc pl-5 text-white/80">
          {SAFETY_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section className="surface p-4 text-sm">
        <h2 className="mb-2 font-display text-lg font-semibold">Données naturalistes</h2>
        <p>
          Animodex ne contient aucune fiche écrite à la main. Les espèces viennent d’iNaturalist (taxonomie, noms, statut de conservation, photos), du résumé Wikipédia
          (CC BY-SA) et de GBIF. Chaque fiche indique sa source et sa date. Les données que la source ne fournit pas sont affichées « Donnée non disponible ».
        </p>
        <p className="mt-2">
          Les photos de référence sont publiées par leurs auteurs sous licence Creative Commons : l’auteur et la licence sont toujours affichés. Ta propre photo passe
          toujours en premier sur la carte.
        </p>
      </section>
      <section className="surface p-4 text-sm">
        <h2 className="mb-2 font-display text-lg font-semibold">Règles du jeu</h2>
        <p>La rareté Animodex est un classement ludique, distinct du statut de conservation. Les PV et capacités sont fictifs.</p>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-white/60">
            <tr>
              <th className="py-1">Rareté</th>
              <th>PV</th>
              <th>Poids surprise</th>
            </tr>
          </thead>
          <tbody>
            {RARITIES.map((r) => (
              <tr key={r}>
                <td className="py-1">{RARITY_LABELS[r]}</td>
                <td>
                  {HP_RANGES[r].min}–{HP_RANGES[r].max}
                </td>
                <td>{SURPRISE_WEIGHTS[r]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="surface p-4 text-sm">
        <h2 className="mb-2 font-display text-lg font-semibold">Licences</h2>
        <p>Polices Inter et Fraunces (SIL Open Font License), icônes Lucide (ISC). Animodex est une création originale, sans lien avec une autre franchise de jeu.</p>
      </section>
    </div>
  );
}
