<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import type { CustomerOrder } from '~/types/api';
import {
  canAddItems,
  canCancel,
  canReview,
  isFailed,
  isSettled,
  MODE_LABEL,
  PAYMENT_STATUS,
  readyHint,
  STATUS,
} from '~/utils/order-status';

const route = useRoute();
const orders = useOrdersStore();
const venue = useVenueStore();
const cart = useCartStore();
const api = useApi();
const toast = useToast();
const { money, time } = useMoney();

const orderId = String(route.params.id);
// Jeton : mémorisé à la commande, ou transmis par le compte client (?t=…&s=…).
const token = orders.tokenFor(orderId) ?? (route.query.t as string | undefined) ?? null;
const tracked = orders.tracked.find((o) => o.id === orderId);
const slug = tracked?.slug ?? (route.query.s as string | undefined) ?? null;

useHead({ title: 'Suivi de commande' });

const tracking = token ? useOrderTracking(orderId, token) : null;
const order = computed(() => tracking?.order.value ?? null);
const payments = computed(() => tracking?.payments.value ?? null);
const notFound = computed(() => !!tracking?.error.value && !order.value);

// Établissement : devise, couleurs, lien vers le menu.
onMounted(() => {
  if (slug) venue.load(slug).catch(() => undefined);
});

// Commande ouverte depuis le compte : mémorisée sur l'appareil pour la suite.
watch(order, (o) => {
  if (o && token && slug && !tracked) {
    orders.remember({ id: o.id, token, slug, restaurantName: venue.restaurant?.name ?? '', number: o.number, createdAt: o.createdAt });
  }
});

// Changement de statut : notification et vibration (le téléphone est souvent posé sur la table).
tracking?.onStatusChange(({ to }) => {
  const s = STATUS[to];
  const description = to === 'READY' && order.value ? readyHint(order.value.mode) : s.hint;
  toast.add({ title: `Commande ${s.label.toLowerCase()}`, description, icon: s.icon, color: s.color });
  if ('vibrate' in navigator) navigator.vibrate(to === 'READY' ? [200, 100, 200, 100, 200] : 150);
});

const status = computed(() => (order.value ? STATUS[order.value.status] : null));
const hint = computed(() => {
  const o = order.value;
  if (!o) return '';
  if (o.status === 'READY') return readyHint(o.mode);
  if (o.status === 'SERVED' && o.mode === 'TAKEAWAY') return 'Bonne dégustation !';
  if (isFailed(o.status) && o.cancelReason) return `Motif : ${o.cancelReason}`;
  return STATUS[o.status].hint;
});
const eta = computed(() => {
  const o = order.value;
  if (!o?.estimatedReadyAt || !['ACCEPTED', 'PREPARING'].includes(o.status)) return null;
  return time(o.estimatedReadyAt);
});
const amountDue = computed(() => payments.value?.amountDue ?? order.value?.total ?? 0);
const canPay = computed(() => !!order.value && !isFailed(order.value.status) && !isSettled(order.value.paymentStatus) && amountDue.value > 0);

// ─── Ajouter des articles ───
async function addItems() {
  const o = order.value;
  if (!o || !slug) return;
  cart.startAdding(o.id, slug, o.number);
  await navigateTo(`/r/${slug}`);
}

// ─── Annulation ───
const cancelOpen = ref(false);
const cancelReason = ref('');
const cancelling = ref(false);
async function cancel() {
  cancelling.value = true;
  try {
    const updated = await api<CustomerOrder>(`/public/orders/${orderId}/cancel`, {
      method: 'POST',
      body: cancelReason.value.trim() ? { reason: cancelReason.value.trim() } : {},
      headers: tracking!.headers,
    });
    if (tracking) tracking.order.value = updated;
    cancelOpen.value = false;
  } catch {
    await tracking?.refresh();
    cancelOpen.value = false;
  } finally {
    cancelling.value = false;
  }
}

// ─── Avis ───
const reviewed = useLocalStorage<string[]>('qro.reviewed', []);
const rating = ref(0);
const comment = ref('');
const sendingReview = ref(false);
const showReview = computed(() => !!order.value && canReview(order.value.status) && !reviewed.value.includes(orderId));
async function sendReview() {
  sendingReview.value = true;
  try {
    await api(`/public/orders/${orderId}/review`, {
      method: 'POST',
      body: { rating: rating.value, ...(comment.value.trim() && { comment: comment.value.trim() }) },
      headers: tracking!.headers,
      silent: true,
    });
    reviewed.value = [...reviewed.value, orderId];
    toast.add({ title: 'Merci pour votre avis !', color: 'success', icon: 'i-lucide-heart' });
  } catch (err) {
    if (apiErrorCode(err) === 'ALREADY_REVIEWED') reviewed.value = [...reviewed.value, orderId];
    else toast.add({ title: 'Avis non envoyé', description: apiErrorMessage(err), color: 'error' });
  } finally {
    sendingReview.value = false;
  }
}

const statusBg: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  neutral: 'bg-elevated text-muted',
};
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppTopBar
      :title="order ? `Commande n°${order.number}` : 'Suivi de commande'"
      :subtitle="venue.restaurant?.name"
      :back="slug ? `/r/${slug}` : '/'"
    >
      <template #right>
        <UTooltip :text="tracking?.live.value ? 'Suivi en direct' : 'Reconnexion…'">
          <span class="mr-2 flex items-center gap-1.5 text-xs text-muted">
            <span class="size-2 rounded-full" :class="tracking?.live.value ? 'animate-pulse bg-success' : 'bg-warning'" />
            {{ tracking?.live.value ? 'En direct' : 'Hors ligne' }}
          </span>
        </UTooltip>
      </template>
    </AppTopBar>

    <UEmpty
      v-if="!token || notFound"
      icon="i-lucide-search-x"
      title="Commande introuvable"
      description="Ce suivi n’est disponible que sur le téléphone qui a passé la commande, ou depuis votre compte."
      :actions="[{ label: 'Accueil', to: '/', color: 'neutral', variant: 'outline' }]"
      class="flex-1 py-16"
    />

    <div v-else-if="!order" class="space-y-4 p-4">
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-12 w-full" />
      <USkeleton class="h-48 w-full" />
    </div>

    <main v-else class="flex-1 space-y-4 p-4 pb-10">
      <!-- Statut -->
      <section class="rounded-2xl border border-default p-5 text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full" :class="statusBg[status!.color]">
          <UIcon :name="status!.icon" class="size-8" :class="order.status === 'PREPARING' && 'animate-pulse'" />
        </div>
        <h1 class="mt-3 font-display text-2xl font-semibold text-highlighted">
          {{ order.status === 'SERVED' && order.mode === 'TAKEAWAY' ? 'Retirée' : status!.label }}
        </h1>
        <p class="mt-1 text-muted">{{ hint }}</p>
        <p v-if="eta" class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1 text-sm">
          <UIcon name="i-lucide-timer" class="size-4 text-primary" /> Prête vers {{ eta }}
        </p>
        <OrderTimeline v-if="!isFailed(order.status)" :status="order.status" :mode="order.mode" class="mt-5" />
        <p class="mt-4 text-xs text-muted">
          {{ MODE_LABEL[order.mode] }}<span v-if="order.table"> · {{ order.table.label }}</span> · passée à {{ time(order.createdAt) }}
        </p>
      </section>

      <!-- Paiement -->
      <section class="rounded-2xl border border-default p-4">
        <div class="flex items-center justify-between gap-2">
          <p class="font-semibold text-highlighted">Paiement</p>
          <UBadge :color="PAYMENT_STATUS[order.paymentStatus].color" variant="subtle" :label="PAYMENT_STATUS[order.paymentStatus].label" />
        </div>
        <template v-if="canPay">
          <p class="mt-2 text-sm text-muted">
            Reste à payer : <span class="tabular font-semibold text-highlighted">{{ money(amountDue, order.currency) }}</span>
          </p>
          <UButton :to="`/commande/${orderId}/paiement`" block size="lg" icon="i-lucide-wallet" label="Payer maintenant" class="mt-3" />
          <p class="mt-2 text-center text-xs text-muted">Vous pouvez aussi régler en espèces auprès du personnel.</p>
        </template>
        <UButton
          v-else-if="isSettled(order.paymentStatus)"
          :to="`/commande/${orderId}/recu`"
          block
          color="neutral"
          variant="outline"
          icon="i-lucide-receipt"
          label="Voir le reçu"
          class="mt-3"
        />
      </section>

      <!-- Avis -->
      <section v-if="showReview" class="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p class="font-semibold text-highlighted">Comment s’est passé votre repas ?</p>
        <UInputRating v-model="rating" size="xl" class="mt-2" />
        <template v-if="rating">
          <UTextarea v-model="comment" :rows="2" :maxlength="2000" autoresize placeholder="Un mot pour l’équipe (facultatif)" class="mt-3 w-full" />
          <UButton block class="mt-3" label="Envoyer mon avis" :loading="sendingReview" @click="sendReview" />
        </template>
      </section>

      <!-- Détail -->
      <section class="rounded-2xl border border-default p-4">
        <p class="mb-2 font-semibold text-highlighted">Détail</p>
        <OrderLines :items="order.items" :currency="order.currency" />
        <USeparator class="my-3" />
        <OrderTotals
          :currency="order.currency"
          :subtotal="order.subtotal"
          :discount-total="order.discountTotal"
          :tax-total="order.taxTotal"
          :service-fee="order.serviceFee"
          :tip-amount="order.tipAmount"
          :total="order.total"
          :promo-code="order.promoCode"
          :prices-include-tax="venue.restaurant?.pricesIncludeTax"
        />
      </section>

      <!-- Actions -->
      <div class="space-y-2">
        <UButton
          v-if="canAddItems(order.status, order.mode, order.paymentStatus) && slug"
          block
          size="lg"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          label="Ajouter des articles"
          @click="addItems"
        />
        <UButton
          v-if="canCancel(order.status)"
          block
          color="error"
          variant="ghost"
          icon="i-lucide-x"
          label="Annuler la commande"
          @click="cancelOpen = true"
        />
        <UButton
          v-if="isFailed(order.status) && slug"
          :to="`/r/${slug}`"
          block
          size="lg"
          icon="i-lucide-book-open"
          label="Retour au menu"
        />
      </div>
    </main>

    <UModal v-model:open="cancelOpen" title="Annuler la commande ?" description="Possible tant que le restaurant ne l’a pas acceptée.">
      <template #body>
        <UFormField label="Motif (facultatif)">
          <UInput v-model="cancelReason" :maxlength="255" placeholder="Ex. erreur de commande" class="w-full" />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Garder ma commande" @click="cancelOpen = false" />
          <UButton color="error" label="Annuler la commande" :loading="cancelling" @click="cancel" />
        </div>
      </template>
    </UModal>
  </div>
</template>
