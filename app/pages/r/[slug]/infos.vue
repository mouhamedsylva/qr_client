<script setup lang="ts">
import type { LoyaltyProgram, ReviewList } from '~/types/api';
import { localDay, weekSchedule } from '~/utils/hours';

const venue = useVenueStore();
const api = useApi();
const { money, dateTime } = useMoney();
const { slug } = useVenueLoader();

useHead({ title: () => (venue.restaurant ? `${venue.restaurant.name} · Infos` : 'Infos') });

const { data: reviews } = useAsyncData(
  () => `reviews-${slug.value}`,
  () => api<ReviewList>(`/public/restaurants/${slug.value}/reviews?limit=10`, { silent: true }),
  { watch: [slug] },
);
const { data: loyalty } = useAsyncData(
  () => `loyalty-${slug.value}`,
  () => api<LoyaltyProgram>(`/public/restaurants/${slug.value}/loyalty`, { silent: true }),
  { watch: [slug] },
);

const week = computed(() => (venue.restaurant ? weekSchedule(venue.restaurant.openingHours) : []));
const today = computed(() => (venue.restaurant ? localDay(venue.restaurant.timezone) : -1));
const mapsUrl = computed(() => {
  const r = venue.restaurant;
  if (!r?.address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.name, r.address, r.city].filter(Boolean).join(', '))}`;
});
const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'i-lucide-facebook',
  instagram: 'i-lucide-instagram',
  tiktok: 'i-lucide-music-2',
  website: 'i-lucide-globe',
  whatsapp: 'i-lucide-message-circle',
};
const socials = computed(() => Object.entries(venue.restaurant?.socialLinks ?? {}).filter(([, url]) => !!url));
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppTopBar :title="venue.restaurant?.name ?? 'Informations'" :back="`/r/${slug}`" />

    <main v-if="venue.restaurant" class="flex-1 space-y-6 p-4 pb-10">
      <p v-if="venue.restaurant.description" class="text-muted">{{ venue.restaurant.description }}</p>

      <!-- Coordonnées -->
      <section class="space-y-2">
        <UButton
          v-if="mapsUrl"
          :to="mapsUrl"
          target="_blank"
          color="neutral"
          variant="soft"
          block
          class="justify-start"
          icon="i-lucide-map-pin"
          :label="[venue.restaurant.address, venue.restaurant.city].filter(Boolean).join(', ')"
        />
        <UButton
          v-if="venue.restaurant.phone"
          :to="`tel:${venue.restaurant.phone}`"
          color="neutral"
          variant="soft"
          block
          class="justify-start"
          icon="i-lucide-phone"
          :label="venue.restaurant.phone"
        />
        <div v-if="socials.length" class="flex gap-2">
          <UButton
            v-for="[network, url] in socials"
            :key="network"
            :to="url"
            target="_blank"
            color="neutral"
            variant="outline"
            :icon="SOCIAL_ICONS[network] ?? 'i-lucide-link'"
            :aria-label="network"
          />
        </div>
      </section>

      <!-- Horaires -->
      <section>
        <h2 class="mb-2 font-display text-lg font-semibold">Horaires</h2>
        <ul class="divide-y divide-default rounded-xl border border-default text-sm">
          <li
            v-for="d in week"
            :key="d.day"
            class="flex justify-between px-4 py-2.5"
            :class="d.day === today && 'bg-primary/5 font-semibold text-highlighted'"
          >
            <span>{{ d.name }}</span>
            <span :class="d.label === 'Fermé' && 'text-muted'">{{ d.label }}</span>
          </li>
        </ul>
      </section>

      <!-- Fidélité -->
      <section v-if="loyalty?.active" class="rounded-xl bg-primary/5 p-4">
        <h2 class="flex items-center gap-2 font-display text-lg font-semibold">
          <UIcon name="i-lucide-heart-handshake" class="size-5 text-primary" /> Programme de fidélité
        </h2>
        <p class="mt-1 text-sm text-muted">
          {{ loyalty.pointsPerUnit }} point(s) tous les {{ money(loyalty.unitAmount) }} dépensés, avec un compte client.
        </p>
        <ul v-if="loyalty.rewards.length" class="mt-3 space-y-1 text-sm">
          <li v-for="r in loyalty.rewards" :key="r.id" class="flex justify-between">
            <span>{{ r.name }}</span>
            <span class="font-medium text-primary">{{ r.pointsCost }} pts</span>
          </li>
        </ul>
        <UButton to="/compte" class="mt-3" size="sm" variant="soft" label="Créer mon compte" />
      </section>

      <!-- Avis -->
      <section v-if="reviews">
        <div class="mb-2 flex items-baseline justify-between">
          <h2 class="font-display text-lg font-semibold">Avis</h2>
          <p v-if="reviews.averageRating" class="flex items-center gap-1 text-sm">
            <UIcon name="i-lucide-star" class="size-4 text-amber-500" />
            <span class="font-semibold">{{ reviews.averageRating.toLocaleString('fr-FR') }}</span>
            <span class="text-muted">({{ reviews.meta.total }})</span>
          </p>
        </div>
        <p v-if="!reviews.data.length" class="text-sm text-muted">Pas encore d’avis.</p>
        <ul class="space-y-3">
          <li v-for="r in reviews.data" :key="r.id" class="rounded-xl border border-default p-3">
            <div class="flex items-center justify-between">
              <UInputRating :model-value="r.rating" readonly size="sm" />
              <span class="text-xs text-muted">{{ dateTime(r.createdAt) }}</span>
            </div>
            <p v-if="r.comment" class="mt-1.5 text-sm">{{ r.comment }}</p>
            <p v-if="r.authorName" class="mt-1 text-xs text-muted">— {{ r.authorName }}</p>
            <div v-if="r.reply" class="mt-2 rounded-lg bg-elevated p-2.5 text-sm">
              <p class="text-xs font-semibold text-muted">Réponse du restaurant</p>
              <p>{{ r.reply }}</p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
