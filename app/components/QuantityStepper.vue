<script setup lang="ts">
const props = withDefaults(defineProps<{ min?: number; max?: number; size?: 'sm' | 'md' | 'lg' }>(), {
  min: 1,
  max: 50,
  size: 'md',
});
const model = defineModel<number>({ required: true });

const minusIcon = computed(() => (model.value <= 1 && props.min === 0 ? 'i-lucide-trash-2' : 'i-lucide-minus'));
</script>

<template>
  <div class="inline-flex items-center gap-1 rounded-full bg-elevated p-0.5">
    <UButton
      :icon="minusIcon"
      color="neutral"
      variant="ghost"
      :size="size"
      class="rounded-full"
      :disabled="model <= min"
      :aria-label="model <= 1 && min === 0 ? 'Retirer' : 'Diminuer la quantité'"
      @click="model = model - 1"
    />
    <span class="tabular min-w-6 text-center font-semibold" aria-live="polite">{{ model }}</span>
    <UButton
      icon="i-lucide-plus"
      color="neutral"
      variant="ghost"
      :size="size"
      class="rounded-full"
      :disabled="model >= max"
      aria-label="Augmenter la quantité"
      @click="model = model + 1"
    />
  </div>
</template>
