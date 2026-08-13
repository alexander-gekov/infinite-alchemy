<template>
  <div class="flex h-dvh relative">
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
      <!-- Canvas (always rendered for drag-and-drop) -->
      <div
        ref="canvas"
        class="absolute inset-0 bg-repeat z-10"
        :class="{ 'top-[max(0.5rem,env(safe-area-inset-top))]': !isDesktop }">
        <!-- Canvas Elements -->
        <div
          v-for="element in canvasElements"
          :key="element.id"
          :data-id="element.id"
          class="absolute top-0 left-0 cursor-move touch-none select-none"
          :class="draggingId === element.id ? 'z-20' : 'z-10'"
          :style="{ transform: transformFor(element) }"
          @pointerdown="handlePointerDown($event, element)">
          <img
            :src="element.img || logo"
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
      </div>

      <!-- Story mode panel (floats above canvas) -->
      <StoryCanvas v-if="isStoryMode" />

      <!-- Collection mode pokédex (floating button + overlay) -->
      <CollectionDex v-if="isCollectionMode" />

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
                @click="clearCanvas" />
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
                @click="resetGame" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset game</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              class="absolute bottom-38 right-6 z-50 flex items-center justify-center"
              as-child>
              <component
                :is="soundMuted ? LucideVolumeX : LucideVolume2"
                class="w-fit cursor-pointer text-muted-foreground hover:text-primary"
                @click="toggleMuted" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ soundMuted ? "Unmute sounds" : "Mute sounds" }}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <!-- Mode toggle -->
        <TooltipProvider v-if="!isCollectionMode">
          <Tooltip>
            <TooltipTrigger
              class="absolute bottom-28 right-6 z-50 flex items-center justify-center"
              as-child>
              <component
                :is="isStoryMode ? LucideGamepad2 : LucideBookOpen"
                class="w-fit cursor-pointer text-muted-foreground hover:text-primary"
                @click="toggleGameMode" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ isStoryMode ? 'Switch to Freeplay' : 'Switch to Story Mode' }}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </template>

      <!-- Rate limit indicator -->
      <div
        v-if="rateLimitRemaining !== null"
        class="absolute bottom-20 left-4 z-20 select-none pointer-events-none md:bottom-20">
        <span class="text-[11px] italic text-muted-foreground/60 tracking-wide">
          {{ rateLimitRemaining }} generations remaining
        </span>
      </div>

      <!-- Floating Generate UI -->
      <div
        class="fixed bottom-0 left-0 right-0 p-0 pb-[env(safe-area-inset-bottom)] border-border z-30 md:absolute md:left-1/2 md:right-auto md:-translate-x-1/2 md:border-none md:mb-8 md:pb-0">
        <div class="w-full md:w-96">
          <Card class="shadow-lg pt-2 md:pt-4">
            <CardContent class="p-3">
              <div class="flex flex-col md:flex-row gap-2">
                <div
                  v-if="!isDesktop"
                  class="flex items-center justify-between gap-2">
                  <div class="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="flex items-center gap-2"
                      @click="clearCanvas">
                      <LucideRecycle class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="flex items-center gap-2"
                      @click="resetGame">
                      <LucidePower class="h-4 w-4" />
                    </Button>
                    <!-- Mobile mode toggle -->
                    <Button
                      v-if="!isCollectionMode"
                      variant="outline"
                      size="sm"
                      class="flex items-center gap-2"
                      @click="toggleGameMode">
                      <component
                        :is="isStoryMode ? LucideGamepad2 : LucideBookOpen"
                        class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="flex items-center gap-2"
                      :aria-label="soundMuted ? 'Unmute sounds' : 'Mute sounds'"
                      @click="toggleMuted">
                      <component
                        :is="soundMuted ? LucideVolumeX : LucideVolume2"
                        class="h-4 w-4" />
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

                <div class="flex gap-2 w-full">
                  <Input
                    ref="generateInput"
                    class="text-sm min-w-0"
                    v-model="newElementPrompt"
                    type="text"
                    :placeholder="isStoryMode ? 'Type your guess...' : isCollectionMode ? 'Try making a leaf, moss, oak...' : 'A dinosaur with wings...'"
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div
      class="w-6 md:w-8 bg-background flex flex-col items-center py-2 mb-48 overflow-y-auto md:mb-0">
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
          class="text-xs text-start md:px-2 md:text-md font-semibold md:font-bold">
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
              <ContextMenu
                v-for="element in getElementsByLetter(letter)"
                :key="element.id">
                <ContextMenuTrigger as-child>
                  <div
                    class="flex items-center gap-2 py-2 md:px-2 hover:bg-gray-100 rounded">
                    <img
                      :src="element.img || logo"
                      :alt="element.name"
                      draggable="false"
                      @pointerdown="handleSidebarPointerDown($event, element)"
                      class="w-10 h-10 md:w-12 md:h-12 rounded-full cursor-move touch-none select-none" />
                    <span
                      class="text-xs md:text-sm text-gray-600 touch-none select-none"
                      >{{ element.name }}</span
                    >
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    class="text-destructive"
                    @click="gameStore.removeAvailableElement(element.id)">
                    <LucideTrash2 class="mr-2 h-4 w-4" />
                    Remove
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
  LucideLoader2,
  LucideGithub,
  LucideTwitter,
  LucideTrash2,
  LucideBookOpen,
  LucideGamepad2,
  LucideVolume2,
  LucideVolumeX,
} from "lucide-vue-next";

import { useGameStore, type Element } from "~/stores/game";
import { useStoryStore } from "~/stores/story";
import { useCollectionStore } from "~/stores/collection";
import { AI_API_TIMEOUT_MS } from "~/lib/aiApi";
import { onStartTyping, useMediaQuery } from "@vueuse/core";
import { toast } from "vue-sonner";
import logo from "~/assets/images/logo.png";
import { clampToCanvas, isOutside, overlaps, type Point } from "~/lib/drag";

/** Rendered size of a canvas element, in px (w-22). */
const ELEMENT_SIZE = 88;
/** Max delay between two taps/clicks to count as a double tap, in ms. */
const DOUBLE_TAP_MS = 300;

const sfx = useSfx();
const { muted: soundMuted, toggleMuted } = sfx;

const gameStore = useGameStore();
const storyStore = useStoryStore();
const collectionStore = useCollectionStore();
const { availableElements, canvasElements, gameMode } = storeToRefs(gameStore);

const isStoryMode = computed(() => gameMode.value === "story");
const isCollectionMode = computed(() => gameMode.value === "collection");

const checkCollectionDiscovery = (name: string) => {
  if (!isCollectionMode.value) return;
  const found = collectionStore.tryDiscover(name);
  if (found) {
    sfx.discover();
    toast.success(
      `New discovery: ${found.name}! (${collectionStore.discoveredCount}/${collectionStore.totalCount})`
    );
  }
};
const {
  addAvailableElement,
  addCanvasElement,
  removeCanvasElement,
  updateElementPosition,
} = gameStore;
const rateLimitRemaining = ref<number | null>(null);

const fetchRateLimitStatus = async () => {
  try {
    const { remaining } = await $fetch<{ remaining: number; reset: number }>(
      "/api/ratelimit/status"
    );
    rateLimitRemaining.value = remaining;
  } catch {
    // non-critical; swallow silently
  }
};

onMounted(() => {
  fetchRateLimitStatus();
});

const canvas = ref<HTMLElement | null>(null);
const elementsContainer = ref<HTMLElement | null>(null);
// Deliberately not reactive: the drag is painted imperatively for smoothness,
// only `draggingId` needs to reach the template.
let drag: {
  element: Element;
  /** Canvas-relative position of the element while it is being dragged. */
  position: Point;
  /** Distance between the pointer and the element's top-left corner. */
  offset: Point;
  moved: boolean;
} | null = null;
let dragNode: HTMLElement | null = null;
const draggingId = ref<string | null>(null);
const elementBeingDraggedOver = ref<Element | null>(null);
const newElementPrompt = ref("");
const isCombining = ref(false);
const isGenerating = ref(false);
const isDesktop = useMediaQuery(
  "(min-width: 1024px)",
  { ssrWidth: 768 }
);

const toggleGameMode = () => {
  if (isStoryMode.value) {
    gameStore.setGameMode("freeplay");
  } else {
    gameStore.setGameMode("story");
    if (!storyStore.story) {
      storyStore.generateStory();
    }
  }
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const generateInput = ref<HTMLInputElement | null>(null);

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

const clearCanvas = () => {
  sfx.discard();
  gameStore.clearCanvas();
};

const resetGame = () => {
  sfx.discard();
  gameStore.resetGame();
};

const scrollToBottom = () => {
  if (elementsContainer.value) {
    elementsContainer.value.scrollTop = elementsContainer.value.scrollHeight;
  }
};

const transformFor = (element: Element) => {
  const { x, y } = element.position ?? { x: 0, y: 0 };
  return `translate3d(${x}px, ${y}px, 0)`;
};

// The gesture bypasses Vue and writes the transform straight to the node, so a
// pointermove never re-renders the (large) canvas + sidebar tree.
const paint = (position: Point, dragging: boolean) => {
  if (!dragNode) return;
  dragNode.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)${
    dragging ? " scale(1.05)" : ""
  }`;
  dragNode.style.willChange = dragging ? "transform" : "";
};

const startDrag = (
  element: Element,
  node: HTMLElement | null,
  position: Point,
  offset: Point
) => {
  drag = { element, position, offset, moved: false };
  dragNode = node;
  draggingId.value = element.id;
  elementBeingDraggedOver.value = null;
  paint(position, true);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
  sfx.pickup();
};

const handlePointerDown = (event: PointerEvent, element: Element) => {
  if (event.button !== 0 || !canvas.value) return;

  // A second tap/click on the same element duplicates it instead of dragging.
  if (isSecondTap(element.id)) {
    handleDuplicate(element);
    return;
  }

  const canvasRect = canvas.value.getBoundingClientRect();
  const position = element.position ?? { x: 0, y: 0 };
  startDrag(element, event.currentTarget as HTMLElement, position, {
    x: event.clientX - canvasRect.left - position.x,
    y: event.clientY - canvasRect.top - position.y,
  });
};

const handleSidebarPointerDown = (event: PointerEvent, element: Element) => {
  if (event.button !== 0 || !canvas.value) return;

  const canvasRect = canvas.value.getBoundingClientRect();
  // New elements are grabbed by their centre so they sit under the pointer.
  const offset = { x: ELEMENT_SIZE / 2, y: ELEMENT_SIZE / 2 };
  const position = clampToCanvas(
    {
      x: event.clientX - canvasRect.left - offset.x,
      y: event.clientY - canvasRect.top - offset.y,
    },
    canvasRect
  );

  const instance = { ...element, id: `${element.id}_${Date.now()}`, position };
  addCanvasElement(instance);
  startDrag(instance, null, position, offset);

  // The canvas node for a brand new element only exists after the next render.
  nextTick(() => {
    if (drag?.element.id !== instance.id) return;
    dragNode = canvas.value?.querySelector(`[data-id="${instance.id}"]`) ?? null;
    paint(drag.position, true);
  });
};

const handlePointerMove = (event: PointerEvent) => {
  if (!drag || !canvas.value) return;

  const canvasRect = canvas.value.getBoundingClientRect();
  drag.position = clampToCanvas(
    {
      x: event.clientX - canvasRect.left - drag.offset.x,
      y: event.clientY - canvasRect.top - drag.offset.y,
    },
    canvasRect
  );
  drag.moved = true;
  paint(drag.position, true);

  const current = drag;
  elementBeingDraggedOver.value =
    canvasElements.value.find(
      (e) =>
        e.id !== current.element.id &&
        overlaps(current.position, e.position ?? { x: 0, y: 0 })
    ) ?? null;
};

const stopListening = () => {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointercancel", handlePointerUp);
};

const handlePointerUp = async (event: PointerEvent) => {
  const current = drag;
  const target = elementBeingDraggedOver.value;
  stopListening();
  paint(current?.position ?? { x: 0, y: 0 }, false);
  drag = null;
  dragNode = null;
  draggingId.value = null;
  elementBeingDraggedOver.value = null;

  if (!current || !canvas.value) return;

  const dropPoint = { x: event.clientX, y: event.clientY };
  if (isOutside(dropPoint, canvas.value.getBoundingClientRect())) {
    removeCanvasElement(current.element.id);
    sfx.discard();
    return;
  }

  updateElementPosition(current.element.id, current.position);

  if (target) {
    await combineElements(current.element, target, current.position);
  } else if (current.moved) {
    sfx.drop();
  }
};

onBeforeUnmount(stopListening);

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
        element1: element1.name,
        element2: element2.name,
      },
      timeout: AI_API_TIMEOUT_MS,
      retry: 1,
    });

    addAvailableElement(element);

    addCanvasElement({
      ...element,
      position: {
        x: position.x,
        y: position.y,
      },
    });

    removeCanvasElement(element1.id);
    removeCanvasElement(element2.id);
    sfx.combine();

    if (isStoryMode.value && storyStore.checkAnswer(element.name)) {
      toast.success(`Correct! "${element.name}" fills the blank.`);
    }

    checkCollectionDiscovery(element.name);
  } catch (error) {
    sfx.error();
    if ((error as any).statusCode === 429) {
      toast(
        "You've reached the limit. Please wait a few minutes before generating more elements."
      );
    } else {
      toast((error as Error).message);
    }
  } finally {
    isCombining.value = false;
    fetchRateLimitStatus();
  }
};

const lastTap = ref({ id: "", time: 0 });

const isSecondTap = (id: string) => {
  const now = Date.now();
  const isRepeat = lastTap.value.id === id && now - lastTap.value.time < DOUBLE_TAP_MS;
  lastTap.value = { id, time: isRepeat ? 0 : now };
  return isRepeat;
};

const handleDuplicate = (element: Element) => {
  const offset = 20; // Offset for the duplicated element
  const position = element.position ?? { x: 0, y: 0 };
  addCanvasElement({
    ...element,
    id: element.id + "_" + Date.now(),
    position: {
      x: position.x + offset,
      y: position.y + offset,
    },
  });
  sfx.pickup();
};

const generateElement = async () => {
  if (!newElementPrompt.value.trim()) return;

  isGenerating.value = true;

  try {
    const element = await $fetch<Element>("/api/elements/generate", {
      method: "POST",
      body: { prompt: newElementPrompt.value },
      timeout: AI_API_TIMEOUT_MS,
      retry: 1,
    });

    addAvailableElement(element);
    addCanvasElement({
      ...element,
      position: isDesktop.value ? { x: 100, y: 100 } : { x: 50, y: 50 },
    });
    sfx.combine();

    if (isStoryMode.value && storyStore.checkAnswer(element.name)) {
      toast.success(`Correct! "${element.name}" fills the blank.`);
    }

    checkCollectionDiscovery(element.name);

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
    fetchRateLimitStatus();
  }
};

</script>
