import type { NitroFetchOptions } from 'nitropack';

export type ApiOptions = NitroFetchOptions<string> & {
  /** Ne pas afficher de notification en cas d'erreur. */
  silent?: boolean;
};

export type ApiClient = <T>(path: string, options?: ApiOptions) => Promise<T>;

/**
 * Client de l'API : jeton d'accès du compte client s'il est connecté
 * (facultatif), rafraîchissement sur 401 puis rejeu. Les erreurs sont
 * affichées en notification, sauf `silent: true`.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const auth = useAuthStore();
  const toast = useToast();

  async function request<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
    const { silent, ...fetchOptions } = options;
    try {
      return await $fetch<T>(path, {
        baseURL: config.public.apiBase,
        ...fetchOptions,
        headers: {
          ...(fetchOptions.headers as Record<string, string> | undefined),
          ...(auth.accessToken && { Authorization: `Bearer ${auth.accessToken}` }),
        },
      } as NitroFetchOptions<string>);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 401 && !retried && auth.accessToken && (await auth.refresh())) {
        return request<T>(path, options, true);
      }
      if (status === 401) auth.clear();
      if (!silent) {
        toast.add({ title: 'Oups', description: apiErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' });
      }
      throw err;
    }
  }

  return { provide: { api: request as ApiClient } };
});
