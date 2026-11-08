<script setup lang="ts">
import type { Receipt } from '~/types/api';
import { MODE_LABEL } from '~/utils/order-status';

// Reçu numérique (PAY-09), imprimable ou enregistrable en PDF depuis le navigateur.
useHead({ title: 'Reçu' });

const route = useRoute();
const orders = useOrdersStore();
const venue = useVenueStore();
const api = useApi();
const { money, dateTime } = useMoney();

const orderId = String(route.params.id);
const token = orders.tokenFor(orderId);
const tracked = orders.tracked.find((o) => o.id === orderId);
onMounted(() => {
  if (tracked) venue.load(tracked.slug).catch(() => undefined);
});

const { data: receipt, error } = useAsyncData(
  `receipt-${orderId}`,
  () => api<Receipt>(`/public/orders/${orderId}/receipt`, { headers: { 'X-Order-Token': token ?? '' }, silent: true }),
  { immediate: !!token },
);

const METHOD: Record<string, string> = { CASH: 'Espèces', CARD: 'Carte', MOBILE_MONEY: 'Mobile Money' };
function printReceipt() {
  window.print();
}
const OPERATOR: Record<string, string> = { WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', FREE_MONEY: 'Free Money' };
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppTopBar title="Reçu" :back="`/commande/${orderId}`" class="print:hidden">
      <template #right>
        <UButton v-if="receipt" icon="i-lucide-printer" color="neutral" variant="ghost" aria-label="Imprimer ou enregistrer en PDF" @click="printReceipt" />
      </template>
    </AppTopBar>

    <UEmpty
      v-if="!token || error"
      icon="i-lucide-receipt"
      title="Reçu indisponible"
      :description="error ? apiErrorMessage(error) : 'Ce reçu n’est accessible que depuis le téléphone qui a passé la commande.'"
      class="flex-1 py-16"
    />
    <div v-else-if="!receipt" class="p-4"><USkeleton class="h-96 w-full" /></div>

    <article v-else class="m-4 rounded-2xl border border-dashed border-accented p-5 font-mono text-sm">
      <header class="text-center">
        <p class="font-sans text-lg font-semibold text-highlighted">{{ receipt.restaurant.name }}</p>
        <p v-if="receipt.restaurant.address" class="text-xs text-muted">
          {{ receipt.restaurant.address }}<span v-if="receipt.restaurant.city">, {{ receipt.restaurant.city }}</span>
        </p>
        <p v-if="receipt.restaurant.phone" class="text-xs text-muted">{{ receipt.restaurant.phone }}</p>
      </header>

      <div class="my-4 border-t border-dashed border-accented" />
      <p>Reçu {{ receipt.receiptNumber }}</p>
      <p class="text-xs text-muted">{{ dateTime(receipt.issuedAt) }}</p>
      <p class="text-xs text-muted">
        Commande n°{{ receipt.order.number }} · {{ MODE_LABEL[receipt.order.mode] }}<span v-if="receipt.order.table"> · {{ receipt.order.table }}</span>
      </p>

      <div class="my-4 border-t border-dashed border-accented" />
      <ul class="space-y-2">
        <li v-for="(item, i) in receipt.items" :key="i">
          <div class="flex justify-between gap-2">
            <span>{{ item.quantity }} × {{ item.name }}</span>
            <span class="tabular shrink-0">{{ money(item.lineTotal, receipt.currency) }}</span>
          </div>
          <p v-if="item.options.length" class="pl-4 text-xs text-muted">{{ item.options.join(', ') }}</p>
        </li>
      </ul>

      <div class="my-4 border-t border-dashed border-accented" />
      <OrderTotals
        :currency="receipt.currency"
        :subtotal="receipt.subtotal"
        :discount-total="receipt.discountTotal"
        :tax-total="receipt.taxTotal"
        :service-fee="receipt.serviceFee"
        :tip-amount="receipt.tipAmount"
        :total="receipt.total"
        :prices-include-tax="receipt.pricesIncludeTax"
      />
      <p v-if="receipt.taxTotal" class="mt-1 text-xs text-muted">
        TVA {{ (receipt.taxRateBp / 100).toLocaleString('fr-FR') }} %{{ receipt.pricesIncludeTax ? ' incluse' : '' }}
      </p>

      <div class="my-4 border-t border-dashed border-accented" />
      <ul class="space-y-1 text-xs">
        <li v-for="(p, i) in receipt.payments" :key="i" class="flex justify-between">
          <span>{{ METHOD[p.method] ?? p.method }}<span v-if="p.operator"> ({{ OPERATOR[p.operator] ?? p.operator }})</span></span>
          <span class="tabular">{{ money(p.amount, receipt.currency) }}</span>
        </li>
      </ul>
      <p class="mt-5 text-center font-sans text-xs text-muted">Merci de votre visite !</p>
    </article>
  </div>
</template>
