<template>
  <StartScreen v-if="!gameStore.isPlaying" @play="startGame" />
  <GameLayout v-else />
</template>

<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const gameStore = useGameStore();

const startGame = async () => {
  await gameStore.startGame();
};
</script>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
