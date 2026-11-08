<script setup lang="ts">
// Colonne mobile centrée : sur grand écran, l'application garde un format téléphone.
</script>

<template>
  <div class="min-h-dvh bg-muted">
    <div class="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-default shadow-sm">
      <slot />
    </div>
  </div>
</template>
