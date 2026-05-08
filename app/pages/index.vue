<template>
  <StartScreen
    v-if="!isPlaying"
    @play="startFreeplay"
    @story-mode="startStoryMode" />
  <GameLayout v-else />
</template>

<script setup lang="ts">
import { useGameStore } from "~/stores/game";
import { useStoryStore } from "~/stores/story";

const gameStore = useGameStore();
const storyStore = useStoryStore();
const { isPlaying } = storeToRefs(gameStore);

const startFreeplay = async () => {
  await gameStore.startGame();
  gameStore.setGameMode("freeplay");
};

const startStoryMode = async () => {
  await gameStore.startGame();
  gameStore.setGameMode("story");
  storyStore.generateStory();
};
</script>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
