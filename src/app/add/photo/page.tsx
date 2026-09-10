import { ScreenHeader } from '@/components/ScreenHeader';
import { PhotoFlow } from './PhotoFlow';

export default function PhotoPage() {
  return (
    <>
      <ScreenHeader
        title="Photo"
        subtitle="Le modèle nomme les aliments, il n’estime aucune quantité."
      />
      <PhotoFlow />
    </>
  );
}
