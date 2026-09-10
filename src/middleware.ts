import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isValidSessionToken } from '@/server/auth';

/**
 * Protection des navigations (FR-2).
 * Les routes /api ne passent pas par ici : elles doivent répondre 401 et non
 * rediriger, ce que fait le garde partagé de src/server/guard.ts.
 */
const PUBLIC_PATHS = ['/unlock'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/unlock';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // Exclut les ressources statiques et la coquille PWA, accessibles sans session.
  // `zxing` en fait partie : c'est un binaire public, et le laisser rediriger
  // vers /unlock ferait mettre en cache la page de déverrouillage à sa place.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|zxing|sw.js|offline).*)',
  ],
};
