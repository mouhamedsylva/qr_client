import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import type { MenuCategory, MenuItem, OrderMode, PublicMenu, PublicRestaurant, QrResolution } from '~/types/api';

/** Table scannée, mémorisée pour retrouver le contexte après un rechargement. */
interface TableContext {
  slug: string;
  qrToken: string;
  table: QrResolution['table'];
  scannedAt: number;
}

/** Au-delà, le client est sans doute parti : on oublie la table (pas le panier). */
const TABLE_TTL = 6 * 60 * 60 * 1000;

/**
 * Établissement consulté : informations publiques, menu, et table d'origine
 * si le client a scanné un QR code (sur place) ou le QR comptoir (à emporter).
 */
export const useVenueStore = defineStore('venue', () => {
  const api = useApi();
  const restaurant = ref<PublicRestaurant | null>(null);
  const menu = ref<PublicMenu | null>(null);
  const tableCtx = useLocalStorage<TableContext | null>('qro.table', null, {
    serializer: { read: (v) => (v ? JSON.parse(v) : null), write: (v) => JSON.stringify(v) },
  });

  const slug = computed(() => restaurant.value?.slug ?? null);
  const currency = computed(() => restaurant.value?.currency ?? 'XOF');
  const locale = computed(() => restaurant.value?.locale ?? 'fr-SN');

  /** Table valable pour l'établissement affiché. */
  const table = computed(() => {
    const ctx = tableCtx.value;
    if (!ctx || ctx.slug !== slug.value || Date.now() - ctx.scannedAt > TABLE_TTL) return null;
    return ctx.table;
  });
  const qrToken = computed(() => (table.value ? tableCtx.value!.qrToken : null));

  /** Sur place uniquement depuis le QR d'une table ; sinon à emporter. */
  const mode = computed<OrderMode>(() => (table.value?.kind === 'TABLE' ? 'DINE_IN' : 'TAKEAWAY'));

  const items = computed(() => {
    const map = new Map<string, MenuItem>();
    for (const c of menu.value?.categories ?? []) {
      for (const i of c.items) map.set(i.id, i);
      for (const child of c.children ?? []) for (const i of child.items) map.set(i.id, i);
    }
    return map;
  });

  /**
   * Menu normalisé : les listes facultatives (photos, allergènes, régimes,
   * options) peuvent arriver à null, par exemple pour des plats importés sans photo.
   */
  function normalizeMenu(raw: PublicMenu): PublicMenu {
    const list = <T>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
    const item = (i: MenuItem): MenuItem => ({
      ...i,
      images: list(i.images),
      allergens: list(i.allergens),
      dietaryTags: list(i.dietaryTags),
      optionGroups: list(i.optionGroups).map((g) => ({ ...g, options: list(g.options) })),
    });
    const category = (c: MenuCategory): MenuCategory => ({
      ...c,
      items: list(c.items).map(item),
      children: list(c.children).map(category),
    });
    return { ...raw, categories: list(raw.categories).map(category) };
  }

  /** Point d'entrée du QR : établissement, table et menu en un seul appel. */
  async function resolveQr(token: string) {
    const res = await api<QrResolution>(`/public/qr/${encodeURIComponent(token)}`, { silent: true });
    restaurant.value = res.restaurant;
    menu.value = normalizeMenu(res.menu);
    tableCtx.value = { slug: res.restaurant.slug, qrToken: token, table: res.table, scannedAt: Date.now() };
    return res;
  }

  /** Chargement par l'adresse /r/<slug> (lien direct, rechargement de page). */
  async function load(target: string, force = false) {
    if (!force && restaurant.value?.slug === target && menu.value) return;
    const [r, m] = await Promise.all([
      api<PublicRestaurant>(`/public/restaurants/${encodeURIComponent(target)}`, { silent: true }),
      api<PublicMenu>(`/public/restaurants/${encodeURIComponent(target)}/menu`, { silent: true }),
    ]);
    restaurant.value = r;
    menu.value = normalizeMenu(m);
  }

  /** Disponibilités à jour (après un refus pour article épuisé, par exemple). */
  async function refreshMenu() {
    if (slug.value) await load(slug.value, true);
  }

  function forgetTable() {
    tableCtx.value = null;
  }

  return { restaurant, menu, slug, currency, locale, table, qrToken, mode, items, resolveQr, load, refreshMenu, forgetTable };
});
