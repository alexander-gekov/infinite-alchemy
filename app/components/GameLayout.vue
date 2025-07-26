<template>
  <div class="flex h-screen relative">
    <div
      v-if="isCombining"
      class="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
      <div class="bg-white rounded-lg p-4 text-center">
        <LucideLoader2 class="w-10 h-10 mx-auto mb-2 animate-spin" />
        <p class="text-sm">Combining elements...</p>
      </div>
    </div>
    <div
      class="flex-1 bg-white relative min-w-[30%] md:min-w-[40%] md:shrink-0">
      <!-- Mobile Header -->
      <div
        v-if="!isDesktop"
        class="flex items-center justify-between p-4 border-b border-border bg-background">
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            class="flex items-center gap-2"
            @click="gameStore.clearCanvas">
            <LucideRecycle class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="flex items-center gap-2"
            @click="gameStore.resetGame">
            <LucidePower class="h-4 w-4" />
          </Button>
        </div>
        <div class="flex gap-4">
          <NuxtLink
            as="button"
            class="text-muted-foreground hover:text-primary"
            to="https://github.com/alexander-gekov"
            target="_blank">
            <LucideGithub class="h-5 w-5" />
          </NuxtLink>
          <NuxtLink
            as="button"
            class="text-muted-foreground hover:text-primary"
            to="https://x.com/AlexanderGekov"
            target="_blank">
            <LucideTwitter class="h-5 w-5" />
          </NuxtLink>
        </div>
      </div>

      <div
        ref="canvas"
        class="absolute inset-0 bg-repeat z-10"
        :class="{ 'top-[60px]': !isDesktop }"
        @dragover.prevent
        @drop="handleDrop"
        @touchmove.prevent="handleTouchMove"
        @touchend.prevent="handleTouchEnd">
        <!-- Canvas Elements -->
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
          @touchstart.prevent="handleTouchStart($event, element)"
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

        <!-- Desktop Actions -->
        <template v-if="isDesktop">
          <NuxtLink
            as="button"
            class="absolute top-4 right-6 z-50 cursor-pointer text-muted-foreground hover:text-primary"
            to="https://github.com/alexander-gekov"
            target="_blank">
            <LucideGithub />
          </NuxtLink>
          <NuxtLink
            as="button"
            class="absolute top-14 right-6 z-50 cursor-pointer text-muted-foreground hover:text-primary"
            to="https://x.com/AlexanderGekov"
            target="_blank">
            <LucideTwitter />
          </NuxtLink>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                class="absolute bottom-8 right-6 z-50 flex items-center justify-center"
                as-child>
                <LucideRecycle
                  class="w-fit cursor-pointer text-muted-foreground hover:text-primary"
                  @click="gameStore.clearCanvas" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear canvas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                class="absolute bottom-18 right-6 z-50 flex items-center justify-center"
                as-child>
                <LucidePower
                  class="w-fit cursor-pointer text-muted-foreground hover:text-primary"
                  @click="gameStore.resetGame" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset game</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </template>
      </div>

      <!-- Floating Generate UI -->
      <div
        class="fixed bottom-0 left-0 right-0 p-0 border-border z-30 md:absolute md:left-1/2 md:right-auto md:-translate-x-1/2 md:border-none md:mb-8">
        <div class="w-full md:w-96">
          <Card class="shadow-lg">
            <CardContent class="p-3">
              <div class="flex gap-2">
                <Input
                  ref="generateInput"
                  class="text-sm min-w-0"
                  v-model="newElementPrompt"
                  type="text"
                  placeholder="A dinosaur with wings..."
                  :disabled="isGenerating"
                  @keyup.enter="generateElement" />
                <Button
                  @click="generateElement"
                  variant="default"
                  :disabled="isGenerating"
                  class="shrink-0">
                  <LucideLoader2
                    v-if="isGenerating"
                    class="w-4 h-4 animate-spin" />
                  <LucidePlus v-else class="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div
      class="w-6 md:w-8 bg-background flex flex-col items-center py-2 mb-24 md:mb-0">
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

    <div
      class="w-36 md:w-64 bg-background border-l border-gray-200 flex flex-col mb-24 md:mb-0 overflow-hidden">
      <div
        class="p-4 flex-1 overflow-y-auto overscroll-contain"
        ref="elementsContainer">
        <h2
          class="text-xs text-center md:px-2 md:text-md font-semibold md:font-bold">
          Available Elements ({{ availableElements.length }})
        </h2>
        <div class="grid gap-2 pt-2">
          <div
            v-if="availableElements.length === 0"
            class="flex flex-col gap-2">
            <Skeleton v-for="i in 2" :key="i" class="w-full h-12" />
            <p class="text-xs md:text-sm text-muted-foreground">
              Loading base elements...
            </p>
          </div>
          <template v-for="letter in alphabet" :key="letter">
            <div
              v-if="getElementsByLetter(letter).length > 0"
              :id="'letter-' + letter">
              <div class="text-xs md:text-sm font-semibold text-gray-500 py-1">
                {{ letter }}
              </div>
              <div
                v-for="element in getElementsByLetter(letter)"
                :key="element.id"
                class="flex items-center gap-2 py-2 md:px-2 hover:bg-gray-100 rounded">
                <img
                  :src="element.img"
                  :alt="element.name"
                  draggable="true"
                  @dragstart="handleSidebarDragStart($event, element, true)"
                  @dragend="handleSidebarDragEnd($event)"
                  @touchstart.prevent="handleSidebarTouchStart($event, element)"
                  @touchmove.prevent="handleTouchMove"
                  @touchend.prevent="handleTouchEnd"
                  class="w-8 h-8 md:w-12 md:h-12 rounded-full cursor-move" />
                <span
                  class="text-xs md:text-sm text-gray-600 touch-none select-none"
                  >{{ element.name }}</span
                >
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
  LucideGithub,
  LucideTwitter,
  LucideMoreVertical,
} from "lucide-vue-next";
import { Card, CardContent } from "#components";

import { useGameStore, type Element } from "~/stores/game";
import { onStartTyping, useMediaQuery } from "@vueuse/core";
import { toast } from "vue-sonner";

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
const isGenerating = ref(false);
const isDesktop = useMediaQuery(
  "(min-width: 1024px)",
  { ssrWidth: 768 } // Will enable SSR mode and render like if the screen was 768px wide
);

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const generateInput = useTemplateRef<HTMLInputElement>("generateInput");

onStartTyping(() => {
  if (generateInput.value) {
    generateInput.value.focus();
  }
});

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
      retry: 2,
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
    toast((error as Error).message, {
      description: error as Error,
    });
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

  isGenerating.value = true;

  try {
    const element = await $fetch<Element>("/api/elements/generate", {
      method: "POST",
      body: { prompt: newElementPrompt.value },
      timeout: 5000,
      retry: 2,
    });

    addAvailableElement(element);
    addCanvasElement({
      ...element,
      position: isDesktop.value ? { x: 100, y: 100 } : { x: 50, y: 50 },
    });

    newElementPrompt.value = "";

    nextTick(() => {
      scrollToBottom();
    });
  } catch (error) {
    if ((error as any).statusCode === 429) {
      toast(
        "You've reached the limit. Please wait a few minutes before generating more elements."
      );
    } else {
      toast((error as Error).message);
    }
  } finally {
    isGenerating.value = false;
  }
};

const lastTapTime = ref(0);
const doubleTapDelay = 300; // milliseconds

const touchStartPosition = ref({ x: 0, y: 0 });
const touchedElement = ref<any>(null);
const initialElementPosition = ref({ x: 0, y: 0 });

const handleTouchStart = (event: TouchEvent, element: any) => {
  const touch = event.touches[0];
  if (!touch) return;

  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTapTime.value;

  if (tapLength < doubleTapDelay && tapLength > 0) {
    // Double tap detected
    event.preventDefault();
    handleDuplicate(element);
    lastTapTime.value = 0;
  } else {
    lastTapTime.value = currentTime;

    touchStartPosition.value = {
      x: touch.clientX,
      y: touch.clientY,
    };
    touchedElement.value = element;
    initialElementPosition.value = {
      x: element.position.x,
      y: element.position.y,
    };
  }
};

const handleTouchMove = (event: TouchEvent) => {
  if (!touchedElement.value || !canvas.value) return;

  const touch = event.touches[0];
  if (!touch) return;

  const canvasRect = canvas.value.getBoundingClientRect();

  // For elements from sidebar, we need to handle the initial position
  if (
    initialElementPosition.value.x === 0 &&
    initialElementPosition.value.y === 0
  ) {
    const boundedX = Math.max(
      0,
      Math.min(touch.clientX - canvasRect.left - 25, canvasRect.width - 48)
    );
    const boundedY = Math.max(
      0,
      Math.min(touch.clientY - canvasRect.top - 25, canvasRect.height - 48)
    );

    updateElementPosition(touchedElement.value.id, {
      x: boundedX,
      y: boundedY,
    });
    return;
  }

  const deltaX = touch.clientX - touchStartPosition.value.x;
  const deltaY = touch.clientY - touchStartPosition.value.y;

  const newX = initialElementPosition.value.x + deltaX;
  const newY = initialElementPosition.value.y + deltaY;

  // Keep element within canvas bounds
  const boundedX = Math.max(0, Math.min(newX, canvasRect.width - 48));
  const boundedY = Math.max(0, Math.min(newY, canvasRect.height - 48));

  updateElementPosition(touchedElement.value.id, {
    x: boundedX,
    y: boundedY,
  });

  // Check for overlapping elements
  const testElement = {
    ...touchedElement.value,
    position: { x: boundedX, y: boundedY },
  };

  const targetElement = canvasElements.value.find(
    (e) =>
      e.id !== touchedElement.value.id && checkElementOverlap(testElement, e)
  );

  elementBeingDraggedOver.value = targetElement;
  if (targetElement) {
    elementBeingDraggedOver.value.style.opacity = "0.8";
  }
};

const handleTouchEnd = async (event: TouchEvent) => {
  if (!touchedElement.value || !canvas.value) return;

  const touch = event.changedTouches[0];
  if (!touch) return;

  const canvasRect = canvas.value.getBoundingClientRect();

  const isOutsideCanvas =
    touch.clientX < canvasRect.left ||
    touch.clientX > canvasRect.right ||
    touch.clientY < canvasRect.top ||
    touch.clientY > canvasRect.bottom;

  if (isOutsideCanvas) {
    removeCanvasElement(touchedElement.value.id);
  } else if (elementBeingDraggedOver.value) {
    const position = {
      x: touchedElement.value.position.x,
      y: touchedElement.value.position.y,
    };
    await combineElements(
      touchedElement.value,
      elementBeingDraggedOver.value,
      position
    );
  } else {
    // Add new element from sidebar if it doesn't exist on canvas
    if (
      !gameStore.canvasElements.find((e) => e.id === touchedElement.value.id)
    ) {
      const boundedX = Math.max(
        0,
        Math.min(touch.clientX - canvasRect.left - 25, canvasRect.width - 48)
      );
      const boundedY = Math.max(
        0,
        Math.min(touch.clientY - canvasRect.top - 25, canvasRect.height - 48)
      );

      addCanvasElement({
        ...touchedElement.value,
        position: { x: boundedX, y: boundedY },
      });
    }
  }

  touchedElement.value = null;
  elementBeingDraggedOver.value = null;
  touchStartPosition.value = { x: 0, y: 0 };
  initialElementPosition.value = { x: 0, y: 0 };
};

const handleSidebarTouchStart = (event: TouchEvent, element: any) => {
  const touch = event.touches[0];
  if (!touch) return;

  // Create a new instance of the element for the canvas
  const newElement = {
    ...element,
    id: element.id + "_" + Date.now(),
  };

  touchedElement.value = newElement;
  touchStartPosition.value = {
    x: touch.clientX,
    y: touch.clientY,
  };
  initialElementPosition.value = {
    x: 0,
    y: 0,
  };
};
</script>

<style scoped>
.h-screen {
  height: 100vh;
}
</style>
