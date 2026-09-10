import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';

export default function HistoryPage() {
  return (
    <>
      <ScreenHeader title="Historique" />
      <EmptyState>Rien d&apos;enregistré pour l&apos;instant.</EmptyState>
    </>
  );
}
