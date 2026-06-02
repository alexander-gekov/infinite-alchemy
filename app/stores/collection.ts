import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import {
  FORESTS_AND_GREENERY,
  type CollectionItem,
} from "~/data/collection";

const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

export const useCollectionStore = defineStore("collection", () => {
  const topic = FORESTS_AND_GREENERY;
  const itemsById = new Map(topic.items.map((item) => [item.id, item]));

  const discoveredIds = useStorage(
    `collection:${topic.id}:discovered`,
    [] as string[]
  );
  const isDexOpen = ref(false);

  const discoveredSet = computed(() => new Set(discoveredIds.value));
  const discoveredCount = computed(() => discoveredSet.value.size);
  const totalCount = computed(() => topic.items.length);
  const isComplete = computed(
    () => discoveredCount.value >= totalCount.value
  );

  const isDiscovered = (id: string) => discoveredSet.value.has(id);

  const markDiscovered = (id: string) => {
    if (!discoveredIds.value.includes(id)) {
      discoveredIds.value = [...discoveredIds.value, id];
    }
  };

  // Returns the matched item only when it is newly discovered, so callers can
  // surface a "new discovery" toast. Already-known items return null.
  const tryDiscover = (name: string): CollectionItem | null => {
    const id = normalize(name);
    const item = itemsById.get(id);
    if (!item || isDiscovered(id)) return null;
    markDiscovered(id);
    return item;
  };

  // Backfill discoveries from elements the player already owns (e.g. earned in
  // freeplay before entering collection mode).
  const syncFromNames = (names: string[]) => {
    for (const name of names) {
      const id = normalize(name);
      if (itemsById.has(id)) markDiscovered(id);
    }
  };

  const openDex = () => {
    isDexOpen.value = true;
  };
  const closeDex = () => {
    isDexOpen.value = false;
  };
  const toggleDex = () => {
    isDexOpen.value = !isDexOpen.value;
  };

  const resetCollection = () => {
    discoveredIds.value = [];
    isDexOpen.value = false;
  };

  return {
    topic,
    discoveredIds,
    isDexOpen,
    discoveredCount,
    totalCount,
    isComplete,
    isDiscovered,
    tryDiscover,
    syncFromNames,
    openDex,
    closeDex,
    toggleDex,
    resetCollection,
  };
});
