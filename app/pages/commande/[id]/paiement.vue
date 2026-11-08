<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import type { PaymentInitiation, PaymentSummary } from '~/types/api';
import { fromMinorUnits, toMinorUnits } from '~/utils/format';

const route = useRoute();
const orders = useOrdersStore();
const venue = useVenueStore();
const api = useApi();
const config = useRuntimeConfig();
const colorMode = useColorMode();
const { money } = useMoney();

useHead({ title: 'Paiement' });

const orderId = String(route.params.id);
const token = orders.tokenFor(orderId);
const tracked = orders.tracked.find((o) => o.id === orderId);
const headers = { 'X-Order-Token': token ?? '' };

onMounted(() => {
  if (tracked) venue.load(tracked.slug).catch(() => undefined);
});

const { data: summary, error: loadError } = useAsyncData(
  `payments-${orderId}`,
  () => api<PaymentSummary>(`/public/orders/${orderId}/payments`, { headers, silent: true }),
  { immediate: !!token },
);
const currency = computed(() => summary.value?.currency ?? venue.currency);
const due = computed(() => summary.value?.amountDue ?? 0);

// ─── Montant : tout, ou une part (addition partagée) ───
const split = ref(false);
const partInput = ref<number | undefined>();
const amount = computed(() => {
  if (!split.value || !partInput.value) return due.value;
  return Math.min(due.value, toMinorUnits(partInput.value, currency.value));
});
const SPLITS = [2, 3, 4];
function splitIn(n: number) {
  split.value = true;
  partInput.value = fromMinorUnits(Math.ceil(due.value / n), currency.value);
}

// ─── Moyen de paiement ───
const OPERATORS = [
  { value: 'WAVE', label: 'Wave', color: 'bg-sky-500' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', color: 'bg-orange-500' },
  { value: 'FREE_MONEY', label: 'Free Money', color: 'bg-red-600' },
] as const;
type Choice = 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY' | 'CARD';
const choice = ref<Choice>('WAVE');
const contact = useLocalStorage('qro.contact', { name: '', phone: '' });
const payerPhone = ref(contact.value.phone);
const cardEnabled = computed(() => !!config.public.stripePublishableKey);

const phoneValid = computed(() => /^\+?[0-9 ]{8,16}$/.test(payerPhone.value));
const canPay = computed(() => amount.value > 0 && amount.value <= due.value && (choice.value === 'CARD' || phoneValid.value));

const paying = ref(false);
const payError = ref<string | null>(null);

// ─── Carte : Stripe Payment Element ───
let stripe: Stripe | null = null;
let elements: StripeElements | null = null;
const cardStep = ref(false);

async function mountCard(clientSecret: string) {
  const { loadStripe } = await import('@stripe/stripe-js');
  stripe = await loadStripe(config.public.stripePublishableKey as string, { locale: 'fr' });
  if (!stripe) throw new Error('Stripe indisponible');
  const brand = getComputedStyle(document.documentElement).getPropertyValue('--ui-primary').trim();
  elements = stripe.elements({
    clientSecret,
    appearance: {
      theme: colorMode.value === 'dark' ? 'night' : 'stripe',
      variables: { borderRadius: '12px', ...(brand.startsWith('#') && { colorPrimary: brand }) },
    },
  });
  cardStep.value = true;
  await nextTick();
  elements.create('payment', { layout: 'tabs' }).mount('#payment-element');
}

async function confirmCard() {
  if (!stripe || !elements) return;
  paying.value = true;
  payError.value = null;
  const { error } = await stripe.confirmPayment({
    elements,
    redirect: 'if_required',
    confirmParams: { return_url: `${location.origin}/commande/${orderId}?paiement=retour` },
  });
  paying.value = false;
  if (error) {
    payError.value = error.message ?? 'Paiement refusé';
    return;
  }
  // Confirmation définitive par webhook : le suivi se met à jour en temps réel.
  await navigateTo(`/commande/${orderId}?paiement=retour`, { replace: true });
}

// Clé stable par tentative (montant + moyen) : un double appui ne crée qu'un paiement.
let attempt: { key: string; sig: string } | null = null;

async function pay() {
  payError.value = null;
  paying.value = true;
  const isCard = choice.value === 'CARD';
  const body = isCard
    ? { method: 'CARD', amount: amount.value }
    : { method: 'MOBILE_MONEY', operator: choice.value, payerPhone: payerPhone.value.replace(/\s/g, ''), amount: amount.value };
  const sig = JSON.stringify(body);
  if (attempt?.sig !== sig) attempt = { key: uuid(), sig };
  try {
    const res = await api<PaymentInitiation>(`/public/orders/${orderId}/payments`, {
      method: 'POST',
      body,
      headers: { ...headers, 'Idempotency-Key': attempt.key },
      silent: true,
    });
    if (!isCard) contact.value = { ...contact.value, phone: payerPhone.value };
    if (res.redirectUrl) {
      // Page de l'opérateur (ou simulateur en développement) : retour au suivi ensuite.
      sessionStorage.setItem('qro.pendingPayment', JSON.stringify({ paymentId: res.paymentId, orderId }));
      window.location.href = res.redirectUrl;
      return;
    }
    if (res.clientSecret) {
      await mountCard(res.clientSecret);
      return;
    }
    await navigateTo(`/commande/${orderId}`, { replace: true });
  } catch (err) {
    payError.value = apiErrorMessage(err);
  } finally {
    paying.value = false;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppTopBar title="Paiement" :subtitle="tracked ? `Commande n°${tracked.number}` : undefined" :back="`/commande/${orderId}`" />

    <UEmpty
      v-if="!token || loadError"
      icon="i-lucide-search-x"
      title="Commande introuvable"
      :description="loadError ? apiErrorMessage(loadError) : 'Le paiement n’est possible que depuis le téléphone qui a passé la commande.'"
      class="flex-1 py-16"
    />

    <div v-else-if="!summary" class="space-y-3 p-4">
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-40 w-full" />
    </div>

    <UEmpty
      v-else-if="due <= 0"
      icon="i-lucide-circle-check"
      title="Rien à régler"
      description="Cette commande est entièrement réglée. Merci !"
      :actions="[{ label: 'Voir le reçu', to: `/commande/${orderId}/recu`, icon: 'i-lucide-receipt' }]"
      class="flex-1 py-16"
    />

    <!-- Étape carte : formulaire sécurisé Stripe -->
    <main v-else-if="cardStep" class="flex-1 space-y-4 p-4">
      <p class="text-center text-sm text-muted">
        Montant : <span class="tabular font-semibold text-highlighted">{{ money(amount, currency) }}</span>
      </p>
      <div id="payment-element" />
      <UAlert v-if="payError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="payError" />
      <UButton block size="xl" icon="i-lucide-lock" :label="`Payer ${money(amount, currency)}`" :loading="paying" @click="confirmCard" />
      <p class="flex items-center justify-center gap-1.5 text-xs text-muted">
        <UIcon name="i-lucide-shield-check" class="size-4" /> Paiement sécurisé par Stripe
      </p>
    </main>

    <template v-else>
      <main class="flex-1 space-y-5 p-4 pb-32">
        <!-- Montant -->
        <section class="rounded-2xl bg-elevated p-5 text-center">
          <p class="text-sm text-muted">{{ split ? 'Votre part' : 'Reste à payer' }}</p>
          <p class="tabular font-display text-4xl font-semibold text-highlighted">{{ money(amount, currency) }}</p>
          <p v-if="split" class="mt-1 text-xs text-muted">sur {{ money(due, currency) }}</p>
        </section>

        <section>
          <div class="flex items-center justify-between">
            <p class="font-semibold text-highlighted">Partager l’addition</p>
            <USwitch v-model="split" aria-label="Payer une partie seulement" />
          </div>
          <div v-if="split" class="mt-3 space-y-3">
            <div class="flex gap-2">
              <UButton v-for="n in SPLITS" :key="n" color="neutral" variant="outline" class="flex-1 justify-center" :label="`÷ ${n}`" @click="splitIn(n)" />
            </div>
            <UFormField label="Montant de votre part" :error="amount > due && 'Supérieur au reste à payer'">
              <UInputNumber v-model="partInput" :min="0" :format-options="{ maximumFractionDigits: 2 }" class="w-full" size="lg" />
            </UFormField>
          </div>
        </section>

        <!-- Moyens -->
        <section class="space-y-2">
          <p class="font-semibold text-highlighted">Moyen de paiement</p>
          <button
            v-for="op in OPERATORS"
            :key="op.value"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition"
            :class="choice === op.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default hover:bg-elevated/60'"
            :aria-pressed="choice === op.value"
            @click="choice = op.value"
          >
            <span class="flex size-10 items-center justify-center rounded-lg text-sm font-bold text-white" :class="op.color">{{ op.label.charAt(0) }}</span>
            <span class="flex-1 font-medium">{{ op.label }}</span>
            <UIcon v-if="choice === op.value" name="i-lucide-circle-check" class="size-5 text-primary" />
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50"
            :class="choice === 'CARD' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default hover:bg-elevated/60'"
            :disabled="!cardEnabled"
            :aria-pressed="choice === 'CARD'"
            @click="choice = 'CARD'"
          >
            <span class="flex size-10 items-center justify-center rounded-lg bg-inverted text-inverted">
              <UIcon name="i-lucide-credit-card" class="size-5" />
            </span>
            <span class="flex-1">
              <span class="font-medium">Carte bancaire</span>
              <span v-if="!cardEnabled" class="block text-xs text-muted">Indisponible pour le moment</span>
            </span>
            <UIcon v-if="choice === 'CARD'" name="i-lucide-circle-check" class="size-5 text-primary" />
          </button>
        </section>

        <UFormField
          v-if="choice !== 'CARD'"
          label="Numéro du compte à débiter"
          :error="payerPhone && !phoneValid ? 'Format attendu : +221 77 123 45 67' : undefined"
        >
          <UInput v-model="payerPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+221 77 123 45 67" class="w-full" size="lg" />
        </UFormField>
      </main>

      <div class="sticky bottom-0 border-t border-default bg-default px-4 pt-3 pb-safe">
        <UAlert v-if="payError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="payError" class="mb-3" />
        <UButton block size="xl" icon="i-lucide-lock" :label="`Payer ${money(amount, currency)}`" :loading="paying" :disabled="!canPay" @click="pay" />
      </div>
    </template>
  </div>
</template>
