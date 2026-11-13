<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';
import { isValidPhone, PHONE_ERROR } from '~/utils/phone';

useHead({ title: 'Créer un compte' });

const auth = useAuthStore();

const schema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(100),
  lastName: z.string().trim().min(1, 'Nom requis').max(100),
  email: z.string().trim().pipe(z.email('Adresse email invalide')),
  phone: z.string().refine((v) => !v || isValidPhone(v), PHONE_ERROR).optional(),
  password: z
    .string()
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/, '8 caractères minimum, dont au moins une lettre et un chiffre'),
  acceptTerms: z.boolean().refine((v) => v, 'Veuillez accepter les conditions générales'),
});
type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  acceptTerms: false,
});
const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = null;
  loading.value = true;
  try {
    const { phone, ...rest } = event.data;
    await auth.register({ ...rest, ...(phone && { phone }) });
    await navigateTo('/compte', { replace: true });
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppTopBar title="Créer un compte" back="/compte" />
    <main class="flex-1 space-y-5 p-5">
      <p class="text-sm text-muted">Historique de vos commandes, « commander à nouveau » et points de fidélité.</p>
      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Prénom" name="firstName">
            <UInput v-model="state.firstName" autocomplete="given-name" class="w-full" size="lg" />
          </UFormField>
          <UFormField label="Nom" name="lastName">
            <UInput v-model="state.lastName" autocomplete="family-name" class="w-full" size="lg" />
          </UFormField>
        </div>
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" size="lg" />
        </UFormField>
        <UFormField label="Téléphone" name="phone" hint="Facultatif">
          <PhoneInput v-model="state.phone" class="w-full" size="lg" />
        </UFormField>
        <UFormField label="Mot de passe" name="password" help="8 caractères minimum, avec au moins une lettre et un chiffre.">
          <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" size="lg" />
        </UFormField>
        <UFormField name="acceptTerms">
          <UCheckbox v-model="state.acceptTerms" label="J’accepte les conditions générales d’utilisation et la politique de confidentialité" />
        </UFormField>
        <UButton type="submit" block size="lg" label="Créer mon compte" :loading="loading" />
      </UForm>
    </main>
  </div>
</template>
