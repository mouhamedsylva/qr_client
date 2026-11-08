<script setup lang="ts">
/**
 * Simulateur d'opérateur (développement uniquement) : l'API y redirige quand
 * le fournisseur SANDBOX est actif, à la place de Wave / Orange Money.
 */
useHead({ title: 'Simulateur de paiement' });

const route = useRoute();
const api = useApi();
const paymentId = String(route.params.paymentId);

const pending = (() => {
  try {
    return JSON.parse(sessionStorage.getItem('qro.pendingPayment') ?? 'null') as { paymentId: string; orderId: string } | null;
  } catch {
    return null;
  }
})();
const orderId = pending?.paymentId === paymentId ? pending.orderId : null;

const busy = ref<'SUCCEEDED' | 'FAILED' | null>(null);
const error = ref<string | null>(null);

async function simulate(outcome: 'SUCCEEDED' | 'FAILED') {
  busy.value = outcome;
  error.value = null;
  try {
    await api(`/public/payments/${paymentId}/sandbox`, { method: 'POST', body: { outcome }, silent: true });
    sessionStorage.removeItem('qro.pendingPayment');
    await navigateTo(orderId ? `/commande/${orderId}` : '/', { replace: true });
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
    <UBadge color="warning" variant="subtle" icon="i-lucide-flask-conical" label="Environnement de test" />
    <div class="flex size-16 items-center justify-center rounded-full bg-elevated">
      <UIcon name="i-lucide-smartphone" class="size-8 text-primary" />
    </div>
    <div>
      <h1 class="font-display text-2xl font-semibold text-highlighted">Simulateur d’opérateur</h1>
      <p class="mt-2 text-muted">
        En production, le client validerait ici le paiement dans son application Wave ou Orange Money.
      </p>
    </div>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
    <div class="flex w-full max-w-xs flex-col gap-2">
      <UButton block size="lg" color="success" icon="i-lucide-check" label="Valider le paiement" :loading="busy === 'SUCCEEDED'" :disabled="!!busy" @click="simulate('SUCCEEDED')" />
      <UButton block size="lg" color="error" variant="soft" icon="i-lucide-x" label="Refuser le paiement" :loading="busy === 'FAILED'" :disabled="!!busy" @click="simulate('FAILED')" />
      <UButton v-if="orderId" :to="`/commande/${orderId}`" block color="neutral" variant="ghost" label="Abandonner" />
    </div>
  </div>
</template>
