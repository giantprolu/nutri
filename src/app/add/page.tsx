import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';

export default function AddPage() {
  return (
    <>
      <ScreenHeader title="Ajouter" />
      <EmptyState>Les modes d&apos;ajout arrivent avec les prochaines stories.</EmptyState>
    </>
  );
}
