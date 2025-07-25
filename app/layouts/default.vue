<template>
  <DndProvider :backend="HTML5Backend">
    <div class="min-h-screen bg-background">
      <NavBar />
      <main>
        <slot />
      </main>
    </div>
  </DndProvider>
</template>

<script setup lang="ts">
import { DndProvider } from "vue3-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
</script>
