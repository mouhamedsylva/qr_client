<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';
import type { AccountOrder, LoyaltyAccountView, Paginated, ReorderResult } from '~/types/api';
import { MODE_LABEL, STATUS } from '~/utils/order-status';

useHead({ title: 'Mon compte' });

const auth = useAuthStore();
const api = useApi();
const venue = useVenueStore();
const cart = useCartStore();
const toast = useToast();

// ─── Connexion ───
const schema = z.object({
  email: z.string().trim().pipe(z.email('Adresse email invalide')),
  password: z.string().min(1, 'Mot de passe requis'),
});
type Schema = z.output<typeof schema>;
const state = reactive<Partial<Schema>>({ email: '', password: '' });
const loginError = ref<string | null>(null);
const loggingIn = ref(false);
watch(() => [state.email, state.password], () => (loginError.value = null));

async function onLogin(event: FormSubmitEvent<Schema>) {
  loggingIn.value = true;
  try {
    await auth.login(event.data.email, event.data.password);
  } catch (err) {
    loginError.value = apiErrorMessage(err);
  } finally {
    loggingIn.value = false;
  }
}

// ─── Compte connecté ───
const tab = ref('orders');
const { data: history, status: historyStatus } = useAsyncData(
  'my-orders',
  () => api<Paginated<AccountOrder>>('/me/orders?limit=30', { silent: true }),
  { watch: [() => auth.isLoggedIn], immediate: auth.isLoggedIn, default: () => null },
);
const { data: loyalty, refresh: refreshLoyalty } = useAsyncData(
  'my-loyalty',
  () => api<LoyaltyAccountView[]>('/me/loyalty', { silent: true }),
  { watch: [() => auth.isLoggedIn], immediate: auth.isLoggedIn, default: () => [] },
);

const { money } = useMoney();
const date = (d: string) => formatDateTime(d, undefined, { dateStyle: 'medium' });

/** « Commander à nouveau » (CLI-05) : panier reconstruit depuis le menu actuel. */
const reordering = ref<string | null>(null);
async function reorder(order: AccountOrder) {
  reordering.value = order.id;
  try {
    const res = await api<ReorderResult>(`/me/orders/${order.id}/reorder`, { method: 'POST' });
    await venue.load(res.restaurant.slug);
    cart.stopAdding();
    const added = cart.fill(res.items);
    if (res.unavailable.length) {
      toast.add({
        title: 'Certains articles ne sont plus disponibles',
        description: res.unavailable.map((u) => u.name).join(', '),
        color: 'warning',
        icon: 'i-lucide-package-x',
      });
    }
    if (added) await navigateTo(`/r/${res.restaurant.slug}/panier`);
  } finally {
    reordering.value = null;
  }
}

const redeeming = ref<string | null>(null);
async function redeem(account: LoyaltyAccountView, rewardId: string) {
  redeeming.value = rewardId;
  try {
    await api(`/me/loyalty/${account.restaurant.id}/rewards/${rewardId}/redeem`, { method: 'POST' });
    toast.add({ title: 'Récompense obtenue', description: 'Votre bon apparaît ci-dessous : saisissez son code au panier.', color: 'success', icon: 'i-lucide-gift' });
    await refreshLoyalty();
  } finally {
    redeeming.value = null;
  }
}

async function logout() {
  await auth.logout();
  history.value = null;
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppTopBar title="Mon compte" :back="venue.slug ? `/r/${venue.slug}` : '/'">
      <template v-if="auth.isLoggedIn" #right>
        <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" label="Déconnexion" @click="logout" />
      </template>
    </AppTopBar>

    <div v-if="!auth.initialized" class="p-4"><USkeleton class="h-48 w-full" /></div>

    <!-- Non connecté -->
    <main v-else-if="!auth.isLoggedIn" class="flex-1 space-y-6 p-5">
      <div>
        <h1 class="font-display text-2xl font-semibold text-highlighted">Connexion</h1>
        <p class="mt-1 text-sm text-muted">
          Facultatif : un compte garde l’historique de vos commandes, permet de recommander en un geste et de cumuler des points de fidélité.
        </p>
      </div>
      <UAlert v-if="loginError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="loginError" />
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onLogin">
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" size="lg" />
        </UFormField>
        <UFormField label="Mot de passe" name="password">
          <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" size="lg" />
        </UFormField>
        <UButton type="submit" block size="lg" label="Se connecter" :loading="loggingIn" />
      </UForm>
      <USeparator label="Nouveau ?" />
      <UButton to="/compte/inscription" block size="lg" color="neutral" variant="outline" icon="i-lucide-user-plus" label="Créer un compte" />
    </main>

    <!-- Connecté -->
    <main v-else class="flex-1 space-y-4 p-4">
      <div class="flex items-center gap-3">
        <UAvatar :alt="`${auth.user!.firstName} ${auth.user!.lastName}`" size="lg" />
        <div>
          <p class="font-semibold text-highlighted">{{ auth.user!.firstName }} {{ auth.user!.lastName }}</p>
          <p class="text-sm text-muted">{{ auth.user!.email }}</p>
        </div>
      </div>

      <UTabs
        v-model="tab"
        :items="[
          { label: 'Mes commandes', value: 'orders', icon: 'i-lucide-receipt-text' },
          { label: 'Fidélité', value: 'loyalty', icon: 'i-lucide-heart-handshake' },
        ]"
        :content="false"
        class="w-full"
      />

      <!-- Historique -->
      <section v-if="tab === 'orders'">
        <div v-if="historyStatus === 'pending' && !history" class="space-y-2">
          <USkeleton v-for="n in 3" :key="n" class="h-24 w-full" />
        </div>
        <UEmpty
          v-else-if="!history?.data.length"
          icon="i-lucide-receipt-text"
          title="Aucune commande"
          description="Les commandes passées en étant connecté apparaîtront ici."
        />
        <ul v-else class="space-y-3">
          <li v-for="o in history.data" :key="o.id" class="rounded-xl border border-default p-3">
            <NuxtLink :to="`/commande/${o.id}?t=${o.trackingToken}&s=${o.restaurant.slug}`" class="flex items-start gap-3">
              <img v-if="o.restaurant.logoUrl" :src="o.restaurant.logoUrl" alt="" class="size-10 rounded-lg object-cover">
              <div v-else class="flex size-10 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
                {{ o.restaurant.name.charAt(0) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-highlighted">{{ o.restaurant.name }}</p>
                <p class="text-xs text-muted">n°{{ o.number }} · {{ date(o.createdAt) }} · {{ MODE_LABEL[o.mode] }}</p>
                <p class="mt-1 line-clamp-1 text-xs text-muted">{{ o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') }}</p>
              </div>
              <div class="text-right">
                <p class="tabular text-sm font-semibold">{{ money(o.total, o.currency) }}</p>
                <UBadge :color="STATUS[o.status].color" variant="subtle" size="sm" :label="STATUS[o.status].label" />
              </div>
            </NuxtLink>
            <UButton
              class="mt-2"
              size="sm"
              color="neutral"
              variant="soft"
              icon="i-lucide-repeat"
              label="Commander à nouveau"
              :loading="reordering === o.id"
              @click="reorder(o)"
            />
          </li>
        </ul>
      </section>

      <!-- Fidélité -->
      <section v-else class="space-y-3">
        <UEmpty
          v-if="!loyalty.length"
          icon="i-lucide-heart-handshake"
          title="Pas encore de points"
          description="Vos points s’accumulent quand vous réglez une commande en étant connecté, dans les restaurants qui proposent un programme de fidélité."
        />
        <article v-for="a in loyalty" :key="a.restaurant.id" class="rounded-xl border border-default p-4">
          <div class="flex items-center justify-between">
            <NuxtLink :to="`/r/${a.restaurant.slug}`" class="font-semibold text-highlighted hover:underline">{{ a.restaurant.name }}</NuxtLink>
            <span class="tabular font-display text-xl font-semibold text-primary">{{ a.points }} pts</span>
          </div>
          <ul v-if="a.vouchers.length" class="mt-3 space-y-1.5">
            <li v-for="v in a.vouchers" :key="v.code" class="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              <UIcon name="i-lucide-ticket" class="size-4" />
              <span class="flex-1">{{ v.name }}</span>
              <code class="font-semibold">{{ v.code }}</code>
            </li>
          </ul>
          <ul v-if="a.rewards.length" class="mt-3 divide-y divide-default">
            <li v-for="r in a.rewards" :key="r.id" class="flex items-center gap-2 py-2 text-sm">
              <span class="flex-1">{{ r.name }} <span class="text-muted">· {{ r.pointsCost }} pts</span></span>
              <UButton
                size="xs"
                :disabled="r.pointsCost > a.points"
                :loading="redeeming === r.id"
                label="Échanger"
                @click="redeem(a, r.id)"
              />
            </li>
          </ul>
        </article>
      </section>
    </main>
  </div>
</template>
