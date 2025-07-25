<template>
  <Toaster />
  <div class="min-h-screen bg-background">
    <!-- <NavBar /> -->
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner";
import "vue-sonner/style.css";
</script>
