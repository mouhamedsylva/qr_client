<script setup lang="ts">
import type { OrderMode, OrderStatus } from '~/types/api';
import { STATUS, STEPS, stepIndex } from '~/utils/order-status';

const props = defineProps<{ status: OrderStatus; mode: OrderMode }>();
const current = computed(() => stepIndex(props.status));
const label = (s: OrderStatus) => (s === 'SERVED' && props.mode === 'TAKEAWAY' ? 'Retirée' : STATUS[s].label);
</script>

<template>
  <ol class="flex items-start" aria-label="Avancement de la commande">
    <li v-for="(step, i) in STEPS" :key="step" class="flex flex-1 flex-col items-center gap-1.5 text-center">
      <div class="flex w-full items-center">
        <span class="h-0.5 flex-1" :class="i === 0 ? 'opacity-0' : i <= current ? 'bg-primary' : 'bg-accented'" />
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition"
          :class="[
            i < current && 'border-primary bg-primary text-inverted',
            i === current && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
            i > current && 'border-accented text-dimmed',
          ]"
          :aria-current="i === current ? 'step' : undefined"
        >
          <UIcon :name="i < current ? 'i-lucide-check' : STATUS[step].icon" class="size-4" />
        </span>
        <span class="h-0.5 flex-1" :class="i === STEPS.length - 1 ? 'opacity-0' : i < current ? 'bg-primary' : 'bg-accented'" />
      </div>
      <span class="text-[11px] leading-tight" :class="i <= current ? 'font-medium text-highlighted' : 'text-dimmed'">{{ label(step) }}</span>
    </li>
  </ol>
</template>
