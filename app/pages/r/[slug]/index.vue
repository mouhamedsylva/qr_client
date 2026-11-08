<script setup lang="ts">
import type { MenuCategory, MenuItem } from '~/types/api';
import { matches } from '~/utils/text';

const venue = useVenueStore();
const cart = useCartStore();
const orders = useOrdersStore();
const { money } = useMoney();
const { slug, status, error, refresh } = useVenueLoader();

useHead({ title: () => venue.restaurant?.name ?? 'Menu' });

// ─── Recherche ───
const searchOpen = ref(false);
const query = ref('');
const searchInput = useTemplateRef<{ inputRef?: HTMLInputElement }>('searchInput');
async function openSearch() {
  searchOpen.value = true;
  await nextTick();
  searchInput.value?.inputRef?.focus();
}
function closeSearch() {
  searchOpen.value = false;
  query.value = '';
}

/** Sections affichées : une par catégorie, sous-catégories à plat, filtrées par la recherche. */
interface Section {
  id: string;
  name: string;
  description: string | null;
  sub: boolean;
  items: MenuItem[];
}
const sections = computed<Section[]>(() => {
  const out: Section[] = [];
  const push = (c: MenuCategory, sub: boolean) => {
    const items = c.items.filter((i) => matches(query.value, i.name, i.description));
    out.push({ id: c.id, name: c.name, description: c.description, sub, items });
  };
  for (const c of venue.menu?.categories ?? []) {
    push(c, false);
    for (const child of c.children ?? []) push(child, true);
  }
  return query.value ? out.filter((s) => s.items.length) : out.filter((s) => s.items.length || !s.sub);
});
const topSections = computed(() => sections.value.filter((s) => !s.sub));

// ─── Onglets de catégories synchronisés avec le défilement ───
const activeId = ref<string | null>(null);
const tabsEl = useTemplateRef<HTMLElement>('tabsEl');
let observer: IntersectionObserver | null = null;

function observe() {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) activeId.value = (visible[0].target as HTMLElement).dataset.cat ?? null;
    },
    // Bande juste sous la barre d'onglets.
    { rootMargin: '-120px 0px -65% 0px' },
  );
  document.querySelectorAll('[data-cat]').forEach((el) => observer!.observe(el));
}
watch(
  () => topSections.value.map((s) => s.id).join(),
  async () => {
    await nextTick();
    observe();
  },
  { immediate: true },
);
onBeforeUnmount(() => observer?.disconnect());

watch(activeId, (id) => {
  const tab = id && tabsEl.value?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
  if (tab && tabsEl.value) {
    tabsEl.value.scrollTo({ left: tab.offsetLeft - tabsEl.value.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' });
  }
});

function goTo(id: string) {
  document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Fiche article ───
const sheetOpen = ref(false);
const selected = ref<MenuItem | null>(null);
function select(item: MenuItem) {
  selected.value = item;
  sheetOpen.value = true;
}

const lastOrder = computed(() => orders.recent.find((o) => o.slug === slug.value) ?? null);
const isEmpty = computed(() => status.value === 'success' && !venue.menu?.categories.length);
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Chargement -->
    <div v-if="status === 'pending' && !venue.restaurant" class="space-y-4">
      <USkeleton class="h-36 w-full rounded-none" />
      <div class="space-y-3 px-4">
        <USkeleton class="h-8 w-2/3" />
        <USkeleton class="h-4 w-1/2" />
        <USkeleton v-for="n in 4" :key="n" class="h-24 w-full" />
      </div>
    </div>

    <!-- Établissement introuvable -->
    <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <UIcon name="i-lucide-store" class="size-12 text-dimmed" />
      <h1 class="font-display text-xl font-semibold">Établissement indisponible</h1>
      <p class="text-muted">{{ apiErrorMessage(error) }}</p>
      <UButton color="neutral" variant="outline" icon="i-lucide-rotate-cw" label="Réessayer" @click="refresh()" />
    </div>

    <template v-else-if="venue.restaurant">
      <div class="relative">
        <RestaurantHero :restaurant="venue.restaurant" :table-label="venue.table?.kind === 'TABLE' ? venue.table.label : null" :counter="venue.table?.kind === 'COUNTER'" />
        <div class="absolute top-3 right-3 flex gap-2">
          <UButton :to="`/r/${slug}/infos`" icon="i-lucide-info" color="neutral" variant="solid" class="rounded-full bg-default/90 text-default shadow" aria-label="Informations" />
          <UButton to="/compte" icon="i-lucide-circle-user" color="neutral" variant="solid" class="rounded-full bg-default/90 text-default shadow" aria-label="Mon compte" />
        </div>
      </div>

      <div class="space-y-2 px-4 pt-4">
        <UAlert
          v-if="cart.appendTarget"
          color="primary"
          variant="subtle"
          icon="i-lucide-plus-circle"
          :title="`Ajout à la commande n°${cart.appendTarget.number}`"
          description="Les articles choisis seront ajoutés à votre commande en cours."
          :actions="[{ label: 'Annuler l’ajout', color: 'neutral', variant: 'link', onClick: () => cart.stopAdding() }]"
        />
        <UAlert
          v-else-if="lastOrder"
          color="neutral"
          variant="outline"
          icon="i-lucide-receipt-text"
          :title="`Commande n°${lastOrder.number} en cours`"
          :actions="[{ label: 'Suivre', to: `/commande/${lastOrder.id}`, trailingIcon: 'i-lucide-arrow-right' }]"
        />
        <UAlert
          v-if="!venue.restaurant.isOpen"
          color="warning"
          variant="subtle"
          icon="i-lucide-moon"
          title="Fermé pour le moment"
          description="Vous pouvez consulter le menu ; les commandes reprendront à l’ouverture."
        />
        <p v-if="!venue.table" class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-info" class="size-3.5 shrink-0" />
          Commande à emporter. Vous êtes à table ? Scannez le QR code de votre table.
        </p>
      </div>

      <!-- Barre des catégories / recherche -->
      <div class="sticky top-0 z-20 mt-3 border-b border-default bg-default/95 backdrop-blur">
        <div v-if="searchOpen" class="flex items-center gap-2 px-3 py-2">
          <UInput
            ref="searchInput"
            v-model="query"
            icon="i-lucide-search"
            placeholder="Rechercher un plat…"
            class="flex-1"
            size="lg"
            @keydown.esc="closeSearch"
          />
          <UButton color="neutral" variant="ghost" label="Fermer" @click="closeSearch" />
        </div>
        <div v-else class="flex items-center">
          <UButton icon="i-lucide-search" color="neutral" variant="ghost" class="ml-1 shrink-0" aria-label="Rechercher" @click="openSearch" />
          <nav ref="tabsEl" class="no-scrollbar flex gap-1 overflow-x-auto px-1 py-2" aria-label="Catégories">
            <button
              v-for="s in topSections"
              :key="s.id"
              type="button"
              :data-tab="s.id"
              class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition"
              :class="activeId === s.id ? 'bg-primary text-inverted' : 'text-muted hover:bg-elevated'"
              @click="goTo(s.id)"
            >
              {{ s.name }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Menu -->
      <main class="flex-1 pb-28">
        <UEmpty
          v-if="isEmpty"
          icon="i-lucide-book-open"
          title="Menu en préparation"
          description="Le restaurant n’a pas encore publié sa carte."
          class="py-16"
        />
        <UEmpty
          v-else-if="query && !sections.length"
          icon="i-lucide-search-x"
          :title="`Aucun plat pour « ${query} »`"
          class="py-16"
        />
        <section
          v-for="s in sections"
          :id="`cat-${s.id}`"
          :key="s.id"
          :data-cat="s.sub ? undefined : s.id"
          class="scroll-mt-16 px-1 pt-5"
        >
          <h2 class="px-3" :class="s.sub ? 'text-base font-semibold text-highlighted' : 'font-display text-xl font-semibold text-highlighted'">
            {{ s.name }}
          </h2>
          <p v-if="s.description" class="px-3 text-sm text-muted">{{ s.description }}</p>
          <div class="mt-1 divide-y divide-default">
            <MenuItemCard v-for="item in s.items" :key="item.id" :item="item" :in-cart="cart.quantityOf(item.id)" @select="select(item)" />
          </div>
        </section>
      </main>

      <!-- Panier -->
      <div v-if="cart.count" class="sticky bottom-0 z-20 bg-linear-to-t from-default via-default/90 to-transparent px-4 pt-6 pb-safe">
        <UButton :to="`/r/${slug}/panier`" block size="xl" class="justify-between shadow-lg">
          <span class="flex items-center gap-2">
            <span class="flex size-6 items-center justify-center rounded-full bg-white/20 text-sm">{{ cart.count }}</span>
            {{ cart.appendTarget ? 'Voir l’ajout' : 'Voir le panier' }}
          </span>
          <span class="tabular">{{ money(cart.subtotal) }}</span>
        </UButton>
      </div>

      <MenuItemSheet v-model:open="sheetOpen" :item="selected" />
    </template>
  </div>
</template>
