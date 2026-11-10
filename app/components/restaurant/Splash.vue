<script setup lang="ts">
/**
 * Écran d'accueil affiché après le scan du QR code : bannière en fond,
 * logo, nom du restaurant et table. Plein écran, aux couleurs du restaurant.
 */
import type { PublicRestaurant } from '~/types/api';

defineProps<{ restaurant: PublicRestaurant; tableLabel?: string | null; counter?: boolean }>();
</script>

<template>
  <div class="splash fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-primary-900 text-white">
    <!-- Fond : bannière assombrie, ou dégradé de la couleur du restaurant -->
    <img
      v-if="restaurant.bannerUrl"
      :src="restaurant.bannerUrl"
      alt=""
      class="splash-bg absolute inset-0 size-full object-cover"
    >
    <div v-else class="absolute inset-0 bg-linear-to-br from-primary-500 via-primary-700 to-primary-950" />
    <div class="absolute inset-0 bg-linear-to-b from-black/30 via-black/45 to-black/80" />

    <div class="splash-content relative flex flex-col items-center px-8 text-center">
      <div class="flex size-28 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl ring-4 ring-white/30">
        <img v-if="restaurant.logoUrl" :src="restaurant.logoUrl" :alt="restaurant.name" class="size-full object-cover">
        <span v-else class="font-display text-5xl font-semibold text-primary-600">{{ restaurant.name.charAt(0) }}</span>
      </div>

      <p class="mt-6 text-sm tracking-[0.2em] text-white/80 uppercase">Bienvenue chez</p>
      <h1 class="mt-1 font-display text-3xl leading-tight font-semibold text-balance drop-shadow">{{ restaurant.name }}</h1>

      <span
        v-if="tableLabel || counter"
        class="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur"
      >
        <UIcon :name="counter ? 'i-lucide-shopping-bag' : 'i-lucide-armchair'" class="size-4" />
        {{ counter ? 'Commande à emporter' : tableLabel }}
      </span>
    </div>

    <div class="splash-loader absolute bottom-[max(3rem,env(safe-area-inset-bottom))] flex items-center gap-2 text-sm text-white/80">
      <span class="dot" /><span class="dot" /><span class="dot" />
      <span class="ml-1">Ouverture du menu</span>
    </div>
  </div>
</template>

<style scoped>
.splash {
  animation: splash-in 0.35s ease-out both;
}
.splash-bg {
  animation: splash-zoom 2.4s ease-out both;
}
.splash-content {
  animation: splash-rise 0.6s 0.1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
  animation: splash-dot 1s infinite ease-in-out;
}
.dot:nth-child(2) {
  animation-delay: 0.15s;
}
.dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes splash-in {
  from {
    opacity: 0;
  }
}
@keyframes splash-zoom {
  from {
    transform: scale(1.12);
  }
}
@keyframes splash-rise {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
}
@keyframes splash-dot {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .splash,
  .splash-bg,
  .splash-content,
  .dot {
    animation: none;
  }
}
</style>
