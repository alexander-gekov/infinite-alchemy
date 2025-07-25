<template>
  <div class="flex h-screen">
    <div class="flex-1 bg-gray-100 relative">
      <div
        ref="canvas"
        class="absolute inset-0"
        @dragover.prevent
        @drop="handleDrop">
        <div
          v-for="element in gameStore.canvasElements"
          :key="element.id"
          class="absolute cursor-move"
          :style="{
            left: `${element.position?.x || 0}px`,
            top: `${element.position?.y || 0}px`,
          }"
          draggable="true"
          @dragstart="handleDragStart($event, element)"
          @dragend="handleDragEnd($event, element)">
          <!-- <img
            :src="element.icon"
            :alt="element.name"
            class="w-12 h-12 object-contain"
            draggable="false" /> -->
          <span class="text-xs text-center block mt-1 text-gray-600">{{
            element.name
          }}</span>
        </div>
      </div>
    </div>

    <div class="w-64 bg-primary border-l border-gray-200 overflow-y-auto">
      <div class="p-4">
        <div class="grid gap-2">
          <div
            v-if="gameStore.availableElements.length === 0"
            class="flex flex-col gap-2">
            <Skeleton v-for="i in 4" :key="i" class="w-full h-12" />
            <p class="text-sm text-muted-foreground">
              Loading base elements...
            </p>
          </div>
          <div
            v-for="element in gameStore.availableElements"
            :key="element.id"
            class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-move"
            draggable="true"
            @dragstart="handleSidebarDragStart($event, element)">
            <img
              :src="element.icon"
              :alt="element.name"
              class="w-10 h-10 object-contain"
              draggable="false" />
            <span class="text-sm text-gray-600">{{ element.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const gameStore = useGameStore();
const canvas = ref<HTMLElement | null>(null);
const draggedElement = ref<any>(null);
const dragOffset = ref({ x: 0, y: 0 });

const handleSidebarDragStart = (event: DragEvent, element: any) => {
  if (!event.dataTransfer) return;

  draggedElement.value = {
    ...element,
    id: element.id + "_" + Date.now(),
  };

  // Set drag image
  const img = new Image();
  img.src = element.icon;
  event.dataTransfer.setDragImage(img, 25, 25);

  // Store the mouse offset
  dragOffset.value = {
    x: 25,
    y: 25,
  };
};

const handleDragStart = (event: DragEvent, element: any) => {
  if (!event.dataTransfer) return;

  draggedElement.value = element;

  // Calculate offset from element's top-left corner
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

const handleDragEnd = (event: DragEvent, element: any) => {
  if (!canvas.value) return;

  // Update element position
  const canvasRect = canvas.value.getBoundingClientRect();
  const x = event.clientX - canvasRect.left - dragOffset.value.x;
  const y = event.clientY - canvasRect.top - dragOffset.value.y;

  // Keep element within canvas bounds
  const boundedX = Math.max(0, Math.min(x, canvasRect.width - 48));
  const boundedY = Math.max(0, Math.min(y, canvasRect.height - 48));

  gameStore.updateElementPosition(element.id, {
    x: boundedX,
    y: boundedY,
  });
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  if (!canvas.value || !draggedElement.value) return;

  const canvasRect = canvas.value.getBoundingClientRect();
  const x = event.clientX - canvasRect.left - dragOffset.value.x;
  const y = event.clientY - canvasRect.top - dragOffset.value.y;

  // Keep element within canvas bounds
  const boundedX = Math.max(0, Math.min(x, canvasRect.width - 48));
  const boundedY = Math.max(0, Math.min(y, canvasRect.height - 48));

  // If it's a new element from sidebar
  if (!gameStore.canvasElements.find((e) => e.id === draggedElement.value.id)) {
    gameStore.addCanvasElement({
      ...draggedElement.value,
      position: { x: boundedX, y: boundedY },
    });
  } else {
    // Update existing element position
    gameStore.updateElementPosition(draggedElement.value.id, {
      x: boundedX,
      y: boundedY,
    });
  }

  draggedElement.value = null;
};
</script>

<style scoped>
.h-screen {
  height: 100vh;
}
</style>
