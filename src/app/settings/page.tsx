import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';

export default function SettingsPage() {
  return (
    <>
      <ScreenHeader title="Réglages" />
      <EmptyState>Rien à régler pour l&apos;instant.</EmptyState>
    </>
  );
}
