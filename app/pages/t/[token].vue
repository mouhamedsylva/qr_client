<script setup lang="ts">
// Point d'entrée du QR code : /t/<jeton> → établissement + table + menu,
// écran d'accueil aux couleurs du restaurant, puis le menu.
import type { QrResolution } from '~/types/api';

const route = useRoute();
const venue = useVenueStore();
const error = ref<string | null>(null);
const resolved = ref<QrResolution | null>(null);

useHead({ title: () => resolved.value?.restaurant.name ?? 'Ouverture du menu…' });

/** Durée d'affichage de l'écran d'accueil (raccourcie si l'utilisateur limite les animations). */
const SPLASH_MS = 1600;
/** On n'attend pas indéfiniment le chargement des images sur un réseau lent. */
const PRELOAD_TIMEOUT_MS = 2500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Précharge les images pour que la bannière et le logo n'apparaissent pas par morceaux. */
function preload(urls: (string | null)[]): Promise<unknown> {
  const loads = urls.filter((u): u is string => !!u).map(
    (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = src;
      }),
  );
  return Promise.race([Promise.all(loads), sleep(PRELOAD_TIMEOUT_MS)]);
}

onMounted(async () => {
  try {
    const res = await venue.resolveQr(String(route.params.token));
    await preload([res.restaurant.bannerUrl, res.restaurant.logoUrl]);
    resolved.value = res;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    await sleep(reduced ? 700 : SPLASH_MS);
    // L'écran d'accueil reste affiché jusqu'à l'ouverture du menu.
    await navigateTo(`/r/${res.restaurant.slug}`, { replace: true });
  } catch (err) {
    error.value =
      apiErrorCode(err) === 'INVALID_QR' || (err as { statusCode?: number }).statusCode === 404
        ? 'Ce QR code n’est plus valide. Demandez au personnel de vous indiquer le bon QR code.'
        : apiErrorMessage(err);
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
    <!-- Écran d'accueil du restaurant -->
    <RestaurantSplash
      v-if="resolved"
      :restaurant="resolved.restaurant"
      :table-label="resolved.table.kind === 'TABLE' ? resolved.table.label : null"
      :counter="resolved.table.kind === 'COUNTER'"
    />

    <template v-if="!resolved && !error">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
      <p class="text-muted">Ouverture du menu…</p>
    </template>
    <template v-else-if="error">
      <div class="flex size-16 items-center justify-center rounded-full bg-error/10">
        <UIcon name="i-lucide-qr-code" class="size-8 text-error" />
      </div>
      <h1 class="font-display text-xl font-semibold text-highlighted">QR code non reconnu</h1>
      <p class="text-muted">{{ error }}</p>
      <UButton to="/" color="neutral" variant="outline" label="Retour à l’accueil" />
    </template>
  </div>
</template>
