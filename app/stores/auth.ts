import { defineStore } from 'pinia';
import type { Me, TokenPair } from '~/types/api';

const REFRESH_KEY = 'qro.client.refreshToken';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptTerms: boolean;
}

/**
 * Compte client facultatif (CLI-01) : historique, « commander à nouveau »,
 * fidélité. Commander reste possible sans compte.
 * Jeton d'accès en mémoire, refresh token en localStorage (à remplacer par
 * un cookie httpOnly avant la production, comme pour le back-office).
 */
export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig();
  const accessToken = ref<string | null>(null);
  const user = ref<Me | null>(null);
  const initialized = ref(false);

  const isLoggedIn = computed(() => !!accessToken.value && !!user.value);

  // Appels sans intercepteur (évite toute boucle avec le rafraîchissement).
  const raw = $fetch.create({ baseURL: config.public.apiBase });

  function storeTokens(tokens: TokenPair) {
    accessToken.value = tokens.accessToken;
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }

  function clear() {
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem(REFRESH_KEY);
  }

  async function fetchMe() {
    user.value = await raw<Me>('/auth/me', { headers: { Authorization: `Bearer ${accessToken.value}` } });
  }

  async function login(email: string, password: string) {
    const res = await raw<{ tokens: TokenPair }>('/auth/login', { method: 'POST', body: { email, password } });
    storeTokens(res.tokens);
    await fetchMe();
  }

  async function register(input: RegisterInput) {
    const res = await raw<{ tokens: TokenPair }>('/auth/customers/register', { method: 'POST', body: input });
    storeTokens(res.tokens);
    await fetchMe();
  }

  /** Un seul rafraîchissement à la fois, partagé par les 401 simultanés. */
  const refresh = singleFlight(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      storeTokens(await raw<TokenPair>('/auth/refresh', { method: 'POST', body: { refreshToken } }));
      return true;
    } catch {
      clear();
      return false;
    }
  });

  async function init() {
    if (initialized.value) return;
    initialized.value = true;
    if (await refresh()) await fetchMe().catch(() => clear());
  }

  async function logout() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      await raw('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    }
    clear();
  }

  return { accessToken, user, initialized, isLoggedIn, login, register, refresh, fetchMe, init, logout, clear };
});
