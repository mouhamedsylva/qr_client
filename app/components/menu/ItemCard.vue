<script setup lang="ts">
import type { MenuItem } from '~/types/api';
import { DIETARY_TAGS } from '~/utils/menu';

const props = defineProps<{ item: MenuItem; inCart: number }>();
defineEmits<{ select: [] }>();

const { money } = useMoney();
const tags = computed(() => props.item.dietaryTags.map((t) => DIETARY_TAGS[t]).filter(Boolean));
const fromPrice = computed(() => props.item.optionGroups.some((g) => g.options.some((o) => o.priceDelta > 0)));
</script>

<template>
  <button
    type="button"
    class="flex w-full gap-3 rounded-xl p-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed"
    :class="item.available ? 'hover:bg-elevated/60' : 'opacity-55'"
    :disabled="!item.available"
    @click="$emit('select')"
  >
    <div class="min-w-0 flex-1">
      <p class="font-medium text-highlighted">
        <span v-if="inCart" class="mr-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-inverted">
          {{ inCart }}
        </span>
        {{ item.name }}
      </p>
      <p v-if="item.description" class="mt-0.5 line-clamp-2 text-sm text-muted">{{ item.description }}</p>
      <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="tabular font-semibold text-highlighted">
          <span v-if="fromPrice" class="text-xs font-normal text-muted">dès </span>{{ money(item.priceAmount) }}
        </span>
        <UBadge v-if="!item.available" color="neutral" variant="subtle" size="sm" label="Épuisé" />
        <UIcon v-for="t in tags" :key="t!.label" :name="t!.icon" class="size-4 text-muted" :aria-label="t!.label" />
        <span v-if="item.prepTimeMinutes" class="text-xs text-dimmed">· {{ item.prepTimeMinutes }} min</span>
      </div>
    </div>
    <div v-if="item.images[0]" class="relative size-24 shrink-0 overflow-hidden rounded-xl bg-elevated">
      <img :src="item.images[0]" :alt="item.name" class="size-full object-cover" loading="lazy">
      <span
        v-if="item.available"
        class="absolute right-1.5 bottom-1.5 flex size-7 items-center justify-center rounded-full bg-default text-primary shadow"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-plus" class="size-4" />
      </span>
    </div>
    <span
      v-else-if="item.available"
      class="flex size-8 shrink-0 items-center justify-center self-center rounded-full bg-primary/10 text-primary"
      aria-hidden="true"
    >
      <UIcon name="i-lucide-plus" class="size-4" />
    </span>
  </button>
</template>
