<template>
  <div
    class="h-dvh flex flex-col gap-4 items-center justify-center bg-gray-100 text-wrap flex-wrap">
    <div class="flex flex-col items-center justify-center md:px-0 gap-2">
      <img :src="logo" alt="Infinite Alchemy" class="w-36 h-36 ml-4" />
      <h1 class="text-2xl font-bold">Infinite Alchemy</h1>
      <p class="text-sm text-center text-gray-500">
        A game about creating infinite combinations of elements using AI.
      </p>
    </div>

    <div class="flex flex-col gap-2 items-center">
      <Button variant="default" size="lg" @click="$emit('play')">
        Play
      </Button>
      <Button variant="outline" size="lg" @click="$emit('storyMode')">
        <LucideBookOpen class="w-4 h-4 mr-2" />
        Story Mode
      </Button>
      <Button variant="outline" size="lg" @click="$emit('collectionMode')">
        <LucideTrees class="w-4 h-4 mr-2" />
        Collection Mode
      </Button>
    </div>

    <p
      v-if="completedCount > 0"
      class="text-xs text-muted-foreground italic mt-1">
      {{ completedCount }} {{ completedCount === 1 ? 'story' : 'stories' }} completed
    </p>
    <p
      v-if="collectedCount > 0"
      class="text-xs text-muted-foreground italic">
      {{ collectedCount }} / {{ collectionTotal }} {{ collectionName }} discovered
    </p>
  </div>
</template>

<script setup lang="ts">
import { LucideBookOpen, LucideTrees } from "lucide-vue-next";
import { useStoryStore } from "~/stores/story";
import { useCollectionStore } from "~/stores/collection";
import logo from "~/assets/images/logo.png";

defineEmits<{
  play: [];
  storyMode: [];
  collectionMode: [];
}>();

const storyStore = useStoryStore();
const completedCount = computed(() => storyStore.completedStories.length);

const collectionStore = useCollectionStore();
const collectedCount = computed(() => collectionStore.discoveredCount);
const collectionTotal = computed(() => collectionStore.totalCount);
const collectionName = computed(() => collectionStore.topic.name);
</script>
