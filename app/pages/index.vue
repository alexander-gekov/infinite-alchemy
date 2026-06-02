<template>
  <StartScreen
    v-if="!isPlaying"
    @play="startFreeplay"
    @story-mode="startStoryMode"
    @collection-mode="startCollectionMode" />
  <GameLayout v-else />
</template>

<script setup lang="ts">
import { useGameStore } from "~/stores/game";
import { useStoryStore } from "~/stores/story";
import { useCollectionStore } from "~/stores/collection";

const gameStore = useGameStore();
const storyStore = useStoryStore();
const collectionStore = useCollectionStore();
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

const startCollectionMode = async () => {
  await gameStore.startGame();
  gameStore.setGameMode("collection");
  collectionStore.syncFromNames(gameStore.availableElements.map((e) => e.name));
  collectionStore.openDex();
};
</script>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
