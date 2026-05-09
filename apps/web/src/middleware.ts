import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    pathname.startsWith('/documents') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/automations') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/search');

  // Non authentifié → rediriger vers login
  if (!user && (isInternalRoute || isClientRoute)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authentifié → ne pas accéder aux pages auth
  if (user && isAuthPage) {
    const role = user.app_metadata?.user_role;
    const redirectTo = role === 'client' ? '/client/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Client essayant d'accéder aux routes internes
  if (user && user.app_metadata?.user_role === 'client' && isInternalRoute) {
    return NextResponse.redirect(new URL('/client/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
