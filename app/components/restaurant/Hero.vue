<script setup lang="ts">
import type { PublicRestaurant } from '~/types/api';
import { localDay, slotsLabel } from '~/utils/hours';

const props = defineProps<{ restaurant: PublicRestaurant; tableLabel?: string | null; counter?: boolean }>();

const todayHours = computed(() =>
  slotsLabel(props.restaurant.openingHours, localDay(props.restaurant.timezone)),
);
const closedLabel = computed(() =>
  props.restaurant.reason === 'CLOSURE' ? 'Fermeture exceptionnelle' : 'Fermé',
);
</script>

<template>
  <section>
    <div class="relative h-36 overflow-hidden bg-primary-100 dark:bg-primary-950">
      <img
        v-if="restaurant.bannerUrl"
        :src="restaurant.bannerUrl"
        alt=""
        class="size-full object-cover"
        loading="eager"
      >
      <div v-else class="size-full bg-linear-to-br from-primary-400 to-primary-700" />
      <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
    </div>

    <div class="relative -mt-10 px-4">
      <div class="flex items-end gap-3">
        <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-default bg-default shadow-md">
          <img v-if="restaurant.logoUrl" :src="restaurant.logoUrl" :alt="restaurant.name" class="size-full object-cover">
          <span v-else class="font-display text-3xl font-semibold text-primary">{{ restaurant.name.charAt(0) }}</span>
        </div>
        <div class="flex flex-wrap gap-1.5 pb-1">
          <UBadge
            :color="restaurant.isOpen ? 'success' : 'error'"
            variant="subtle"
            :icon="restaurant.isOpen ? 'i-lucide-circle-check' : 'i-lucide-moon'"
            :label="restaurant.isOpen ? 'Ouvert' : closedLabel"
          />
          <UBadge v-if="tableLabel" color="primary" variant="solid" icon="i-lucide-armchair" :label="tableLabel" />
          <UBadge v-else-if="counter" color="primary" variant="solid" icon="i-lucide-shopping-bag" label="À emporter" />
        </div>
      </div>

      <h1 class="mt-3 font-display text-2xl font-semibold text-highlighted">{{ restaurant.name }}</h1>
      <p v-if="restaurant.description" class="mt-1 line-clamp-2 text-sm text-muted">{{ restaurant.description }}</p>
      <p class="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <UIcon name="i-lucide-clock" class="size-3.5" />
        Aujourd'hui : {{ todayHours }}
        <span v-if="restaurant.city">· {{ restaurant.city }}</span>
      </p>
    </div>
  </section>
</template>
