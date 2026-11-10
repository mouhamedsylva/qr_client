<script setup lang="ts">
/** Ligne de plat : photo à gauche, texte au centre, bouton « + » (ou quantité au panier) à droite. */
import type { MenuItem } from '~/types/api';
import { DIETARY_TAGS } from '~/utils/menu';

const props = withDefaults(defineProps<{ item: MenuItem; inCart: number; icon?: string }>(), {
  icon: 'i-lucide-utensils',
});
defineEmits<{ select: [] }>();

const { money } = useMoney();
const tags = computed(() => props.item.dietaryTags.map((t) => DIETARY_TAGS[t]).filter(Boolean));
/** Image introuvable (lien cassé) : vignette de remplacement. */
const broken = ref(false);
const fromPrice = computed(() => props.item.optionGroups.some((g) => g.options.some((o) => o.priceDelta > 0)));
</script>

<template>
  <button
    type="button"
    class="group flex w-full items-start gap-4 px-4 py-4 text-left transition active:bg-elevated/60 disabled:cursor-not-allowed"
    :class="!item.available && 'opacity-50'"
    :disabled="!item.available"
    @click="$emit('select')"
  >
    <!-- Photo, ou vignette à l'icône de la catégorie -->
    <div class="relative shrink-0">
      <div class="size-28 overflow-hidden rounded-xl bg-elevated">
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
          <UIcon :name="icon" class="size-10 text-primary-400 dark:text-primary-600" />
        </div>
      </div>
    </div>
    <div class="min-w-0 flex-1">
      <p class="leading-snug font-semibold text-highlighted">{{ item.name }}</p>
      <p class="mt-1 text-sm text-highlighted">
        <span v-if="fromPrice" class="text-muted">À partir de </span>
        <span class="tabular">{{ money(item.priceAmount) }}</span>
      </p>
      <p v-if="item.description" class="mt-1 line-clamp-2 text-sm text-muted">{{ item.description }}</p>
      <div v-if="!item.available || tags.length || item.prepTimeMinutes" class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span v-if="!item.available" class="font-semibold text-error">Épuisé</span>
        <span v-for="t in tags" :key="t!.label" class="inline-flex items-center gap-1">
          <UIcon :name="t!.icon" class="size-3.5" /> {{ t!.label }}
        </span>
        <span v-if="item.prepTimeMinutes" class="inline-flex items-center gap-1">
          <UIcon name="i-lucide-timer" class="size-3.5" /> {{ item.prepTimeMinutes }} min
        </span>
      </div>
    </div>
    <!-- Bouton d'ajout (couleur du restaurant), ou quantité déjà au panier -->
    <span
      v-if="item.available"
      class="flex size-10 shrink-0 items-center justify-center self-center rounded-full font-bold shadow-sm transition group-hover:scale-110 group-active:scale-95"
      :class="inCart ? 'bg-inverted text-inverted' : 'bg-primary text-white'"
      :aria-label="inCart ? `${inCart} au panier` : 'Ajouter'"
    >
      <template v-if="inCart">{{ inCart }}</template>
      <UIcon v-else name="i-lucide-plus" class="size-5 stroke-[2.5]" />
    </span>
  </button>
</template>
