<script setup lang="ts">
/** Récapitulatif des montants (devis ou commande). */
const props = defineProps<{
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceFee: number;
  tipAmount: number;
  total: number;
  promoCode?: string | null;
  /** Taxes incluses dans les prix : affichées pour information. */
  pricesIncludeTax?: boolean;
}>();
const { money } = useMoney();
const m = (v: number) => money(v, props.currency);
</script>

<template>
  <dl class="space-y-1.5 text-sm">
    <div class="flex justify-between">
      <dt class="text-muted">Sous-total</dt>
      <dd class="tabular">{{ m(subtotal) }}</dd>
    </div>
    <div v-if="discountTotal" class="flex justify-between text-success">
      <dt>Remise<span v-if="promoCode"> ({{ promoCode }})</span></dt>
      <dd class="tabular">−{{ m(discountTotal) }}</dd>
    </div>
    <div v-if="taxTotal" class="flex justify-between">
      <dt class="text-muted">{{ pricesIncludeTax ? 'Dont taxes' : 'Taxes' }}</dt>
      <dd class="tabular">{{ m(taxTotal) }}</dd>
    </div>
    <div v-if="serviceFee" class="flex justify-between">
      <dt class="text-muted">Frais de service</dt>
      <dd class="tabular">{{ m(serviceFee) }}</dd>
    </div>
    <div v-if="tipAmount" class="flex justify-between">
      <dt class="text-muted">Pourboire</dt>
      <dd class="tabular">{{ m(tipAmount) }}</dd>
    </div>
    <div class="flex justify-between border-t border-default pt-2 text-base font-semibold text-highlighted">
      <dt>Total</dt>
      <dd class="tabular">{{ m(total) }}</dd>
    </div>
  </dl>
</template>
