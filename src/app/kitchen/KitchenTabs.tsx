import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Les deux faces de la Cuisine, la semaine et les recettes.
 *
 * Ce sont deux adresses et non deux états d'un même écran : chaque onglet est
 * un lien, qui s'ouvre dans un nouvel onglet et survit à un rechargement.
 */
export function KitchenTabs({
  current,
  weekHref = '/kitchen',
}: {
  current: 'week' | 'recipes';
  weekHref?: string;
}) {
  return (
    <Tabs value={current}>
      <TabsList className="w-full">
        <TabsTrigger value="week" asChild>
          <Link href={weekHref} aria-current={current === 'week' ? 'page' : undefined}>
            La semaine
          </Link>
        </TabsTrigger>
        <TabsTrigger value="recipes" asChild>
          <Link href="/kitchen/recipes" aria-current={current === 'recipes' ? 'page' : undefined}>
            Mes recettes
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
