import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <div className="pt-10">
      <EmptyState icon={Compass} title="Cette page n’existe pas">
        <Link to="/" className="btn btn-secondary mt-3">
          Retour à l’accueil
        </Link>
      </EmptyState>
    </div>
  );
}
