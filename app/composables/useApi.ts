import type { ApiClient } from '~/plugins/api';

/** Client de l'API (voir plugins/api.ts). */
export function useApi(): ApiClient {
  return useNuxtApp().$api;
}

/**
 * Identifiant aléatoire (v4). `crypto.randomUUID` n'existe qu'en contexte
 * sécurisé (HTTPS) : sur un téléphone en http://192.168.x.x pendant les
 * tests, on passe par `crypto.getRandomValues`.
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
