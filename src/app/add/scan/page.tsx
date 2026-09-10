import { ScreenHeader } from '@/components/ScreenHeader';
import { ScanFlow } from './ScanFlow';

export default function ScanPage() {
  return (
    <>
      <ScreenHeader title="Scanner" subtitle="Présente le code-barres au cadre." />
      <ScanFlow />
    </>
  );
}
