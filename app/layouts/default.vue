<template>
  <UseScreenSafeArea top right bottom left>
    <Toaster />
    <div class="min-h-screen bg-background">
      <!-- <NavBar /> -->
      <main>
        <slot />
      </main>
    </div>
  </UseScreenSafeArea>
</template>

<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner";
import "vue-sonner/style.css";
</script>
