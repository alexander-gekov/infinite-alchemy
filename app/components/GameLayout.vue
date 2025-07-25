<template>
  <div class="flex h-screen">
    <div class="flex-1 bg-background/50 relative">
      <div
        ref="canvas"
        class="absolute inset-0 bg-[url('/paper.png')] bg-repeat"
        @dragover.prevent
        @drop="handleDrop">
        <div class="absolute inset-0 bg-background/50 backdrop-blur-[1px]" />
        <div
          v-for="element in gameStore.canvasElements"
          :key="element.id"
          class="absolute cursor-move z-10"
          :style="{
            left: `${element.position?.x || 0}px`,
            top: `${element.position?.y || 0}px`,
          }"
          draggable="true"
          @dragstart="handleDragStart($event, element)"
          @dragend="handleDragEnd($event, element)"
          @dblclick="handleDuplicate(element)">
          <img
            :src="element.icon"
            :alt="element.name"
            class="w-16 h-16 object-contain transition-opacity duration-200"
            :class="{
              'opacity-30': elementBeingDraggedOver?.id === element.id,
            }"
            draggable="false" />
          <span class="text-xs text-center block mt-1 text-gray-600">{{
            element.name
          }}</span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger class="absolute bottom-8 right-6 z-50" as-child
              ><LucideRecycle
                class="w-fit cursor-pointer text-muted-foreground hover:text-primary"
                @click="gameStore.clearCanvas"
            /></TooltipTrigger>
            <TooltipContent>
              <p>Clear canvas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <div class="w-64 bg-background border-l border-gray-200 overflow-y-auto">
      <div class="p-4">
        <h2 class="text-lg font-bold">Available Elements</h2>
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
            @dragstart="handleSidebarDragStart($event, element, true)"
            @dragend="handleSidebarDragEnd($event)">
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
import { LucideRecycle } from "lucide-vue-next";
import { useGameStore } from "~/stores/game";

const gameStore = useGameStore();
const canvas = ref<HTMLElement | null>(null);
const draggedElement = ref<any>(null);
const dragOffset = ref({ x: 0, y: 0 });
const elementBeingDraggedOver = ref<any>(null);

onMounted(() => {
  console.log("GameLayout mounted, canvas elements:", gameStore.canvasElements);
});

const createDragPreview = (element: HTMLElement) => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = "translateY(-9999px)";
  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "0";
  clone.style.margin = "0";
  clone.style.boxShadow = "none";
  document.body.appendChild(clone);
  return clone;
};

const handleSidebarDragStart = (
  event: DragEvent,
  element: any,
  showSource: boolean = false
) => {
  if (!event.dataTransfer) return;

  draggedElement.value = {
    ...element,
    id: element.id + "_" + Date.now(),
  };

  const preview = createDragPreview(event.target as HTMLElement);
  event.dataTransfer.setDragImage(preview, 25, 25);
  event.dataTransfer.effectAllowed = "move";

  setTimeout(() => {
    if (!showSource) {
      (event.target as HTMLElement).style.opacity = "0";
      document.body.removeChild(preview);
    }
  }, 0);

  dragOffset.value = {
    x: 25,
    y: 25,
  };
};

const handleSidebarDragEnd = (event: DragEvent) => {
  (event.target as HTMLElement).style.opacity = "1";
};

const checkElementOverlap = (element1: any, element2: any) => {
  const rect1 = {
    left: element1.position.x,
    right: element1.position.x + 64, // width of the element (w-16 = 64px)
    top: element1.position.y,
    bottom: element1.position.y + 64,
  };

  const rect2 = {
    left: element2.position.x,
    right: element2.position.x + 64,
    top: element2.position.y,
    bottom: element2.position.y + 64,
  };

  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
};

const handleDragStart = (event: DragEvent, element: any) => {
  if (!event.dataTransfer) return;

  draggedElement.value = element;
  elementBeingDraggedOver.value = null;

  const preview = createDragPreview(event.target as HTMLElement);
  event.dataTransfer.setDragImage(preview, 25, 25);
  event.dataTransfer.effectAllowed = "move";

  setTimeout(() => {
    (event.target as HTMLElement).style.opacity = "0";
    document.body.removeChild(preview);
  }, 0);

  dragOffset.value = {
    x: 25,
    y: 25,
  };

  // Add dragover event listener to track element being dragged over
  window.addEventListener("dragover", handleElementDragOver);
};

const handleElementDragOver = (event: DragEvent) => {
  if (!canvas.value || !draggedElement.value) return;

  const canvasRect = canvas.value.getBoundingClientRect();
  const x = event.clientX - canvasRect.left - dragOffset.value.x;
  const y = event.clientY - canvasRect.top - dragOffset.value.y;

  const testElement = {
    ...draggedElement.value,
    position: { x, y },
  };

  const targetElement = gameStore.canvasElements.find(
    (e) =>
      e.id !== draggedElement.value.id && checkElementOverlap(testElement, e)
  );

  elementBeingDraggedOver.value = targetElement;
};

const handleDragEnd = (event: DragEvent, element: any) => {
  (event.target as HTMLElement).style.opacity = "1";
  window.removeEventListener("dragover", handleElementDragOver);

  if (!canvas.value) return;

  const canvasRect = canvas.value.getBoundingClientRect();
  const isOutsideCanvas =
    event.clientX < canvasRect.left ||
    event.clientX > canvasRect.right ||
    event.clientY < canvasRect.top ||
    event.clientY > canvasRect.bottom;

  if (isOutsideCanvas) {
    gameStore.removeCanvasElement(element.id);
    draggedElement.value = null;
    elementBeingDraggedOver.value = null;
    return;
  }

  // Update element position
  const x = event.clientX - canvasRect.left - dragOffset.value.x;
  const y = event.clientY - canvasRect.top - dragOffset.value.y;

  // Keep element within canvas bounds
  const boundedX = Math.max(0, Math.min(x, canvasRect.width - 48));
  const boundedY = Math.max(0, Math.min(y, canvasRect.height - 48));

  gameStore.updateElementPosition(element.id, {
    x: boundedX,
    y: boundedY,
  });

  draggedElement.value = null;
  elementBeingDraggedOver.value = null;
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  if (!canvas.value || !draggedElement.value) return;

  const canvasRect = canvas.value.getBoundingClientRect();
  const isOutsideCanvas =
    event.clientX < canvasRect.left ||
    event.clientX > canvasRect.right ||
    event.clientY < canvasRect.top ||
    event.clientY > canvasRect.bottom;

  if (isOutsideCanvas) {
    if (draggedElement.value.id) {
      gameStore.removeCanvasElement(draggedElement.value.id);
    }
    draggedElement.value = null;
    elementBeingDraggedOver.value = null;
    return;
  }

  const x = event.clientX - canvasRect.left - dragOffset.value.x;
  const y = event.clientY - canvasRect.top - dragOffset.value.y;

  // Keep element within canvas bounds
  const boundedX = Math.max(0, Math.min(x, canvasRect.width - 48));
  const boundedY = Math.max(0, Math.min(y, canvasRect.height - 48));

  const testElement = {
    ...draggedElement.value,
    position: { x: boundedX, y: boundedY },
  };

  const targetElement = gameStore.canvasElements.find(
    (e) =>
      e.id !== draggedElement.value.id && checkElementOverlap(testElement, e)
  );

  if (targetElement) {
    alert("Combining!");
  }

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
  elementBeingDraggedOver.value = null;
};

const handleDuplicate = (element: any) => {
  const offset = 20; // Offset for the duplicated element
  const newElement = {
    ...element,
    id: element.id + "_" + Date.now(),
    position: {
      x: element.position.x + offset,
      y: element.position.y + offset,
    },
  };
  gameStore.addCanvasElement(newElement);
};
</script>

<style scoped>
.h-screen {
  height: 100vh;
}
</style>
