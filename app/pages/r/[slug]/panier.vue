<script setup lang="ts">
import { useDebounceFn, useLocalStorage } from '@vueuse/core';
import type { CreatedOrder, CustomerOrder, Quote } from '~/types/api';
import { MAX_QUANTITY } from '~/utils/cart';
import { MODE_LABEL } from '~/utils/order-status';

const venue = useVenueStore();
const cart = useCartStore();
const orders = useOrdersStore();
const auth = useAuthStore();
const api = useApi();
const toast = useToast();
const { money } = useMoney();
const { slug, status, error: loadError } = useVenueLoader();

useHead({ title: () => (cart.appendTarget ? 'Ajouter à ma commande' : 'Mon panier') });

// Coordonnées mémorisées sur l'appareil pour la prochaine commande.
const contact = useLocalStorage('qro.contact', { name: '', phone: '' });
watch(
  () => auth.user,
  (u) => {
    if (u && !contact.value.name) contact.value = { name: u.firstName, phone: u.phone ?? contact.value.phone };
  },
  { immediate: true },
);

const notes = ref('');

// ─── Retrait d'articles ───
const clearOpen = ref(false);
function removeLine(key: string, name: string) {
  cart.remove(key);
  toast.add({ title: `${name} retiré du panier`, color: 'neutral', icon: 'i-lucide-trash-2', duration: 2000 });
}
function clearCart() {
  cart.clear();
  clearOpen.value = false;
  toast.add({ title: 'Panier vidé', color: 'neutral', icon: 'i-lucide-trash-2', duration: 2000 });
}
const showNotes = ref(false);

// Articles retirés du menu ou épuisés depuis leur ajout.
const removed = ref<string[]>([]);
watch(
  () => venue.menu,
  (menu) => {
    if (menu) removed.value = cart.syncWithMenu();
  },
  { immediate: true },
);

// ─── Pourboire ───
const TIP_RATES = [0, 5, 10, 15];
const tipRate = ref(0);
const tipAmount = computed(() => Math.round((cart.subtotal * tipRate.value) / 100));

// ─── Code promo ───
const promoInput = ref('');
const promoCode = ref<string | null>(null);
const promoError = ref<string | null>(null);
const showPromo = ref(false);

// ─── Devis (remise, taxes, frais de service, total) ───
const quote = ref<Quote | null>(null);
const quoteError = ref<{ code?: string; message: string } | null>(null);
const quoting = ref(false);

function orderContext() {
  return venue.qrToken
    ? { mode: venue.mode, qrToken: venue.qrToken }
    : { mode: 'TAKEAWAY' as const, restaurantSlug: venue.slug! };
}

function body(extra: Record<string, unknown> = {}) {
  return {
    ...orderContext(),
    items: cart.payload,
    ...(promoCode.value && { promoCode: promoCode.value }),
    ...(tipAmount.value && { tipAmount: tipAmount.value }),
    ...extra,
  };
}

async function refreshQuote() {
  if (!cart.count || cart.appendTarget || !venue.slug) {
    quote.value = null;
    return;
  }
  quoting.value = true;
  try {
    quote.value = await api<Quote>('/public/orders/quote', { method: 'POST', body: body(), silent: true });
    quoteError.value = null;
  } catch (err) {
    const code = apiErrorCode(err);
    if (code?.startsWith('PROMO_')) {
      // Code refusé : on le retire et on recalcule sans.
      promoError.value = apiErrorMessage(err);
      promoCode.value = null;
      return refreshQuote();
    }
    quote.value = null;
    quoteError.value = { code, message: apiErrorMessage(err) };
  } finally {
    quoting.value = false;
  }
}
const debouncedQuote = useDebounceFn(refreshQuote, 350);
watch([() => JSON.stringify(cart.payload), tipAmount, promoCode, () => venue.slug], () => void debouncedQuote(), { immediate: true });

function applyPromo() {
  promoError.value = null;
  promoCode.value = promoInput.value.trim().toUpperCase() || null;
}
function removePromo() {
  promoCode.value = null;
  promoInput.value = '';
}

// ─── Envoi ───
// Clé conservée tant que l'envoi n'a pas abouti : un double appui ou une
// nouvelle tentative après une coupure ne crée pas de seconde commande.
let pendingKey: string | null = null;
watch(() => JSON.stringify(cart.payload), () => (pendingKey = null));
const sending = ref(false);
const sendError = ref<string | null>(null);

const phoneValid = computed(() => !contact.value.phone || /^\+?[0-9 ]{8,16}$/.test(contact.value.phone));

async function handleSendError(err: unknown) {
  const code = apiErrorCode(err);
  sendError.value = apiErrorMessage(err);
  if (code === 'ITEM_UNAVAILABLE' || code === 'OUT_OF_STOCK' || code === 'OPTION_UNAVAILABLE' || code === 'ITEM_NOT_FOUND') {
    await venue.refreshMenu();
    removed.value = cart.syncWithMenu();
  }
}

async function send() {
  sendError.value = null;
  sending.value = true;
  pendingKey ??= uuid();
  try {
    const target = cart.appendTarget;
    if (target) {
      const token = orders.tokenFor(target.orderId);
      if (!token) throw new Error('Commande introuvable sur cet appareil');
      await api<CustomerOrder>(`/public/orders/${target.orderId}/items`, {
        method: 'POST',
        body: { items: cart.payload },
        headers: { 'X-Order-Token': token, 'Idempotency-Key': pendingKey },
        silent: true,
      });
      cart.clear();
      cart.stopAdding();
      toast.add({ title: 'Articles ajoutés à votre commande', color: 'success', icon: 'i-lucide-check' });
      await navigateTo(`/commande/${target.orderId}`, { replace: true });
      return;
    }

    const res = await api<CreatedOrder>('/public/orders', {
      method: 'POST',
      body: body({
        ...(contact.value.name.trim() && { customerName: contact.value.name.trim() }),
        ...(contact.value.phone.trim() && { customerPhone: contact.value.phone.replace(/\s/g, '') }),
        ...(notes.value.trim() && { notes: notes.value.trim() }),
      }),
      headers: { 'Idempotency-Key': pendingKey },
      silent: true,
    });
    orders.remember({
      id: res.order.id,
      token: res.trackingToken,
      slug: venue.slug!,
      restaurantName: venue.restaurant!.name,
      number: res.order.number,
      createdAt: res.order.createdAt,
    });
    cart.clear();
    pendingKey = null;
    await navigateTo(`/commande/${res.order.id}`, { replace: true });
  } catch (err) {
    await handleSendError(err);
  } finally {
    sending.value = false;
  }
}

const closed = computed(() => quoteError.value?.code === 'RESTAURANT_CLOSED' || venue.restaurant?.isOpen === false);
const canSend = computed(() => cart.count > 0 && phoneValid.value && !sending.value && (!!cart.appendTarget || (!!quote.value && !closed.value)));
const modeLabel = computed(() =>
  venue.table?.kind === 'TABLE' ? `${MODE_LABEL.DINE_IN} · ${venue.table.label}` : MODE_LABEL.TAKEAWAY,
);
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppTopBar
      :title="cart.appendTarget ? `Ajout à la commande n°${cart.appendTarget.number}` : 'Mon panier'"
      :subtitle="venue.restaurant?.name"
      :back="`/r/${slug}`"
    >
      <template v-if="cart.count" #right>
        <UButton color="error" variant="ghost" icon="i-lucide-trash-2" label="Vider" @click="clearOpen = true" />
      </template>
    </AppTopBar>

    <UModal v-model:open="clearOpen" title="Vider le panier ?" :description="`Les ${cart.count} article(s) seront retirés.`">
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Annuler" @click="clearOpen = false" />
          <UButton color="error" icon="i-lucide-trash-2" label="Vider le panier" @click="clearCart" />
        </div>
      </template>
    </UModal>

    <div v-if="status === 'pending' && !venue.restaurant" class="space-y-3 p-4">
      <USkeleton v-for="n in 3" :key="n" class="h-16 w-full" />
    </div>
    <div v-else-if="loadError" class="p-8 text-center text-muted">{{ apiErrorMessage(loadError) }}</div>

    <UEmpty
      v-else-if="!cart.count"
      icon="i-lucide-shopping-basket"
      title="Votre panier est vide"
      description="Ajoutez des plats depuis le menu."
      :actions="[{ label: 'Voir le menu', to: `/r/${slug}`, icon: 'i-lucide-book-open' }]"
      class="flex-1 py-16"
    />

    <template v-else>
      <main class="flex-1 space-y-5 p-4 pb-32">
        <UAlert
          v-if="removed.length"
          color="warning"
          variant="subtle"
          icon="i-lucide-package-x"
          title="Certains articles ne sont plus disponibles"
          :description="`Retiré(s) du panier : ${removed.join(', ')}.`"
          close
          @update:open="removed = []"
        />

        <!-- Lignes -->
        <ul class="divide-y divide-default">
          <li v-for="line in cart.lines" :key="line.key" class="flex gap-3 py-3">
            <img v-if="line.image" :src="line.image" alt="" class="size-14 shrink-0 rounded-lg object-cover">
            <div class="min-w-0 flex-1">
              <div class="flex items-start gap-2">
                <p class="min-w-0 flex-1 font-medium text-highlighted">{{ line.name }}</p>
                <UButton
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="-mt-1 -mr-2 text-muted hover:text-error"
                  :aria-label="`Retirer ${line.name} du panier`"
                  @click="removeLine(line.key, line.name)"
                />
              </div>
              <p v-if="line.optionLabels.length" class="text-xs text-muted">{{ line.optionLabels.join(' · ') }}</p>
              <p v-if="line.notes" class="text-xs text-muted italic">« {{ line.notes }} »</p>
              <div class="mt-2 flex items-center justify-between">
                <QuantityStepper
                  :model-value="line.quantity"
                  :min="0"
                  :max="MAX_QUANTITY"
                  size="sm"
                  @update:model-value="cart.setQuantity(line.key, $event)"
                />
                <span class="tabular font-semibold">{{ money(line.unitPrice * line.quantity) }}</span>
              </div>
            </div>
          </li>
        </ul>
        <UButton :to="`/r/${slug}`" color="neutral" variant="soft" block icon="i-lucide-plus" label="Ajouter d’autres plats" />

        <template v-if="!cart.appendTarget">
          <!-- Mode et coordonnées -->
          <section class="space-y-3">
            <div class="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2.5 text-sm">
              <UIcon :name="venue.table?.kind === 'TABLE' ? 'i-lucide-armchair' : 'i-lucide-shopping-bag'" class="size-5 text-primary" />
              <span class="font-medium">{{ modeLabel }}</span>
            </div>
            <UFormField label="Votre prénom" :hint="venue.table?.kind === 'TABLE' ? 'Facultatif' : 'Pour vous appeler au comptoir'">
              <UInput v-model="contact.name" autocomplete="given-name" :maxlength="100" class="w-full" size="lg" />
            </UFormField>
            <UFormField
              label="Téléphone"
              hint="Facultatif"
              :error="!phoneValid && 'Format attendu : +221 77 123 45 67'"
            >
              <UInput v-model="contact.phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+221 77 123 45 67" class="w-full" size="lg" />
            </UFormField>
            <div>
              <UButton
                v-if="!showNotes && !notes"
                color="neutral"
                variant="link"
                icon="i-lucide-message-square-plus"
                label="Ajouter une instruction pour la cuisine"
                class="px-0"
                @click="showNotes = true"
              />
              <UFormField v-else label="Instructions">
                <UTextarea v-model="notes" :rows="2" :maxlength="500" autoresize placeholder="Allergie, préférence de cuisson…" class="w-full" />
              </UFormField>
            </div>
          </section>

          <!-- Pourboire -->
          <section>
            <p class="mb-2 font-semibold text-highlighted">Pourboire pour l’équipe</p>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="rate in TIP_RATES"
                :key="rate"
                type="button"
                class="rounded-xl border px-2 py-2 text-sm font-medium transition"
                :class="tipRate === rate ? 'border-primary bg-primary/10 text-primary' : 'border-default hover:bg-elevated'"
                :aria-pressed="tipRate === rate"
                @click="tipRate = rate"
              >
                {{ rate ? `${rate} %` : 'Non merci' }}
              </button>
            </div>
          </section>

          <!-- Code promo -->
          <section>
            <div v-if="promoCode" class="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success">
              <UIcon name="i-lucide-ticket-check" class="size-5" />
              <span class="flex-1 font-medium">Code {{ promoCode }} appliqué</span>
              <UButton color="neutral" variant="link" size="sm" label="Retirer" @click="removePromo" />
            </div>
            <UButton
              v-else-if="!showPromo"
              color="neutral"
              variant="link"
              icon="i-lucide-ticket-percent"
              label="J’ai un code promo"
              class="px-0"
              @click="showPromo = true"
            />
            <UFormField v-else label="Code promo" :error="promoError ?? undefined">
              <div class="flex gap-2">
                <UInput
                  v-model="promoInput"
                  class="flex-1 uppercase"
                  size="lg"
                  autocapitalize="characters"
                  :maxlength="40"
                  @keydown.enter.prevent="applyPromo"
                />
                <UButton size="lg" color="neutral" label="Appliquer" :disabled="!promoInput.trim()" :loading="quoting && !!promoCode" @click="applyPromo" />
              </div>
            </UFormField>
          </section>

          <!-- Totaux -->
          <section class="rounded-xl border border-default p-4">
            <UAlert
              v-if="quoteError"
              :color="closed ? 'warning' : 'error'"
              variant="subtle"
              :icon="closed ? 'i-lucide-moon' : 'i-lucide-circle-alert'"
              :title="closed ? 'Le restaurant est fermé pour le moment' : quoteError.message"
              class="mb-3"
            />
            <OrderTotals
              v-if="quote"
              :currency="quote.currency"
              :subtotal="quote.subtotal"
              :discount-total="quote.discountTotal"
              :tax-total="quote.taxTotal"
              :service-fee="quote.serviceFee"
              :tip-amount="quote.tipAmount"
              :total="quote.total"
              :promo-code="quote.promoCode"
              :prices-include-tax="venue.restaurant?.pricesIncludeTax"
              :class="quoting && 'opacity-60'"
            />
            <div v-else-if="!quoteError" class="space-y-2">
              <USkeleton class="h-4 w-full" />
              <USkeleton class="h-6 w-full" />
            </div>
          </section>
          <p class="text-center text-xs text-muted">Vous réglerez après avoir commandé : en ligne depuis le suivi, ou auprès du personnel.</p>
        </template>
      </main>

      <div class="sticky bottom-0 z-20 border-t border-default bg-default px-4 pt-3 pb-safe">
        <UAlert v-if="sendError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="sendError" class="mb-3" />
        <UButton block size="xl" class="justify-between" :loading="sending" :disabled="!canSend" @click="send">
          <span>{{ cart.appendTarget ? 'Ajouter à ma commande' : 'Envoyer la commande' }}</span>
          <span class="tabular">{{ money(cart.appendTarget ? cart.subtotal : (quote?.total ?? cart.subtotal)) }}</span>
        </UButton>
      </div>
    </template>
  </div>
</template>
