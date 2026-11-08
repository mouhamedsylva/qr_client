<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{ title: string; subtitle?: string; back?: RouteLocationRaw }>();
</script>

<template>
  <header class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-default bg-default/95 px-2 backdrop-blur">
    <UButton v-if="back" :to="back" icon="i-lucide-arrow-left" color="neutral" variant="ghost" aria-label="Retour" />
    <div class="min-w-0 flex-1" :class="!back && 'pl-2'">
      <p class="truncate font-semibold text-highlighted">{{ title }}</p>
      <p v-if="subtitle" class="truncate text-xs text-muted">{{ subtitle }}</p>
    </div>
    <slot name="right" />
  </header>
</template>
