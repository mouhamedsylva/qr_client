<script setup lang="ts">
// Point d'entrée du QR code : /t/<jeton> → établissement + table + menu, puis le menu.
useHead({ title: 'Ouverture du menu…' });

const route = useRoute();
const venue = useVenueStore();
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const res = await venue.resolveQr(String(route.params.token));
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
    <template v-if="!error">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
      <p class="text-muted">Ouverture du menu…</p>
    </template>
    <template v-else>
      <div class="flex size-16 items-center justify-center rounded-full bg-error/10">
        <UIcon name="i-lucide-qr-code" class="size-8 text-error" />
      </div>
      <h1 class="font-display text-xl font-semibold text-highlighted">QR code non reconnu</h1>
      <p class="text-muted">{{ error }}</p>
      <UButton to="/" color="neutral" variant="outline" label="Retour à l’accueil" />
    </template>
  </div>
</template>
