<script setup lang="ts">
/** Carte du carrousel « Populaires » : grande photo, nom et prix. */
import type { MenuItem } from '~/types/api';

defineProps<{ item: MenuItem; inCart: number; icon: string }>();
defineEmits<{ select: [] }>();
const { money } = useMoney();
const broken = ref(false);
</script>

<template>
  <button type="button" class="w-40 shrink-0 snap-start text-left" @click="$emit('select')">
    <div class="relative">
      <div class="aspect-square overflow-hidden rounded-xl bg-elevated">
        <img
          v-if="item.images[0] && !broken"
          :src="item.images[0]"
          :alt="item.name"
          class="size-full object-cover"
          loading="lazy"
          decoding="async"
          @error="broken = true"
        >
        <div v-else class="flex size-full items-center justify-center bg-linear-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900">
          <UIcon :name="icon" class="size-12 text-primary-400 dark:text-primary-600" />
        </div>
      </div>
      <span
        class="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full text-sm font-bold shadow-md ring-2 ring-default"
        :class="inCart ? 'bg-inverted text-inverted' : 'bg-primary text-white'"
        aria-hidden="true"
      >
        <template v-if="inCart">{{ inCart }}</template>
        <UIcon v-else name="i-lucide-plus" class="size-5 stroke-[2.5]" />
      </span>
    </div>
    <p class="mt-2 line-clamp-1 text-sm font-semibold text-highlighted">{{ item.name }}</p>
    <p class="tabular text-sm text-muted">{{ money(item.priceAmount) }}</p>
  </button>
</template>
