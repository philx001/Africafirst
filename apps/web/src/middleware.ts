import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Recopier les cookies posés par `getUser()` (refresh) sur la réponse finale — sinon la redirection perd la session. */
function redirectPreservingAuthCookies(
  request: NextRequest,
  cookieSource: NextResponse,
  pathname: string,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));
  cookieSource.cookies.getAll().forEach(({ name, value }) => {
    redirect.cookies.set(name, value);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sans ces variables, createServerClient peut planter et faire echouer tout le dev server
  // (500 sur / et MIME errors sur les bundles).
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant — verifiez apps/web/.env.local',
    );
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isClientRoute = pathname.startsWith('/client');
  const isInternalRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/contacts') ||
    pathname.startsWith('/accounts') ||
    pathname.startsWith('/deals') ||
    pathname.startsWith('/contracts') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/tickets') ||
    pathname.startsWith('/automations') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/search');

  // Non authentifié → rediriger vers login
  if (!user && (isInternalRoute || isClientRoute)) {
    return redirectPreservingAuthCookies(request, supabaseResponse, '/login');
  }

  // Authentifié → ne pas accéder aux pages auth
  if (user && isAuthPage) {
    const role = user.app_metadata?.user_role;
    const redirectTo = role === 'client' ? '/client/dashboard' : '/dashboard';
    return redirectPreservingAuthCookies(request, supabaseResponse, redirectTo);
  }

  // Client essayant d'accéder aux routes internes
  if (user && user.app_metadata?.user_role === 'client' && isInternalRoute) {
    return redirectPreservingAuthCookies(request, supabaseResponse, '/client/dashboard');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclure tout /_next/* (pas seulement static/image) : webpack-hmr, flight RSC, etc.
    // Sinon le middleware peut s'executer sur des chunks JS → 500 + HTML servie a la place du JS.
    '/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
