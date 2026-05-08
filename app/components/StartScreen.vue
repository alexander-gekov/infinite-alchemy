<template>
  <div
    class="box-border flex min-h-dvh flex-col flex-wrap items-center justify-center gap-4 bg-gray-100 ps-[max(1rem,env(safe-area-inset-left,0px))] pe-[max(1rem,env(safe-area-inset-right,0px))] pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] text-wrap">
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
