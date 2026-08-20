/**
 * Serves the NCCHCA wordmark from this app's own origin.
 *
 * The asset lives on ncchca.org; this route fetches it server-side and caches
 * it for a day so the browser never hotlinks the association's WordPress theme
 * directly and a brief outage there does not blank the header.
 *
 *   /logo            light wordmark  — for the navy top bar
 *   /logo?v=dark     navy wordmark   — for white cards (login screen)
 */

const SOURCES: Record<string, string> = {
  light: 'https://www.ncchca.org/wp-content/themes/ncchca/images/mobile-logo.png',
  dark: 'https://www.ncchca.org/wp-content/themes/ncchca/images/footer-logo-new.png',
};

export const revalidate = 86400;

export async function GET(request: Request) {
  const variant = new URL(request.url).searchParams.get('v') === 'dark' ? 'dark' : 'light';

  try {
    const upstream = await fetch(SOURCES[variant], { next: { revalidate: 86400 } });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const body = new Uint8Array(await upstream.arrayBuffer());
    return new Response(body, {
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'image/png',
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    // Fail loudly rather than serving a blank pixel: the <img> onError handler
    // in Brandmark then falls back to the "NC" tile.
    return new Response(null, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
