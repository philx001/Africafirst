import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { createClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RetryConfig = InternalAxiosRequestConfig & { __retry401?: boolean };

function nestErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const m = (data as { message?: unknown }).message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  return '';
}

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token Supabase dans chaque requête
api.interceptors.request.use(async (config) => {
  const supabase = createClient();
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    try {
      await supabase.auth.refreshSession();
    } catch {
      /* routes publiques (ex. register) : pas de refresh token */
    }
    ({
      data: { session },
    } = await supabase.auth.getSession());
  }

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// 401 : retenter une fois après refresh ; ne pas déconnecter si le compte Supabase est OK mais pas provisionné côté API
api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest.__retry401) {
      originalRequest.__retry401 = true;
      const supabase = createClient();
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session?.access_token) {
        originalRequest.headers.Authorization = `Bearer ${refreshData.session.access_token}`;
        return api.request(originalRequest);
      }
    }

    if (status === 401) {
      const msg = nestErrorMessage(error.response?.data);
      const isProvisioningIssue =
        msg.includes('Utilisateur local introuvable') ||
        msg.includes('Organization non définie');
      if (!isProvisioningIssue && typeof window !== 'undefined') {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);
