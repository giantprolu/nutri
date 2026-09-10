import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchFlow } from './SearchFlow';

export default function SearchPage() {
  return (
    <>
      <ScreenHeader title="Rechercher" subtitle="Les accents ne comptent pas." />
      <SearchFlow />
    </>
  );
}
