<template>
  <!-- Floating progress button (opens the Dex) -->
  <button
    v-if="!collectionStore.isDexOpen"
    class="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-4 z-30 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-emerald-100 px-3 py-1.5 cursor-pointer hover:bg-white transition-colors"
    @click="collectionStore.openDex()">
    <LucideTrees class="w-4 h-4 text-emerald-600" />
    <span class="text-xs font-semibold text-gray-700">
      {{ collectionStore.discoveredCount }} / {{ collectionStore.totalCount }}
    </span>
  </button>

  <!-- Dex overlay -->
  <div
    v-if="collectionStore.isDexOpen"
    class="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-emerald-50 to-white"
    :style="{ paddingTop: 'env(safe-area-inset-top)' }">
    <!-- Header -->
    <div
      class="shrink-0 border-b border-emerald-100 bg-white/80 backdrop-blur-sm px-4 py-3">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <LucideTrees class="w-5 h-5 text-emerald-600 shrink-0" />
          <div class="min-w-0">
            <h2 class="text-sm md:text-base font-bold text-gray-800 truncate">
              {{ collectionStore.topic.name }}
            </h2>
            <p class="hidden md:block text-xs text-muted-foreground truncate">
              {{ collectionStore.topic.description }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" @click="handleBackToFreeplay">
            <LucideGamepad2 class="w-4 h-4 md:mr-1" />
            <span class="hidden md:inline">Freeplay</span>
          </Button>
          <Button variant="ghost" size="icon" @click="collectionStore.closeDex()">
            <LucideX class="w-5 h-5" />
          </Button>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mx-auto mt-2 max-w-5xl">
        <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            {{ collectionStore.discoveredCount }} of
            {{ collectionStore.totalCount }} discovered
          </span>
          <span v-if="collectionStore.isComplete" class="text-emerald-600 font-semibold">
            Complete!
          </span>
          <span v-else>{{ progressPercent }}%</span>
        </div>
        <div class="h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
          <div
            class="h-full rounded-full bg-emerald-500 transition-all duration-500"
            :style="{ width: progressPercent + '%' }" />
        </div>
      </div>
    </div>

    <!-- Grid -->
    <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
      <div
        class="mx-auto grid max-w-5xl grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-3 lg:grid-cols-8">
        <div
          v-for="(item, index) in collectionStore.topic.items"
          :key="item.id"
          class="flex flex-col items-center rounded-xl border p-2 text-center transition-colors"
          :class="
            collectionStore.isDiscovered(item.id)
              ? 'border-emerald-200 bg-white shadow-sm'
              : 'border-gray-200 bg-gray-50'
          ">
          <span class="self-start text-[10px] font-mono text-gray-400">
            #{{ String(index + 1).padStart(3, '0') }}
          </span>

          <!-- Discovered: real image -->
          <template v-if="collectionStore.isDiscovered(item.id)">
            <img
              :src="imageFor(item.id) || logo"
              :alt="item.name"
              class="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover"
              draggable="false" />
            <span class="mt-1 text-[11px] md:text-xs font-medium text-gray-700 leading-tight">
              {{ item.name }}
            </span>
          </template>

          <!-- Undiscovered: shadowed silhouette -->
          <template v-else>
            <div
              class="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-300 flex items-center justify-center">
              <LucideHelpCircle class="w-7 h-7 text-gray-400" />
            </div>
            <span class="mt-1 text-[11px] md:text-xs font-medium text-gray-400 leading-tight">
              ???
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LucideTrees,
  LucideX,
  LucideGamepad2,
  LucideHelpCircle,
} from "lucide-vue-next";
import { useCollectionStore } from "~/stores/collection";
import { useGameStore } from "~/stores/game";
import logo from "~/assets/images/logo.png";

const collectionStore = useCollectionStore();
const gameStore = useGameStore();
const { availableElements } = storeToRefs(gameStore);

const progressPercent = computed(() =>
  Math.round(
    (collectionStore.discoveredCount / collectionStore.totalCount) * 100
  )
);

// Images fetched directly from the cache by id, so the Dex still shows them
// even after a game reset removes the element from the owned list.
const fetchedImages = ref<Map<string, string>>(new Map());

// Discovered items were created through combine/generate, so their generated
// image is also available on the currently owned element with the same id.
const ownedImages = computed(() => {
  const map = new Map<string, string>();
  for (const el of availableElements.value) {
    if (el.img) map.set(el.id, el.img);
  }
  return map;
});

const imageFor = (id: string) =>
  ownedImages.value.get(id) || fetchedImages.value.get(id) || "";

const loadDiscoveredImages = async () => {
  const missing = collectionStore.discoveredIds.filter((id) => !imageFor(id));
  if (missing.length === 0) return;

  try {
    const images = await $fetch<{ id: string; img: string }[]>(
      "/api/redis/get/all",
      { method: "POST", body: { ids: missing } }
    );
    const next = new Map(fetchedImages.value);
    for (const { id, img } of images) {
      if (img) next.set(id, img);
    }
    fetchedImages.value = next;
  } catch {
    // non-critical; cards fall back to a placeholder
  }
};

watch(
  () => collectionStore.isDexOpen,
  (open) => {
    if (open) loadDiscoveredImages();
  },
  { immediate: true }
);

watch(
  () => collectionStore.discoveredCount,
  () => {
    if (collectionStore.isDexOpen) loadDiscoveredImages();
  }
);

const handleBackToFreeplay = () => {
  collectionStore.closeDex();
  gameStore.setGameMode("freeplay");
};
</script>
