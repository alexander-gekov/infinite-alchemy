<template>
  <header class="border-b">
    <nav class="container flex py-2 items-center px-4">
      <NuxtLink to="/" class="flex items-center gap-2">
        <img :src="logo" alt="Infinite Alchemy" class="w-8 h-8" />
      </NuxtLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import logo from "~/assets/images/logo.png";
</script>
