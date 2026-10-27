import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Layout } from './Layout';
import { HomePage } from '../features/home/HomePage';
import { ExplorePage } from '../features/explore/ExplorePage';
import { CollectionPage } from '../features/collection/CollectionPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { SpeciesPage } from '../features/species/SpeciesPage';
import { CardPage } from '../features/cards/CardPage';
import { ObservationFormPage } from '../features/observations/ObservationFormPage';
import { ObservationPage } from '../features/observations/ObservationPage';
import { NotFoundPage } from './NotFoundPage';

const AboutPage = lazy(() => import('../features/profile/AboutPage'));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explorer" element={<ExplorePage />} />
        {/* Anciennes adresses : Découvrir et Map sont réunis dans Explorer. */}
        <Route path="decouvrir" element={<ToExplore />} />
        <Route path="carte" element={<ToExplore />} />
        <Route path="collection" element={<CollectionPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route
          path="a-propos"
          element={
            <Suspense fallback={<p className="p-6">Chargement…</p>}>
              <AboutPage />
            </Suspense>
          }
        />
        <Route path="especes/:speciesId" element={<SpeciesPage />} />
        <Route path="cartes/:speciesId" element={<CardPage />} />
        <Route path="observations/nouvelle" element={<FreshObservationForm />} />
        <Route path="observations/:observationId" element={<ObservationPage />} />
        <Route path="observations/:observationId/modifier" element={<ObservationFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** Chaque ouverture de « nouvelle observation » repart d'un formulaire vierge, même depuis le formulaire. */
function FreshObservationForm() {
  return <ObservationFormPage key={useLocation().key} />;
}

function ToExplore() {
  const { search } = useLocation();
  return <Navigate to={`/explorer${search}`} replace />;
}
