<script setup lang="ts">
import type { CustomerOrder } from '~/types/api';

const props = defineProps<{ items: CustomerOrder['items']; currency: string }>();
const { money } = useMoney();

/** Lignes regroupées par envoi : la commande initiale, puis chaque ajout (CMD-06). */
const batches = computed(() => {
  const groups = new Map<number, CustomerOrder['items']>();
  for (const item of props.items) groups.set(item.batch, [...(groups.get(item.batch) ?? []), item]);
  return [...groups.entries()].sort(([a], [b]) => a - b);
});
</script>

<template>
  <div class="space-y-3">
    <div v-for="([batch, lines], i) in batches" :key="batch">
      <p v-if="batches.length > 1" class="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
        {{ i === 0 ? 'Commande' : `Ajout n°${i}` }}
      </p>
      <ul class="divide-y divide-default">
        <li v-for="line in lines" :key="line.id" class="flex gap-3 py-2">
          <span class="tabular w-6 shrink-0 font-semibold text-primary">{{ line.quantity }}×</span>
          <div class="min-w-0 flex-1">
            <p class="text-highlighted">{{ line.name }}</p>
            <p v-if="line.options.length" class="text-xs text-muted">{{ line.options.map((o) => o.name).join(', ') }}</p>
            <p v-if="line.notes" class="text-xs text-muted italic">« {{ line.notes }} »</p>
          </div>
          <span class="tabular text-sm">{{ money(line.lineTotal, currency) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
