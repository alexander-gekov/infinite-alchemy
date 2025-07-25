<template>
  <div class="flex h-screen">
    <div
      v-if="isCombining"
      class="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-4 text-center">
        <LucideLoader2 class="w-10 h-10 mx-auto mb-2 animate-spin" />
        <p class="text-sm">Combining elements...</p>
      </div>
    </div>
    <div class="flex-1 bg-white relative min-w-[40%] shrink-0">
      <div
        ref="canvas"
        class="absolute inset-0 bg-repeat"
        @dragover.prevent
        @drop="handleDrop">
        <div
          v-for="element in canvasElements"
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
            :src="element.img"
            :alt="element.name"
            class="w-22 h-22 rounded-full transition-opacity duration-200"
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger class="absolute bottom-18 right-6 z-50" as-child
              ><LucidePower
                class="w-fit cursor-pointer text-muted-foreground hover:text-primary"
                @click="gameStore.resetGame"
            /></TooltipTrigger>
            <TooltipContent>
              <p>Reset game</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <!-- Floating Generate UI -->
        <div class="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-96 z-40">
          <Card>
            <CardContent>
              <div class="flex gap-2">
                <Input
                  class="text-sm"
                  v-model="newElementPrompt"
                  type="text"
                  placeholder="Enter element name"
                  @keyup.enter="generateElement" />
                <Button @click="generateElement" variant="default">
                  <LucidePlus class="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div class="w-8 bg-background flex flex-col items-center py-2">
      <button
        v-for="letter in alphabet"
        :key="letter"
        class="w-6 h-6 text-xs flex items-center justify-center rounded-sm mb-1 font-medium"
        :class="{
          'text-primary cursor-pointer hover:bg-gray-100':
            hasElementsStartingWith(letter),
          'text-gray-300': !hasElementsStartingWith(letter),
        }"
        @click="scrollToLetter(letter)"
        :disabled="!hasElementsStartingWith(letter)">
        {{ letter }}
      </button>
    </div>

    <div class="w-64 bg-background border-l border-gray-200 flex flex-col">
      <div class="p-4 flex-1 overflow-y-auto" ref="elementsContainer">
        <h2 class="text-md font-bold">
          Available Elements ({{ availableElements.length }})
        </h2>
        <div class="grid gap-2 pt-2">
          <div
            v-if="availableElements.length === 0"
            class="flex flex-col gap-2">
            <Skeleton v-for="i in 2" :key="i" class="w-full h-12" />
            <p class="text-sm text-muted-foreground">
              Loading base elements...
            </p>
          </div>
          <template v-for="letter in alphabet" :key="letter">
            <div
              v-if="getElementsByLetter(letter).length > 0"
              :id="'letter-' + letter">
              <div class="text-xs font-semibold text-gray-500 py-1">
                {{ letter }}
              </div>
              <div
                v-for="element in getElementsByLetter(letter)"
                :key="element.id"
                class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-move"
                draggable="true"
                @dragstart="handleSidebarDragStart($event, element, true)"
                @dragend="handleSidebarDragEnd($event)">
                <img
                  :src="element.img"
                  :alt="element.name"
                  class="w-12 h-12 rounded-full"
                  draggable="false" />
                <span class="text-sm text-gray-600">{{ element.name }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LucidePower,
  LucideRecycle,
  LucidePlus,
  LucideLoaderPinwheel,
  LucideLoader2,
} from "lucide-vue-next";
import { Card, CardContent } from "#components";

import { useGameStore, type Element } from "~/stores/game";

const gameStore = useGameStore();
const { availableElements, canvasElements } = storeToRefs(gameStore);
const {
  addAvailableElement,
  addCanvasElement,
  removeCanvasElement,
  updateElementPosition,
} = gameStore;
const canvas = ref<HTMLElement | null>(null);
const elementsContainer = ref<HTMLElement | null>(null);
const draggedElement = ref<any>(null);
const dragOffset = ref({ x: 0, y: 0 });
const elementBeingDraggedOver = ref<any>(null);
const newElementPrompt = ref("");
const isCombining = ref(false);

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const getElementsByLetter = (letter: string) => {
  return availableElements.value.filter((element) =>
    element.name.toUpperCase().startsWith(letter)
  );
};

const hasElementsStartingWith = (letter: string) => {
  return getElementsByLetter(letter).length > 0;
};

const scrollToLetter = (letter: string) => {
  if (!hasElementsStartingWith(letter)) return;

  const element = document.getElementById(`letter-${letter}`);
  if (element) {
    elementsContainer.value?.scrollTo({
      top: element.offsetTop - 80, // Account for the sticky header
      behavior: "smooth",
    });
  }
};

const scrollToBottom = () => {
  if (elementsContainer.value) {
    elementsContainer.value.scrollTop = elementsContainer.value.scrollHeight;
  }
};

const createDragPreview = (element: HTMLElement) => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = "translateY(-9999px)";
  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "0";
  clone.style.margin = "0";
  clone.style.boxShadow = "none";
  clone.style.backdropFilter = "none";
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
  event.dataTransfer.setDragImage(preview, 0, 0);
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

  const targetElement = canvasElements.value.find(
    (e) =>
      e.id !== draggedElement.value.id && checkElementOverlap(testElement, e)
  );

  elementBeingDraggedOver.value = targetElement;
  elementBeingDraggedOver.value.style.opacity = "0.8";
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
    removeCanvasElement(element.id);
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

  updateElementPosition(element.id, {
    x: boundedX,
    y: boundedY,
  });

  draggedElement.value = null;
  elementBeingDraggedOver.value = null;
};

const combineElements = async (
  element1: Element,
  element2: Element,
  position: { x: number; y: number }
) => {
  isCombining.value = true;

  try {
    const element = await $fetch<Element>("/api/elements/combine", {
      method: "POST",
      body: {
        prompt: `You are an average question guesser, don't try to be smart. What do you think happens when we combine ${element1.name} and ${element2.name}? Give me a real everyday noun and a description, if unsure just return a related noun.`,
      },
    });

    // Add the new element to available elements
    addAvailableElement(element);

    // Add the new combined element to the canvas
    addCanvasElement({
      ...element,
      position: {
        x: position.x,
        y: position.y,
      },
    });

    // Remove the original elements
    removeCanvasElement(element1.id);
    removeCanvasElement(element2.id);
  } catch (error) {
    console.error("Failed to combine elements:", error);
    throw error;
  } finally {
    isCombining.value = false;
  }
};

const handleDrop = async (event: DragEvent) => {
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
      removeCanvasElement(draggedElement.value.id);
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

  const targetElement = canvasElements.value.find(
    (e) =>
      e.id !== draggedElement.value.id && checkElementOverlap(testElement, e)
  );

  if (targetElement) {
    await combineElements(draggedElement.value, targetElement, {
      x: boundedX,
      y: boundedY,
    });
  } else {
    // If it's a new element from sidebar
    if (
      !gameStore.canvasElements.find((e) => e.id === draggedElement.value.id)
    ) {
      addCanvasElement({
        ...draggedElement.value,
        position: { x: boundedX, y: boundedY },
      });
    } else {
      // Update existing element position
      updateElementPosition(draggedElement.value.id, {
        x: boundedX,
        y: boundedY,
      });
    }
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
  addCanvasElement(newElement);
};

const generateElement = async () => {
  if (!newElementPrompt.value.trim()) return;

  const element = await $fetch<Element>("/api/elements/generate", {
    method: "POST",
    body: { prompt: newElementPrompt.value },
  });

  addAvailableElement(element);
  addCanvasElement({
    ...element,
    position: { x: 100, y: 100 },
  });

  newElementPrompt.value = "";

  nextTick(() => {
    scrollToBottom();
  });
};
</script>

<style scoped>
.h-screen {
  height: 100vh;
}
</style>
