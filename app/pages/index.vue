<script setup lang="ts">
// Accueil hors QR : invitation à scanner, et commandes récentes de l'appareil.
useHead({ title: 'QR-Order' });

const orders = useOrdersStore();
const auth = useAuthStore();
const venue = useVenueStore();
</script>

<template>
  <div class="flex flex-1 flex-col">
    <div class="flex items-center justify-between px-4 pt-4">
      <div class="flex items-center gap-2">
        <img src="/favicon.svg" alt="" class="size-8">
        <span class="font-display text-lg font-semibold">QR-Order</span>
      </div>
      <UButton
        to="/compte"
        color="neutral"
        variant="ghost"
        icon="i-lucide-circle-user"
        :label="auth.isLoggedIn ? auth.user?.firstName : 'Mon compte'"
      />
    </div>

    <section class="flex flex-col items-center px-8 pt-16 pb-10 text-center">
      <div class="mb-6 flex size-24 items-center justify-center rounded-3xl bg-primary/10">
        <UIcon name="i-lucide-scan-qr-code" class="size-12 text-primary" />
      </div>
      <h1 class="font-display text-3xl font-semibold text-highlighted">Scannez, commandez, savourez</h1>
      <p class="mt-3 text-muted">
        Scannez le QR code posé sur votre table avec l’appareil photo de votre téléphone pour ouvrir le menu.
      </p>
      <UButton
        v-if="venue.slug"
        :to="`/r/${venue.slug}`"
        class="mt-6"
        size="lg"
        icon="i-lucide-book-open"
        :label="`Revenir au menu de ${venue.restaurant?.name}`"
      />
    </section>

    <section v-if="orders.recent.length" class="px-4 pb-8">
      <h2 class="mb-2 text-sm font-semibold text-muted">Vos commandes récentes</h2>
      <ul class="divide-y divide-default rounded-xl border border-default">
        <li v-for="o in orders.recent" :key="o.id">
          <NuxtLink :to="`/commande/${o.id}`" class="flex items-center gap-3 px-4 py-3 hover:bg-elevated/50">
            <UIcon name="i-lucide-receipt-text" class="size-5 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-highlighted">{{ o.restaurantName }}</p>
              <p class="text-xs text-muted">Commande n°{{ o.number }} · {{ formatDateTime(o.createdAt) }}</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed" />
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
