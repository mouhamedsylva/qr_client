<script setup lang="ts">
import type { MenuItem, MenuOptionGroup } from '~/types/api';
import { groupHint, isSingleChoice, MAX_QUANTITY, selectionErrors, toggleOption, unitPrice } from '~/utils/cart';
import { ALLERGENS, DIETARY_TAGS } from '~/utils/menu';

const props = defineProps<{ item: MenuItem | null }>();
const open = defineModel<boolean>('open', { required: true });

const cart = useCartStore();
const toast = useToast();
const { money } = useMoney();

const selected = ref<string[]>([]);
const quantity = ref(1);
const notes = ref('');
const showErrors = ref(false);

// Nouvelle fiche : sélection remise à zéro.
watch(
  () => props.item?.id,
  () => {
    selected.value = [];
    quantity.value = 1;
    notes.value = '';
    showErrors.value = false;
  },
);

const errors = computed(() => (props.item ? selectionErrors(props.item, selected.value) : {}));
const total = computed(() => (props.item ? unitPrice(props.item, selected.value) * quantity.value : 0));
const tags = computed(() => props.item?.dietaryTags.map((t) => DIETARY_TAGS[t]).filter(Boolean) ?? []);

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
  toast.add({ title: `${quantity.value} × ${props.item.name} ajouté`, color: 'success', icon: 'i-lucide-check', duration: 1800 });
  open.value = false;
}
</script>

<template>
  <UDrawer v-model:open="open" :title="item?.name ?? ''" :ui="{ content: 'max-h-[92dvh]', header: 'sr-only', body: 'p-0' }">
    <template #body>
      <div v-if="item" class="pb-2">
        <img
          v-if="item.images[0]"
          :src="item.images[0]"
          :alt="item.name"
          class="aspect-video w-full object-cover"
        >
        <div class="space-y-2 p-4">
          <h2 class="font-display text-2xl font-semibold text-highlighted">{{ item.name }}</h2>
          <p v-if="item.description" class="text-sm text-muted">{{ item.description }}</p>
          <div class="flex flex-wrap gap-1.5">
            <UBadge v-for="t in tags" :key="t!.label" :icon="t!.icon" :label="t!.label" color="neutral" variant="subtle" size="sm" />
            <UBadge v-if="item.calories" color="neutral" variant="subtle" size="sm" :label="`${item.calories} kcal`" />
            <UBadge v-if="item.prepTimeMinutes" color="neutral" variant="subtle" size="sm" icon="i-lucide-timer" :label="`${item.prepTimeMinutes} min`" />
          </div>
          <p v-if="item.allergens.length" class="text-xs text-muted">
            <UIcon name="i-lucide-triangle-alert" class="mr-1 size-3.5 align-[-2px] text-warning" />
            Allergènes : {{ item.allergens.map((a) => ALLERGENS[a] ?? a).join(', ') }}
          </p>
        </div>

        <fieldset
          v-for="group in item.optionGroups"
          :id="`group-${group.id}`"
          :key="group.id"
          class="border-t border-default px-4 py-3"
        >
          <legend class="sr-only">{{ group.name }}</legend>
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="font-semibold text-highlighted">{{ group.name }}</p>
            <UBadge
              :color="showErrors && errors[group.id] ? 'error' : 'neutral'"
              variant="subtle"
              size="sm"
              :label="showErrors && errors[group.id] ? errors[group.id] : groupHint(group)"
            />
          </div>
          <div class="space-y-1">
            <button
              v-for="opt in group.options"
              :key="opt.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-elevated/60 disabled:opacity-50"
              :disabled="!opt.isAvailable"
              :aria-pressed="selected.includes(opt.id)"
              @click="toggle(group, opt.id)"
            >
              <span
                class="flex size-5 shrink-0 items-center justify-center border-2 transition"
                :class="[
                  isSingleChoice(group) ? 'rounded-full' : 'rounded-md',
                  selected.includes(opt.id) ? 'border-primary bg-primary text-inverted' : 'border-accented',
                ]"
              >
                <UIcon v-if="selected.includes(opt.id)" :name="isSingleChoice(group) ? 'i-lucide-dot' : 'i-lucide-check'" class="size-4" />
              </span>
              <span class="flex-1">{{ opt.name }}<span v-if="!opt.isAvailable" class="text-xs text-muted"> · épuisé</span></span>
              <span v-if="opt.priceDelta" class="tabular text-sm text-muted">
                {{ opt.priceDelta > 0 ? '+' : '' }}{{ money(opt.priceDelta) }}
              </span>
            </button>
          </div>
        </fieldset>

        <div class="border-t border-default px-4 py-3">
          <label for="item-notes" class="mb-1.5 block font-semibold text-highlighted">Une précision ?</label>
          <UTextarea
            id="item-notes"
            v-model="notes"
            :rows="2"
            :maxlength="255"
            autoresize
            placeholder="Ex. sans oignon, sauce à part…"
            class="w-full"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="item" class="flex items-center gap-3 pb-safe">
        <QuantityStepper v-model="quantity" :max="MAX_QUANTITY" size="lg" />
        <UButton block size="xl" class="flex-1 justify-between" @click="add">
          <span>Ajouter</span>
          <span class="tabular">{{ money(total) }}</span>
        </UButton>
      </div>
    </template>
  </UDrawer>
</template>
