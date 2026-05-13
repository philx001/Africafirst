'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Défaut 15 min ; surcharger avec NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MS (millisecondes, minimum 60000). */
const DEFAULT_IDLE_MS = 15 * 60 * 1000;
/** Rafraîchit le JWT tant que l’utilisateur est dans la fenêtre d’« activité », pour éviter un JWT court (ex. 5 min côté Supabase) combiné à des échecs de refresh sporadiques. */
const REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const IDLE_CHECK_MS = 30_000;
const MIN_CONFIG_IDLE_MS = 60_000;

function idleTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MS;
  if (raw === undefined || raw === '') return DEFAULT_IDLE_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < MIN_CONFIG_IDLE_MS) return DEFAULT_IDLE_MS;
  return n;
}

/**
 * Déconnexion après une période sans interaction utilisateur (souris, clavier, scroll, tactile, focus).
 * Ne compte pas le polling API / React Query comme activité — aligné avec une politique métier « d’inactivité ».
 */
export function SessionActivityManager() {
  useEffect(() => {
    const idleMs = idleTimeoutMs();
    const supabase = createClient();
    let lastActivityAt = Date.now();

    const markActivity = () => {
      lastActivityAt = Date.now();
    };

    const activityEvents = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focusin',
    ] as const;

    const listenerOpts: AddEventListenerOptions = { passive: true, capture: true };
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, listenerOpts));

    const idleTimer = window.setInterval(async () => {
      if (Date.now() - lastActivityAt < idleMs) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.auth.signOut();
      window.location.assign('/login');
    }, IDLE_CHECK_MS);

    const refreshTimer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivityAt >= idleMs) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.auth.refreshSession().catch(() => {
        /* le prochain appel API relancera un refresh ou une 401 explicite */
      });
    }, REFRESH_INTERVAL_MS);

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity, listenerOpts));
      window.clearInterval(idleTimer);
      window.clearInterval(refreshTimer);
    };
  }, []);

  return null;
}
