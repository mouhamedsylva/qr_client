<script setup lang="ts">
/** Fiche plat plein écran : grande photo, options, précision, quantité et ajout au panier. */
import type { MenuItem, MenuOptionGroup } from '~/types/api';
import { groupHint, isSingleChoice, MAX_QUANTITY, minChoices, selectionErrors, toggleOption, unitPrice } from '~/utils/cart';
import { ALLERGENS, DIETARY_TAGS } from '~/utils/menu';

const props = withDefaults(defineProps<{ item: MenuItem | null; icon?: string }>(), { icon: 'i-lucide-utensils' });
const open = defineModel<boolean>('open', { required: true });

const cart = useCartStore();
const toast = useToast();
const { money } = useMoney();

const selected = ref<string[]>([]);
const quantity = ref(1);
const notes = ref('');
const showErrors = ref(false);
const broken = ref(false);

// Nouvelle fiche : sélection remise à zéro.
watch(
  () => props.item?.id,
  () => {
    selected.value = [];
    quantity.value = 1;
    notes.value = '';
    showErrors.value = false;
    broken.value = false;
  },
);

const errors = computed(() => (props.item ? selectionErrors(props.item, selected.value) : {}));
const total = computed(() => (props.item ? unitPrice(props.item, selected.value) * quantity.value : 0));
const tags = computed(() => props.item?.dietaryTags.map((t) => DIETARY_TAGS[t]).filter(Boolean) ?? []);
const done = (group: MenuOptionGroup) => !errors.value[group.id] && minChoices(group) > 0;
/** Quantité de ce plat déjà dans le panier. */
const inCart = computed(() => (props.item ? cart.quantityOf(props.item.id) : 0));

// Partage du plat (menu natif du téléphone), si le navigateur le permet.
const canShare = computed(() => import.meta.client && typeof navigator.share === 'function');
async function share() {
  if (!props.item) return;
  try {
    await navigator.share({ title: props.item.name, text: props.item.description ?? undefined, url: location.href });
  } catch {
    // partage annulé
  }
}

function toggle(group: MenuOptionGroup, optionId: string) {
  selected.value = toggleOption(group, selected.value, optionId);
}

function add() {
  if (!props.item) return;
  if (Object.keys(errors.value).length) {
    showErrors.value = true;
    // Amène le premier groupe incomplet à l'écran.
    const first = Object.keys(errors.value)[0];
    document.getElementById(`group-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  cart.add(props.item, quantity.value, selected.value, notes.value);
  toast.add({ title: `${quantity.value} × ${props.item.name} ajouté au panier`, color: 'neutral', icon: 'i-lucide-check', duration: 1800 });
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :title="item?.name ?? ''"
    :close="false"
    :ui="{
      content: 'sm:max-w-lg sm:mx-auto sm:shadow-2xl',
      header: 'sr-only',
      body: 'p-0 sm:p-0',
      footer: 'p-0 sm:p-0 border-0',
    }"
  >
    <template #body>
      <div v-if="item" class="relative pb-6">
        <!-- Photo plein cadre, fondu vers la carte d'informations -->
        <div class="relative h-[42vh] max-h-96 min-h-64 overflow-hidden bg-elevated">
          <img
            v-if="item.images[0] && !broken"
            :src="item.images[0]"
            :alt="item.name"
            class="sheet-photo size-full object-cover"
            @error="broken = true"
          >
          <div v-else class="flex size-full items-center justify-center bg-linear-to-br from-primary-100 via-primary-50 to-primary-200 dark:from-primary-950 dark:via-primary-900 dark:to-primary-950">
            <UIcon :name="icon" class="size-24 text-primary-300 dark:text-primary-700" />
          </div>
          <div class="absolute inset-0 bg-linear-to-b from-black/45 via-transparent to-black/25" />

          <!-- Boutons « verre dépoli » -->
          <div class="absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] flex justify-between px-3">
            <button type="button" class="glass-btn" aria-label="Fermer" @click="open = false">
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
            <button v-if="canShare" type="button" class="glass-btn" aria-label="Partager ce plat" @click="share">
              <UIcon name="i-lucide-share-2" class="size-5" />
            </button>
          </div>
        </div>

        <!-- Carte d'informations, qui chevauche la photo -->
        <div class="relative -mt-8 rounded-t-[1.75rem] bg-default px-5 pt-3 pb-5">
          <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-accented" aria-hidden="true" />

          <div class="flex items-start justify-between gap-4">
            <h2 class="text-[1.65rem] leading-tight font-extrabold tracking-tight text-highlighted">{{ item.name }}</h2>
            <span class="tabular shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-base font-bold whitespace-nowrap text-primary">
              {{ money(item.priceAmount) }}
            </span>
          </div>
          <p v-if="item.description" class="mt-2.5 leading-relaxed text-muted">{{ item.description }}</p>

          <!-- Pastilles d'informations -->
          <div v-if="tags.length || item.prepTimeMinutes || item.calories" class="mt-4 flex flex-wrap gap-2">
            <span v-for="t in tags" :key="t!.label" class="info-chip">
              <UIcon :name="t!.icon" class="size-4 text-success" />{{ t!.label }}
            </span>
            <span v-if="item.prepTimeMinutes" class="info-chip">
              <UIcon name="i-lucide-timer" class="size-4 text-primary" />{{ item.prepTimeMinutes }} min
            </span>
            <span v-if="item.calories" class="info-chip">
              <UIcon name="i-lucide-flame" class="size-4 text-orange-500" />{{ item.calories }} kcal
            </span>
          </div>

          <!-- Allergènes -->
          <div v-if="item.allergens.length" class="mt-4 flex items-start gap-2.5 rounded-2xl bg-warning/10 px-3.5 py-3 text-sm">
            <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-4 shrink-0 text-warning" />
            <p>
              <span class="font-semibold text-highlighted">Allergènes : </span>
              <span class="text-muted">{{ item.allergens.map((a) => ALLERGENS[a] ?? a).join(', ') }}</span>
            </p>
          </div>

          <p v-if="inCart" class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1 text-xs font-medium text-muted">
            <UIcon name="i-lucide-shopping-cart" class="size-3.5" /> Déjà {{ inCart }} dans votre panier
          </p>
        </div>

        <!-- Options, en cartes -->
        <div class="space-y-4 border-t border-default px-5 pt-5">
          <fieldset
            v-for="group in item.optionGroups"
            :id="`group-${group.id}`"
            :key="group.id"
            class="rounded-2xl border p-4 transition"
            :class="showErrors && errors[group.id] ? 'border-error/60 bg-error/5' : 'border-default'"
          >
            <legend class="sr-only">{{ group.name }}</legend>
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-bold text-highlighted">{{ group.name }}</p>
                <p class="text-sm" :class="showErrors && errors[group.id] ? 'text-error' : 'text-muted'">
                  {{ showErrors && errors[group.id] ? errors[group.id] : groupHint(group) }}
                </p>
              </div>
              <span
                v-if="minChoices(group) > 0"
                class="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="done(group) ? 'bg-success/15 text-success' : showErrors ? 'bg-error/15 text-error' : 'bg-elevated text-highlighted'"
              >
                <UIcon v-if="done(group)" name="i-lucide-check" class="size-3.5" />
                {{ done(group) ? 'Choisi' : 'Obligatoire' }}
              </span>
            </div>

            <div class="mt-3 grid gap-2">
              <button
                v-for="opt in group.options"
                :key="opt.id"
                type="button"
                class="flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition active:scale-[0.99] disabled:opacity-45"
                :class="selected.includes(opt.id) ? 'border-primary bg-primary/5' : 'border-default hover:border-accented'"
                :disabled="!opt.isAvailable"
                :aria-pressed="selected.includes(opt.id)"
                @click="toggle(group, opt.id)"
              >
                <span
                  class="flex size-5 shrink-0 items-center justify-center border-2 transition"
                  :class="[
                    isSingleChoice(group) ? 'rounded-full' : 'rounded-md',
                    selected.includes(opt.id) ? 'border-primary bg-primary text-white' : 'border-accented',
                  ]"
                >
                  <span v-if="selected.includes(opt.id) && isSingleChoice(group)" class="size-2 rounded-full bg-white" />
                  <UIcon v-else-if="selected.includes(opt.id)" name="i-lucide-check" class="size-3.5 stroke-[3]" />
                </span>
                <span class="min-w-0 flex-1 font-medium text-highlighted">
                  {{ opt.name }}
                  <span v-if="!opt.isAvailable" class="block text-xs font-normal text-muted">Épuisé</span>
                </span>
                <span v-if="opt.priceDelta" class="tabular shrink-0 text-sm font-semibold" :class="selected.includes(opt.id) ? 'text-primary' : 'text-muted'">
                  {{ opt.priceDelta > 0 ? '+' : '' }}{{ money(opt.priceDelta) }}
                </span>
              </button>
            </div>
          </fieldset>

          <!-- Instructions -->
          <div class="pt-2">
            <div class="flex items-center justify-between gap-3">
              <label for="item-notes" class="flex items-center gap-2 font-bold text-highlighted">
                <UIcon name="i-lucide-message-square-text" class="size-5 text-primary" />
                Une précision pour la cuisine ?
              </label>
              <span class="text-xs text-muted">Facultatif</span>
            </div>
            <textarea
              id="item-notes"
              v-model="notes"
              rows="3"
              maxlength="255"
              placeholder="Ex. sans oignon, sauce à part, bien cuit…"
              class="mt-2.5 block w-full resize-none rounded-xl border border-default bg-default px-3.5 py-3 text-sm text-highlighted placeholder:text-dimmed transition outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
            <p class="mt-1 text-right text-xs text-dimmed tabular">{{ notes.length }} / 255</p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="item" class="w-full border-t border-default bg-default/85 px-4 pt-3 pb-safe backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <div class="flex items-center rounded-full bg-elevated p-1">
            <button type="button" class="qty-btn" :disabled="quantity <= 1" aria-label="Diminuer la quantité" @click="quantity--">
              <UIcon name="i-lucide-minus" class="size-4" />
            </button>
            <span class="tabular w-8 text-center text-lg font-bold" aria-live="polite">{{ quantity }}</span>
            <button type="button" class="qty-btn" :disabled="quantity >= MAX_QUANTITY" aria-label="Augmenter la quantité" @click="quantity++">
              <UIcon name="i-lucide-plus" class="size-4" />
            </button>
          </div>
          <button
            type="button"
            class="flex h-14 flex-1 items-center justify-between rounded-full bg-primary px-5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.98]"
            @click="add"
          >
            <span>Ajouter</span>
            <span class="tabular">{{ money(total) }}</span>
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.sheet-photo {
  animation: sheet-zoom 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes sheet-zoom {
  from {
    transform: scale(1.08);
  }
}
.glass-btn {
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: #fff;
  background: rgb(0 0 0 / 0.35);
  border: 1px solid rgb(255 255 255 / 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background 0.15s;
}
.glass-btn:hover {
  background: rgb(0 0 0 / 0.5);
}
.info-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 9999px;
  background: var(--ui-bg-elevated);
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
}
.qty-btn {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
  transition: transform 0.1s;
}
.qty-btn:active {
  transform: scale(0.92);
}
.qty-btn:disabled {
  opacity: 0.4;
}
@media (prefers-reduced-motion: reduce) {
  .sheet-photo {
    animation: none;
  }
}
</style>
