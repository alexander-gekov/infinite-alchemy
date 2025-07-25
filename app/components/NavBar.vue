<template>
  <header class="border-b">
    <nav class="container flex py-2 items-center px-4">
      <NuxtLink to="/" class="flex items-center gap-2">
        <img :src="logo" alt="Infinite Alchemy" class="w-8 h-8" />
        <h1 class="text-xl font-bold">Infinite Alchemy</h1>
      </NuxtLink>

      <div class="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="sm"> How to Play </Button>
        <Button variant="ghost" size="sm"> Leaderboard </Button>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import logo from "~/assets/images/logo.png";
</script>
