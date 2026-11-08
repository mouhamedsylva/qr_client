<script setup lang="ts">
// Couleurs et thème du restaurant consulté ; compte client restauré en arrière-plan.
useBrandTheme();
const auth = useAuthStore();
onMounted(() => void auth.init());
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
