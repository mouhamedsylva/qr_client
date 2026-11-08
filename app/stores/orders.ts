import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

/** Commande passée depuis cet appareil : son jeton de suivi en donne l'accès. */
export interface TrackedOrder {
  id: string;
  token: string;
  slug: string;
  restaurantName: string;
  number: number;
  createdAt: string;
}

const MAX_TRACKED = 20;

/**
 * Commandes suivies sur l'appareil, sans compte : le jeton de suivi est la
 * seule clé d'accès à une commande anonyme (X-Order-Token).
 */
export const useOrdersStore = defineStore('orders', () => {
  const tracked = useLocalStorage<TrackedOrder[]>('qro.orders', []);

  function remember(order: TrackedOrder) {
    tracked.value = [order, ...tracked.value.filter((o) => o.id !== order.id)].slice(0, MAX_TRACKED);
  }

  function tokenFor(id: string): string | null {
    return tracked.value.find((o) => o.id === id)?.token ?? null;
  }

  function forget(id: string) {
    tracked.value = tracked.value.filter((o) => o.id !== id);
  }

  /** Commandes récentes (moins de 24 h), les plus récentes d'abord. */
  const recent = computed(() =>
    tracked.value.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 24 * 60 * 60 * 1000),
  );

  return { tracked, recent, remember, tokenFor, forget };
});
