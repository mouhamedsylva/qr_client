import { useLocalStorage, useSessionStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import type { MenuItem, OrderLineInput } from '~/types/api';
import {
  type CartLine,
  cartCount,
  cartSubtotal,
  lineKey,
  MAX_QUANTITY,
  optionLabels,
  unitPrice,
} from '~/utils/cart';

/**
 * Panier, un par établissement, conservé sur l'appareil : un rechargement ou
 * une coupure réseau ne fait pas perdre la sélection.
 * `addingTo` : le panier complète une commande déjà envoyée (CMD-06).
 */
export const useCartStore = defineStore('cart', () => {
  const venue = useVenueStore();
  const carts = useLocalStorage<Record<string, CartLine[]>>('qro.carts', {});
  const addingTo = useSessionStorage<{ orderId: string; slug: string; number: number } | null>('qro.addingTo', null, {
    serializer: { read: (v) => (v ? JSON.parse(v) : null), write: (v) => JSON.stringify(v) },
  });

  const lines = computed<CartLine[]>(() => (venue.slug ? carts.value[venue.slug] ?? [] : []));
  const count = computed(() => cartCount(lines.value));
  const subtotal = computed(() => cartSubtotal(lines.value));
  /** Mode « ajout à la commande » valable pour l'établissement affiché. */
  const appendTarget = computed(() => (addingTo.value && addingTo.value.slug === venue.slug ? addingTo.value : null));

  function setLines(next: CartLine[]) {
    if (!venue.slug) return;
    carts.value = { ...carts.value, [venue.slug]: next };
  }

  function add(item: MenuItem, quantity: number, optionIds: string[], notes = '') {
    const key = lineKey(item.id, optionIds, notes);
    const existing = lines.value.find((l) => l.key === key);
    if (existing) {
      setLines(lines.value.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + quantity) } : l)));
      return;
    }
    setLines([
      ...lines.value,
      {
        key,
        menuItemId: item.id,
        name: item.name,
        image: item.images[0] ?? null,
        unitPrice: unitPrice(item, optionIds),
        quantity,
        optionIds,
        optionLabels: optionLabels(item, optionIds),
        notes: notes.trim(),
      },
    ]);
  }

  function setQuantity(key: string, quantity: number) {
    if (quantity <= 0) return remove(key);
    setLines(lines.value.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, quantity) } : l)));
  }

  function remove(key: string) {
    setLines(lines.value.filter((l) => l.key !== key));
  }

  function clear() {
    setLines([]);
  }

  /** Quantité totale d'un article dans le panier (badge sur la carte du menu). */
  function quantityOf(menuItemId: string): number {
    return lines.value.filter((l) => l.menuItemId === menuItemId).reduce((n, l) => n + l.quantity, 0);
  }

  /**
   * Prix et noms recalculés depuis le menu actuel ; les articles retirés ou
   * épuisés sont écartés et renvoyés pour en informer le client.
   */
  function syncWithMenu(): string[] {
    const removed: string[] = [];
    const next: CartLine[] = [];
    for (const line of lines.value) {
      const item = venue.items.get(line.menuItemId);
      if (!item || !item.available) {
        removed.push(line.name);
        continue;
      }
      next.push({ ...line, name: item.name, unitPrice: unitPrice(item, line.optionIds), optionLabels: optionLabels(item, line.optionIds) });
    }
    if (JSON.stringify(next) !== JSON.stringify(lines.value)) setLines(next);
    return removed;
  }

  /** Lignes au format de l'API. */
  const payload = computed<OrderLineInput[]>(() =>
    lines.value.map((l) => ({
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      ...(l.optionIds.length && { optionIds: l.optionIds }),
      ...(l.notes && { notes: l.notes }),
    })),
  );

  /** Remplit le panier à partir de lignes reçues (« Commander à nouveau »). */
  function fill(items: OrderLineInput[]): number {
    let added = 0;
    for (const input of items) {
      const item = venue.items.get(input.menuItemId);
      if (!item?.available) continue;
      add(item, input.quantity, input.optionIds ?? [], input.notes ?? '');
      added += 1;
    }
    return added;
  }

  function startAdding(orderId: string, slug: string, number: number) {
    addingTo.value = { orderId, slug, number };
  }

  function stopAdding() {
    addingTo.value = null;
  }

  return {
    lines, count, subtotal, payload, appendTarget,
    add, setQuantity, remove, clear, quantityOf, syncWithMenu, fill, startAdding, stopAdding,
  };
});
