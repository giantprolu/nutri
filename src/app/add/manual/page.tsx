import { ScreenHeader } from '@/components/ScreenHeader';
import { ManualEntryFlow } from './ManualEntryFlow';

export default function ManualAddPage() {
  return (
    <>
      <ScreenHeader
        title="Saisir à la main"
        subtitle="Rien n’est ajouté aux tables de référence."
      />
      <ManualEntryFlow />
    </>
  );
}
