<template>
  <div
    class="min-h-dvh h-dvh box-border flex flex-col gap-4 items-center justify-center bg-gray-100 text-wrap flex-wrap pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
    <div class="flex flex-col items-center justify-center md:px-0 gap-2">
      <img :src="logo" alt="Infinite Alchemy" class="w-36 h-36 ml-4" />
      <h1 class="text-2xl font-bold">Infinite Alchemy</h1>
      <p class="text-sm text-center text-gray-500">
        A game about creating infinite combinations of elements using AI.
      </p>
    </div>

    <Button variant="default" size="lg" @click="$emit('play')"> Play </Button>
  </div>
</template>

<script setup lang="ts">
import logo from "~/assets/images/logo.png";

defineEmits<{
  play: [];
}>();
</script>
