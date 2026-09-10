import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatRelativeJournalDate, todayInParis } from '@/lib/date';

export default function JournalPage() {
  const today = todayInParis();
  return (
    <>
      <ScreenHeader title="Journal" subtitle={formatRelativeJournalDate(today)} />
      <EmptyState>Aucune entrée aujourd&apos;hui.</EmptyState>
    </>
  );
}
