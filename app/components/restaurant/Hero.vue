<script setup lang="ts">
/**
 * En-tête du restaurant, style application de commande : grande bannière,
 * logo en médaillon, nom, ligne d'informations (note, horaires) et pastilles.
 */
import type { PublicRestaurant } from '~/types/api';
import { localClock, openingSummary } from '~/utils/hours';

const props = defineProps<{
  restaurant: PublicRestaurant;
  tableLabel?: string | null;
  counter?: boolean;
  rating?: { average: number | null; count: number } | null;
  /** Temps de préparation indicatif (minutes). */
  prepMinutes?: number | null;
}>();
defineEmits<{ info: [] }>();
const venue = useVenueStore();
const modeOpen = ref(false);

const opening = computed(() => {
  const { day, minutes } = localClock(props.restaurant.timezone);
  return props.restaurant.reason === 'CLOSURE'
    ? 'Fermeture exceptionnelle'
    : openingSummary(props.restaurant.openingHours, day, minutes, props.restaurant.isOpen);
});
</script>

<template>
  <section>
    <!-- Bannière -->
    <div class="relative h-52 overflow-hidden bg-elevated">
      <img v-if="restaurant.bannerUrl" :src="restaurant.bannerUrl" alt="" class="size-full object-cover" loading="eager">
      <div v-else class="size-full bg-linear-to-br from-primary-400 via-primary-600 to-primary-800" />
      <div class="absolute inset-0 bg-linear-to-b from-black/35 via-transparent to-black/10" />
    </div>

    <div class="relative px-4">
      <!-- Logo en médaillon -->
      <div class="-mt-9 flex size-[4.5rem] items-center justify-center overflow-hidden rounded-full border-4 border-default bg-default shadow-md">
        <img v-if="restaurant.logoUrl" :src="restaurant.logoUrl" :alt="restaurant.name" class="size-full object-cover">
        <span v-else class="text-2xl font-bold text-primary">{{ restaurant.name.charAt(0) }}</span>
      </div>

      <h1 class="mt-2 text-[1.75rem] leading-tight font-bold tracking-tight text-highlighted">{{ restaurant.name }}</h1>

      <!-- Ligne d'informations -->
      <button type="button" class="mt-1 flex flex-wrap items-center gap-x-1.5 text-left text-sm text-muted" @click="$emit('info')">
        <template v-if="rating?.average">
          <UIcon name="i-lucide-star" class="size-3.5 text-highlighted" />
          <span class="font-semibold text-highlighted">{{ rating.average.toLocaleString('fr-FR') }}</span>
          <span>({{ rating.count }})</span>
          <span aria-hidden="true">·</span>
        </template>
        <span :class="restaurant.isOpen ? '' : 'font-medium text-error'">{{ opening }}</span>
        <span aria-hidden="true">·</span>
        <span class="font-medium text-highlighted underline-offset-2 hover:underline">Infos</span>
      </button>

      <!-- Pastilles -->
      <div class="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        <UPopover v-model:open="modeOpen">
          <button type="button" class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-sm font-medium hover:bg-accented/60">
            <UIcon :name="venue.mode === 'DINE_IN' ? 'i-lucide-utensils' : 'i-lucide-shopping-bag'" class="size-4" />
            {{ venue.modeLabel }}
            <UIcon name="i-lucide-chevron-down" class="size-3.5 text-muted" />
          </button>
          <template #content>
            <div class="w-56 p-1.5">
              <button
                v-for="m in [
                  { value: 'DINE_IN' as const, label: 'Sur place', icon: 'i-lucide-utensils' },
                  { value: 'TAKEAWAY' as const, label: 'À emporter', icon: 'i-lucide-shopping-bag' },
                ]"
                :key="m.value"
                type="button"
                class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-elevated"
                @click="venue.setOrderMode(m.value); modeOpen = false"
              >
                <UIcon :name="m.icon" class="size-4" />
                <span class="flex-1 font-medium">{{ m.label }}</span>
                <UIcon v-if="venue.mode === m.value" name="i-lucide-check" class="size-4 text-primary" />
              </button>
            </div>
          </template>
        </UPopover>
        <span v-if="prepMinutes" class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-sm font-medium">
          <UIcon name="i-lucide-timer" class="size-4" />
          ~{{ prepMinutes }} min
        </span>
        <span v-if="restaurant.city" class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-sm font-medium">
          <UIcon name="i-lucide-map-pin" class="size-4" />
          {{ restaurant.city }}
        </span>
      </div>
    </div>
  </section>
</template>
