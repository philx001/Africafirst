import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Connexion par mot de passe avec écriture des cookies sur la réponse HTTP.
 * Les Server Actions / RSC peuvent ignorer ou échouer silencieusement sur `cookies().set`
 * (voir doc Supabase SSR + notre `lib/supabase/server.ts` qui catch les erreurs).
 */
export async function POST(request: Request) {
  const isProduction = process.env.NODE_ENV === 'production';
  const devInsecureTls = process.env.CRM_DEV_INSECURE_TLS === '1';

  if (isProduction) {
    if (devInsecureTls || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Configuration TLS invalide sur cet environnement. Contactez l’administrateur (CRM_DEV_INSECURE_TLS / NODE_TLS_REJECT_UNAUTHORIZED).',
        },
        { status: 503 },
      );
    }
  } else if (devInsecureTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: 'Configuration Supabase manquante (NEXT_PUBLIC_*)' },
      { status: 500 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email et mot de passe requis' }, { status: 400 });
  }

  const cookieStore = await cookies();
  let lastSetCookies: { name: string; value: string; options?: CookieOptions }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        lastSetCookies = cookiesToSet;
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
    const legacyJwtKey = supabaseAnonKey.startsWith('eyJ');
    const looksLikeKeyReject =
      /jwt|apikey|api key|malformed|invalid signature|invalid api|bad_jwt|invalid_grant/i.test(
        error.message,
      );
    const hint =
      !legacyJwtKey && looksLikeKeyReject
        ? 'Utilisez la clé « anon » (JWT eyJ…) : Supabase → Settings → API → Legacy API keys → copier dans NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        : undefined;

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        ...(code ? { code } : {}),
        ...(hint ? { hint } : {}),
      },
      { status: 401 },
    );
  }

  await supabase.auth.getUser();
  // onAuthStateChange → applyServerStorage peut être légèrement différé sur la microfile d’événements
  if (lastSetCookies.length === 0) {
    await new Promise((r) => setTimeout(r, 150));
  }

  if (lastSetCookies.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'La session n’a pas pu être enregistrée (cookies). Rechargez la page, videz les données du site pour localhost, ou vérifiez NEXT_PUBLIC_SUPABASE_*.',
      },
      { status: 500 },
    );
  }

  const role = data.user?.app_metadata?.user_role;
  const redirectTo = role === 'client' ? '/client/dashboard' : '/dashboard';

  const res = NextResponse.json({ ok: true, redirectTo });
  lastSetCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options);
  });

  return res;
}
