<script setup lang="ts">
import type { MenuCategory, MenuItem, ReviewList } from '~/types/api';
import { useIntersectionObserver, useSessionStorage, useSwipe } from '@vueuse/core';
import { categoryIcon } from '~/utils/category-icon';
import { matches } from '~/utils/text';

const venue = useVenueStore();
const cart = useCartStore();
const orders = useOrdersStore();
const api = useApi();
const { slug, status, error, refresh } = useVenueLoader();

// Note moyenne affichée sous le nom (avis publiés).
const { data: reviews } = useAsyncData(
  () => `menu-rating-${slug.value}`,
  () => api<ReviewList>(`/public/restaurants/${slug.value}/reviews?limit=1`, { silent: true }).catch(() => null),
  { watch: [slug] },
);
const rating = computed(() => (reviews.value ? { average: reviews.value.averageRating, count: reviews.value.meta.total } : null));

/** Tous les plats du menu, sous-catégories comprises, avec l'icône de leur catégorie. */
const allItems = computed(() =>
  (venue.menu?.categories ?? []).flatMap((c) =>
    [c, ...(c.children ?? [])].flatMap((s) => s.items.map((item) => ({ item, icon: categoryIcon(c.name) }))),
  ),
);

/** Temps de préparation indicatif : médiane des plats renseignés. */
const prepMinutes = computed(() => {
  const times = allItems.value
    .map(({ item }) => item.prepTimeMinutes)
    .filter((t): t is number => !!t)
    .sort((a, b) => a - b);
  return times.length ? times[Math.floor(times.length / 2)]! : null;
});

/** Carrousel « Populaires » : plats disponibles avec photo, un peu de chaque catégorie. */
const featured = computed(() => {
  const byCategory = (venue.menu?.categories ?? []).map((c) =>
    [c, ...(c.children ?? [])]
      .flatMap((s) => s.items)
      .filter((i) => i.available && i.images.length)
      .map((item) => ({ item, icon: categoryIcon(c.name) })),
  );
  const out: { item: MenuItem; icon: string }[] = [];
  for (let round = 0; out.length < 10 && byCategory.some((l) => l[round]); round++) {
    for (const list of byCategory) if (list[round] && out.length < 10) out.push(list[round]!);
  }
  return out;
});

// En-tête compact : apparaît quand la bannière sort de l'écran.
const heroEnd = useTemplateRef<HTMLElement>('heroEnd');
const scrolled = ref(false);
useIntersectionObserver(heroEnd, ([entry]) => (scrolled.value = !entry?.isIntersecting));

useHead({ title: () => venue.restaurant?.name ?? 'Menu' });

const barEl = useTemplateRef<HTMLElement>('barEl');
const tabsEl = useTemplateRef<HTMLElement>('tabsEl');

// ─── Recherche ───
const searchOpen = ref(false);
const query = ref('');
const searchInput = useTemplateRef<{ inputRef?: HTMLInputElement }>('searchInput');
async function openSearch() {
  searchOpen.value = true;
  await nextTick();
  barEl.value?.scrollIntoView({ block: 'start' });
  searchInput.value?.inputRef?.focus();
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function closeSearch() {
  searchOpen.value = false;
  query.value = '';
}

/** Une section par catégorie ou sous-catégorie ayant des plats. */
interface Section {
  id: string;
  name: string;
  description: string | null;
  sub: boolean;
  icon: string;
  items: MenuItem[];
}
const toSection = (c: MenuCategory, sub: boolean, items = c.items): Section => ({
  id: c.id,
  name: c.name,
  description: c.description,
  sub,
  icon: categoryIcon(c.name),
  items,
});

/** Catégories principales affichées en onglets (vides exclues). */
const categories = computed(() =>
  (venue.menu?.categories ?? []).filter((c) => c.items.length || (c.children ?? []).some((s) => s.items.length)),
);

// ─── Catégorie affichée : une à la fois, mémorisée pendant la visite ───
const remembered = useSessionStorage<Record<string, string>>('qro.category', {});
const activeId = computed({
  get: () => {
    const id = remembered.value[slug.value];
    return categories.value.some((c) => c.id === id) ? id! : (categories.value[0]?.id ?? null);
  },
  set: (id) => {
    if (id) remembered.value = { ...remembered.value, [slug.value]: id };
  },
});
const activeIndex = computed(() => categories.value.findIndex((c) => c.id === activeId.value));
const activeCategory = computed(() => categories.value[activeIndex.value] ?? null);
const nextCategory = computed(() => categories.value[activeIndex.value + 1] ?? null);

/** Plats de la catégorie affichée (puis ceux de ses sous-catégories), ou résultats de recherche. */
const sections = computed<Section[]>(() => {
  if (query.value.trim()) {
    return (venue.menu?.categories ?? [])
      .flatMap((c) => [toSection(c, false), ...(c.children ?? []).map((s) => toSection(s, true))])
      .map((s) => ({ ...s, items: s.items.filter((i) => matches(query.value, i.name, i.description)) }))
      .filter((s) => s.items.length);
  }
  const c = activeCategory.value;
  if (!c) return [];
  return [toSection(c, false), ...(c.children ?? []).filter((s) => s.items.length).map((s) => toSection(s, true))].filter(
    (s) => s.items.length,
  );
});

/** Sous-catégories (avec plats) de la catégorie affichée, pour le raccourci en pastilles. */
const subSections = computed(() => (query.value.trim() ? [] : sections.value.filter((s) => s.sub)));

/** Défile jusqu'à une sous-catégorie, sous l'en-tête et les onglets collants. */
function goToSub(id: string | null) {
  const el = id ? document.getElementById(`sub-${id}`) : barEl.value;
  if (!el) return;
  const offset = id ? 56 + (barEl.value?.offsetHeight ?? 48) + 8 : 0;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
}

// Rangées horizontales : glisser à la souris, molette et flèches sur ordinateur.
const subsEl = useTemplateRef<HTMLElement>('subsEl');
const featuredEl = useTemplateRef<HTMLElement>('featuredEl');
const tabsScroll = useHScroll(tabsEl);
const subsScroll = useHScroll(subsEl);
const featuredScroll = useHScroll(featuredEl);

// Le badge du panier rebondit à chaque ajout.
const bump = ref(false);
watch(
  () => cart.count,
  (next, prev) => {
    if (next > (prev ?? 0)) {
      bump.value = false;
      requestAnimationFrame(() => (bump.value = true));
    }
  },
);

// Sens du glissement : vers la gauche quand on avance dans les catégories.
const slide = ref<'slide-left' | 'slide-right'>('slide-left');

function goTo(id: string) {
  const target = categories.value.findIndex((c) => c.id === id);
  if (target < 0 || id === activeId.value) return;
  slide.value = target > activeIndex.value ? 'slide-left' : 'slide-right';
  activeId.value = id;
  // Remonte en haut de la catégorie si l'on avait défilé plus bas.
  const bar = barEl.value;
  if (bar && bar.getBoundingClientRect().top <= 1) {
    window.scrollTo({ top: bar.offsetTop, behavior: 'instant' as ScrollBehavior });
  }
}

function step(delta: number) {
  const next = categories.value[activeIndex.value + delta];
  if (next) goTo(next.id);
}

// Onglet actif toujours visible dans la barre.
watch(
  activeId,
  async (id) => {
    await nextTick();
    const tab = id && tabsEl.value?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
    if (tab && tabsEl.value) {
      tabsEl.value.scrollTo({ left: tab.offsetLeft - tabsEl.value.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' });
    }
  },
  { immediate: true },
);

// Balayage horizontal sur la liste : catégorie suivante / précédente.
const listEl = useTemplateRef<HTMLElement>('listEl');
useSwipe(listEl, {
  threshold: 60,
  onSwipeEnd(_, direction) {
    if (query.value.trim()) return;
    if (direction === 'left') step(1);
    else if (direction === 'right') step(-1);
  },
});

// ─── Fiche article ───
const sheetOpen = ref(false);
const selected = ref<MenuItem | null>(null);
const selectedIcon = ref('i-lucide-utensils');
function select(item: MenuItem, icon = 'i-lucide-utensils') {
  selected.value = item;
  selectedIcon.value = icon;
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
      <!-- En-tête compact, visible après la bannière -->
      <Transition
        enter-from-class="-translate-y-full opacity-0"
        leave-to-class="-translate-y-full opacity-0"
        enter-active-class="transition duration-200"
        leave-active-class="transition duration-150"
      >
        <div v-if="scrolled && !searchOpen" class="fixed inset-x-0 top-0 z-30 mx-auto flex h-14 max-w-lg items-center gap-2 bg-default px-2 shadow-sm">
          <UButton icon="i-lucide-arrow-up" color="neutral" variant="ghost" class="rounded-full" aria-label="Haut de page" @click="scrollToTop" />
          <p class="min-w-0 flex-1 truncate text-center font-bold text-highlighted">{{ venue.restaurant.name }}</p>
          <UButton icon="i-lucide-search" color="neutral" variant="ghost" class="rounded-full" aria-label="Rechercher" @click="openSearch" />
        </div>
      </Transition>

      <!-- Bannière et informations -->
      <div class="relative">
        <RestaurantHero
          :restaurant="venue.restaurant"
          :table-label="venue.table?.kind === 'TABLE' ? venue.table.label : null"
          :counter="venue.table?.kind === 'COUNTER'"
          :rating="rating"
          :prep-minutes="prepMinutes"
          @info="navigateTo(`/r/${slug}/infos`)"
        />
        <div class="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex gap-2">
          <UButton
            icon="i-lucide-search"
            color="neutral"
            variant="solid"
            size="lg"
            class="rounded-full bg-default text-highlighted shadow-md hover:bg-elevated"
            aria-label="Rechercher"
            @click="openSearch"
          />
          <UButton
            :to="`/r/${slug}/infos`"
            icon="i-lucide-info"
            color="neutral"
            variant="solid"
            size="lg"
            class="rounded-full bg-default text-highlighted shadow-md hover:bg-elevated"
            aria-label="Informations"
          />
          <UButton
            to="/compte"
            icon="i-lucide-user-round"
            color="neutral"
            variant="solid"
            size="lg"
            class="rounded-full bg-default text-highlighted shadow-md hover:bg-elevated"
            aria-label="Mon compte"
          />
        </div>
      </div>
      <div ref="heroEnd" aria-hidden="true" />

      <!-- Messages -->
      <div v-if="cart.appendTarget || lastOrder || !venue.restaurant.isOpen" class="space-y-2 px-4 pt-4">
        <UAlert
          v-if="cart.appendTarget"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus-circle"
          :title="`Ajout à la commande n°${cart.appendTarget.number}`"
          description="Les articles choisis seront ajoutés à votre commande en cours."
          :actions="[{ label: 'Annuler l’ajout', color: 'neutral', variant: 'link', onClick: () => cart.stopAdding() }]"
        />
        <NuxtLink v-else-if="lastOrder" :to="`/commande/${lastOrder.id}`" class="flex items-center gap-3 rounded-xl bg-elevated px-4 py-3">
          <UIcon name="i-lucide-receipt-text" class="size-5" />
          <span class="flex-1 text-sm font-medium">Commande n°{{ lastOrder.number }} en cours</span>
          <span class="text-sm font-semibold">Suivre</span>
          <UIcon name="i-lucide-chevron-right" class="size-4" />
        </NuxtLink>
        <UAlert
          v-if="!venue.restaurant.isOpen"
          color="warning"
          variant="soft"
          icon="i-lucide-moon"
          title="Fermé pour le moment"
          description="Vous pouvez consulter le menu ; les commandes reprendront à l’ouverture."
        />
      </div>

      <!-- Populaires -->
      <section v-if="featured.length >= 3 && !query.trim()" class="pt-6">
        <h2 class="px-4 text-xl font-bold tracking-tight text-highlighted">Populaires</h2>
        <div class="relative mt-3">
        <div ref="featuredEl" class="no-scrollbar flex cursor-grab snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
          <MenuFeaturedCard
            v-for="f in featured"
            :key="f.item.id"
            :item="f.item"
            :icon="f.icon"
            :in-cart="cart.quantityOf(f.item.id)"
            @select="select(f.item, f.icon)"
          />
        </div>
          <div v-if="featuredScroll.canLeft.value" class="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center bg-linear-to-r from-default via-default/80 to-transparent pl-1">
            <button type="button" class="pointer-events-auto hidden size-8 items-center justify-center rounded-full bg-default shadow-md ring-1 ring-black/5 hover:bg-elevated sm:flex" aria-label="Défiler vers la gauche" @click="featuredScroll.scrollBy(-1)">
              <UIcon name="i-lucide-chevron-left" class="size-5" />
            </button>
          </div>
          <div v-if="featuredScroll.canRight.value" class="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-linear-to-l from-default via-default/80 to-transparent pr-1">
            <button type="button" class="pointer-events-auto hidden size-8 items-center justify-center rounded-full bg-default shadow-md ring-1 ring-black/5 hover:bg-elevated sm:flex" aria-label="Défiler vers la droite" @click="featuredScroll.scrollBy(1)">
              <UIcon name="i-lucide-chevron-right" class="size-5" />
            </button>
          </div>
        </div>
      </section>

      <!-- Onglets des catégories, ou recherche -->
      <div ref="barEl" class="sticky z-20 mt-5 bg-default transition-[top]" :class="scrolled && !searchOpen ? 'top-14' : 'top-0'">
        <div v-if="searchOpen" class="flex items-center gap-2 border-b border-default px-3 py-2">
          <UInput
            ref="searchInput"
            v-model="query"
            icon="i-lucide-search"
            placeholder="Rechercher dans le menu"
            class="flex-1"
            size="lg"
            :ui="{ base: 'rounded-full bg-elevated ring-0' }"
            @keydown.esc="closeSearch"
          />
          <UButton color="neutral" variant="ghost" label="Annuler" @click="closeSearch" />
        </div>
        <div v-else class="relative border-b border-default">
        <nav ref="tabsEl" class="no-scrollbar flex cursor-grab gap-5 overflow-x-auto px-4" aria-label="Catégories">
          <button
            v-for="c in categories"
            :key="c.id"
            type="button"
            :data-tab="c.id"
            class="relative flex shrink-0 items-center gap-1.5 py-3 text-sm font-semibold whitespace-nowrap transition"
            :class="activeId === c.id ? 'text-highlighted' : 'text-muted hover:text-highlighted'"
            :aria-current="activeId === c.id ? 'true' : undefined"
            @click="goTo(c.id)"
          >
            <UIcon :name="categoryIcon(c.name)" class="size-4 shrink-0" />
            {{ c.name }}
            <span v-if="activeId === c.id" class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-inverted" />
          </button>
        </nav>
          <div v-if="tabsScroll.canLeft.value" class="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center bg-linear-to-r from-default via-default/80 to-transparent pl-1">
            <button type="button" class="pointer-events-auto hidden size-8 items-center justify-center rounded-full bg-default shadow-md ring-1 ring-black/5 hover:bg-elevated sm:flex" aria-label="Défiler vers la gauche" @click="tabsScroll.scrollBy(-1)">
              <UIcon name="i-lucide-chevron-left" class="size-5" />
            </button>
          </div>
          <div v-if="tabsScroll.canRight.value" class="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-linear-to-l from-default via-default/80 to-transparent pr-1">
            <button type="button" class="pointer-events-auto hidden size-8 items-center justify-center rounded-full bg-default shadow-md ring-1 ring-black/5 hover:bg-elevated sm:flex" aria-label="Défiler vers la droite" @click="tabsScroll.scrollBy(1)">
              <UIcon name="i-lucide-chevron-right" class="size-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Menu -->
      <main ref="listEl" class="flex-1 overflow-x-hidden pb-28">
        <UEmpty
          v-if="isEmpty"
          icon="i-lucide-book-open"
          title="Menu en préparation"
          description="Le restaurant n’a pas encore publié sa carte."
          class="py-16"
        />
        <UEmpty v-else-if="query.trim() && !sections.length" icon="i-lucide-search-x" :title="`Aucun plat pour « ${query} »`" class="py-16" />
        <Transition :name="slide" mode="out-in">
          <div :key="query.trim() ? 'search' : (activeId ?? 'none')">
            <!-- Raccourcis vers les sous-catégories -->
            <div v-if="subSections.length" class="relative pt-4">
            <div ref="subsEl" class="no-scrollbar flex cursor-grab gap-2 overflow-x-auto px-4">
              <button
                v-for="sub in subSections"
                :key="sub.id"
                type="button"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-default px-3 py-1.5 text-sm font-medium text-highlighted transition hover:bg-elevated"
                @click="goToSub(sub.id)"
              >
                <UIcon :name="sub.icon" class="size-4 text-primary" />
                {{ sub.name }}
                <span class="text-xs text-muted">{{ sub.items.length }}</span>
              </button>
            </div>
          <div v-if="subsScroll.canLeft.value" class="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center bg-linear-to-r from-default via-default/80 to-transparent pl-1">
            <button type="button" class="pointer-events-auto hidden size-8 items-center justify-center rounded-full bg-default shadow-md ring-1 ring-black/5 hover:bg-elevated sm:flex" aria-label="Défiler vers la gauche" @click="subsScroll.scrollBy(-1)">
              <UIcon name="i-lucide-chevron-left" class="size-5" />
            </button>
          </div>
          <div v-if="subsScroll.canRight.value" class="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-linear-to-l from-default via-default/80 to-transparent pr-1">
            <button type="button" class="pointer-events-auto hidden size-8 items-center justify-center rounded-full bg-default shadow-md ring-1 ring-black/5 hover:bg-elevated sm:flex" aria-label="Défiler vers la droite" @click="subsScroll.scrollBy(1)">
              <UIcon name="i-lucide-chevron-right" class="size-5" />
            </button>
          </div>
            </div>

            <section v-for="s in sections" :id="s.sub ? `sub-${s.id}` : undefined" :key="s.id" :class="s.sub ? 'pt-4' : 'pt-6'">
              <!-- Sous-catégorie : bandeau avec icône et nombre de plats -->
              <div v-if="s.sub" class="mx-4 flex items-center gap-3 rounded-xl bg-elevated px-3 py-2.5">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UIcon :name="s.icon" class="size-5" />
                </span>
                <div class="min-w-0 flex-1">
                  <h3 class="truncate font-bold text-highlighted">{{ s.name }}</h3>
                  <p v-if="s.description" class="truncate text-xs text-muted">{{ s.description }}</p>
                </div>
                <span class="shrink-0 text-xs font-medium text-muted">{{ s.items.length }} plat{{ s.items.length > 1 ? 's' : '' }}</span>
              </div>
              <!-- Catégorie principale -->
              <template v-else>
                <div class="flex items-baseline justify-between gap-3 px-4">
                  <h2 class="text-xl font-bold tracking-tight text-highlighted">{{ s.name }}</h2>
                  <span class="shrink-0 text-xs font-medium text-muted">{{ s.items.length }} plat{{ s.items.length > 1 ? 's' : '' }}</span>
                </div>
                <p v-if="s.description" class="mt-0.5 px-4 text-sm text-muted">{{ s.description }}</p>
              </template>
              <div class="mt-1 divide-y divide-default">
                <MenuItemCard
                  v-for="item in s.items"
                  :key="item.id"
                  :item="item"
                  :icon="s.icon"
                  :in-cart="cart.quantityOf(item.id)"
                  @select="select(item, s.icon)"
                />
              </div>
            </section>

            <!-- Catégorie suivante -->
            <div v-if="!query.trim() && nextCategory" class="px-4 pt-6">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl bg-elevated px-4 py-3.5 text-left transition hover:bg-accented/50"
                @click="goTo(nextCategory.id)"
              >
                <UIcon :name="categoryIcon(nextCategory.name)" class="size-5" />
                <span class="flex-1">
                  <span class="block text-xs text-muted">Catégorie suivante</span>
                  <span class="block font-semibold text-highlighted">{{ nextCategory.name }}</span>
                </span>
                <UIcon name="i-lucide-arrow-right" class="size-5" />
              </button>
            </div>
          </div>
        </Transition>
      </main>

      <!-- Panier flottant -->
      <Transition
        enter-from-class="scale-50 opacity-0"
        leave-to-class="scale-50 opacity-0"
        enter-active-class="transition duration-200"
        leave-active-class="transition duration-150"
      >
        <NuxtLink
          v-if="cart.count"
          :to="`/r/${slug}/panier`"
          class="fixed right-[max(1rem,calc((100vw-32rem)/2+1rem))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 flex size-16 items-center justify-center rounded-full bg-inverted text-inverted shadow-xl ring-4 ring-default transition hover:scale-105 active:scale-95"
          :aria-label="`Voir le panier : ${cart.count} article${cart.count > 1 ? 's' : ''}`"
        >
          <UIcon name="i-lucide-shopping-cart" class="size-7" />
          <span
            class="absolute -top-1.5 -right-1.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1.5 text-sm font-bold text-white shadow-md ring-2 ring-default"
            :class="bump && 'cart-bump'"
            @animationend="bump = false"
          >
            {{ cart.count }}
          </span>
        </NuxtLink>
      </Transition>

      <MenuItemSheet v-model:open="sheetOpen" :item="selected" :icon="selectedIcon" />
    </template>

  </div>
</template>

<style scoped>
/* Rebond du compteur du panier après un ajout. */
.cart-bump {
  animation: cart-bump 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
}
@keyframes cart-bump {
  40% {
    transform: scale(1.35);
  }
}

/* Glissement entre catégories : le contenu part dans le sens de la navigation. */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.22s ease;
}
.slide-left-enter-from,
.slide-right-leave-to {
  transform: translateX(28%);
  opacity: 0;
}
.slide-left-leave-to,
.slide-right-enter-from {
  transform: translateX(-28%);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: none;
  }
}
</style>
