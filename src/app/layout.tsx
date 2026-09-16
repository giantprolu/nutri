import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Source_Sans_3 } from 'next/font/google';
import { TabBar } from '@/components/TabBar';
import { INSTALL_PROMPT_KEY, INSTALL_READY_EVENT } from '@/lib/client/install';
import {
  THEME_COLORS,
  THEME_COOKIE,
  readAppearance,
  themeAttribute,
} from '@/lib/theme';
import './globals.css';

/**
 * Source Sans 3, en deux coupes : la normale pour le texte courant, la demi-
 * grasse pour les titres, les intitulés et les chiffres mis en scène.
 *
 * `next/font` la sert depuis notre propre domaine plutôt que depuis Google :
 * aucune requête vers un tiers au chargement, donc pas de fuite d'adresse IP,
 * et la substitution de police est calculée à la compilation, ce qui évite le
 * décalage de mise en page à l'affichage.
 */
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NutriPerso',
  description: 'Registre alimentaire personnel.',
  manifest: '/manifest.json',
  applicationName: 'NutriPerso',
  appleWebApp: {
    capable: true,
    title: 'NutriPerso',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

/**
 * La barre d'état suit le thème rendu, et non un thème figé.
 *
 * En mode auto, deux déclarations sous condition de média laissent le système
 * trancher. Avec un choix explicite, une seule couleur est émise : sans cela,
 * une personne ayant forcé le thème clair sur un téléphone en mode sombre
 * verrait une barre d'état noire au-dessus d'une page claire.
 */
export async function generateViewport(): Promise<Viewport> {
  const store = await cookies();
  const appearance = readAppearance(store.get(THEME_COOKIE)?.value);

  const themeColor =
    appearance === 'auto'
      ? [
          { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
          { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
        ]
      : THEME_COLORS[appearance];

  return {
    themeColor,
    colorScheme: appearance === 'auto' ? 'light dark' : appearance,
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  };
}

/**
 * Capture de `beforeinstallprompt`, posée avant tout le reste.
 *
 * Chromium émet cet événement une seule fois, tôt, et souvent avant que React
 * n'ait pris la main. Un écouteur monté dans un composant arriverait après la
 * fête neuf fois sur dix, et le bouton d'installation ne s'afficherait jamais
 * sur Android — panne parfaitement muette, puisque rien n'échoue.
 *
 * `preventDefault` empêche la bannière spontanée du navigateur : l'invite
 * s'ouvrira au geste de l'utilisateur, depuis l'écran qui l'explique, et non
 * par surprise au milieu d'une saisie de repas.
 *
 * Quatre lignes en clair dans le document plutôt qu'un module chargé : tout ce
 * qui passe par le graphe de modules arrive, par construction, trop tard.
 */
const CAPTURE_SCRIPT = `window.${INSTALL_PROMPT_KEY}=null;addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.${INSTALL_PROMPT_KEY}=e;dispatchEvent(new Event('${INSTALL_READY_EVENT}'))});addEventListener('appinstalled',function(){window.${INSTALL_PROMPT_KEY}=null});`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const theme = themeAttribute(readAppearance(store.get(THEME_COOKIE)?.value));

  return (
    <html
      lang="fr"
      // Rien en mode auto : l'absence d'attribut rend la main au système.
      {...(theme === undefined ? {} : { 'data-theme': theme })}
      className={sourceSans.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <main className="safe-top mx-auto w-full max-w-lg px-4">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
