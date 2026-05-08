import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { toast } from "vue-sonner";
import { parseRateLimitFromHeaders } from "~/lib/rateLimitHeaders";
import { INITIAL_ELEMENT_SEED } from "~/lib/initialElements";

export interface Element {
  id: string;
  name: string;
  description: string;
  img: string;
  position: {
    x: number;
    y: number;
  };
}

export interface StoredElement {
  id: string;
  name: string;
  description: string;
  position: {
    x: number;
    y: number;
  };
}

export const useGameStore = defineStore("game", () => {
  const isPlaying = ref(false);
  /** Tokens left for AI element endpoints (from response headers). */
  const apiRateLimitRemaining = ref<number | null>(null);
  const apiRateLimitLimit = ref<number | null>(null);
  const availableElementsSet = ref(new Set<Element>());
  const gameStarted = useCookie("gameStarted", {
    default: () => false,
    maxAge: 60 * 60 * 24 * 30,
  });
  const availableElementsStorage = useStorage(
    "availableElements",
    [] as StoredElement[]
  );
  const canvasElementsStorage = useStorage(
    "canvasElements",
    [] as StoredElement[]
  );
  const canvasElements = ref<Element[]>(
    canvasElementsStorage.value.map((el) => ({ ...el, img: "" }))
  );

  const availableElements = computed(() =>
    Array.from(availableElementsSet.value).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  );

  const ingestRateLimitHeaders = (headers: Headers) => {
    const parsed = parseRateLimitFromHeaders(headers);
    if (parsed) {
      apiRateLimitRemaining.value = parsed.remaining;
      apiRateLimitLimit.value = parsed.limit;
    }
  };

  const startGame = async () => {
    isPlaying.value = true;

    const storedElements = availableElementsStorage.value || [];

    if (gameStarted.value) {
      try {
        const images = await $fetch<{ id: string; img: string }[]>(
          `/api/redis/get/all`,
          {
            method: "POST",
            body: { ids: storedElements.map((el) => el.id) },
          }
        );

        for (const element of storedElements) {
          availableElementsSet.value.add({
            ...element,
            img: images.find((img) => img.id === element.id)?.img || "",
          });
        }
        const storedCanvasElements = canvasElementsStorage.value || [];
        const canvasElementsWithImages = storedCanvasElements.map((el) => {
          const elId = el.id.split("_")[0];
          const img = images.find((img) => img.id === elId)?.img || "";
          return {
            ...el,
            img,
          };
        });
        canvasElements.value = canvasElementsWithImages;
      } catch (error) {
        toast((error as Error).message);
      }
    } else {
      try {
        const seed = INITIAL_ELEMENT_SEED.map((el) => ({ ...el }));
        const ids = seed.map((el) => el.id);

        const images = await $fetch<{ id: string; img: string }[]>(
          `/api/redis/get/all`,
          {
            method: "POST",
            body: { ids },
          }
        );

        for (const element of seed) {
          const img =
            images.find((row) => row.id === element.id)?.img || "";
          const full: Element = { ...element, img };
          availableElementsSet.value.add(full);
          availableElementsStorage.value.push({
            id: element.id,
            name: element.name,
            description: element.description,
            position: element.position,
          });
        }
        gameStarted.value = true;
      } catch (error) {
        toast((error as Error).message);
      }
    }
  };

  const removeAvailableElement = (elementId: string) => {
    availableElementsSet.value = new Set(
      [...availableElementsSet.value].filter((e) => e.id !== elementId)
    );
    availableElementsStorage.value = availableElementsStorage.value.filter(
      (e) => e.id !== elementId
    );
    canvasElements.value = canvasElements.value.filter(
      (e) => e.id !== elementId && !e.id.startsWith(`${elementId}_`)
    );
    canvasElementsStorage.value = canvasElementsStorage.value.filter(
      (e) => e.id !== elementId && !e.id.startsWith(`${elementId}_`)
    );
  };

  const addAvailableElement = async (element: Element) => {
    availableElementsSet.value.add(element);

    const storedElement: StoredElement = {
      id: element.id,
      name: element.name,
      description: element.description,
      position: element.position,
    };
    availableElementsStorage.value = [
      ...availableElementsStorage.value,
      storedElement,
    ];
  };

  const addCanvasElement = async (element: Element) => {
    const storedElement: StoredElement = {
      id: element.id,
      name: element.name,
      description: element.description,
      position: element.position || { x: 0, y: 0 },
    };

    canvasElements.value = [...canvasElements.value, element];
    canvasElementsStorage.value = [
      ...canvasElementsStorage.value,
      storedElement,
    ];
  };

  const updateElementPosition = (
    elementId: string,
    position: { x: number; y: number }
  ) => {
    const elementIndex = canvasElements.value.findIndex(
      (e) => e.id === elementId
    );
    if (elementIndex !== -1) {
      canvasElements.value = canvasElements.value.map((e, index) =>
        index === elementIndex ? { ...e, position } : e
      );
      canvasElementsStorage.value = canvasElementsStorage.value.map(
        (e, index) => (index === elementIndex ? { ...e, position } : e)
      );
    }
  };

  const removeCanvasElement = (elementId: string) => {
    canvasElements.value = canvasElements.value.filter(
      (e) => e.id !== elementId
    );
    canvasElementsStorage.value = canvasElementsStorage.value.filter(
      (e) => e.id !== elementId
    );
  };

  const clearCanvas = () => {
    canvasElements.value = [];
    canvasElementsStorage.value = [];
  };

  const resetGame = () => {
    gameStarted.value = false;
    availableElementsSet.value = new Set();
    canvasElements.value = [];
    availableElementsStorage.value = [];
    canvasElementsStorage.value = [];
  };

  return {
    isPlaying,
    apiRateLimitRemaining,
    apiRateLimitLimit,
    availableElements,
    canvasElements,
    startGame,
    ingestRateLimitHeaders,
    addAvailableElement,
    removeAvailableElement,
    addCanvasElement,
    updateElementPosition,
    removeCanvasElement,
    clearCanvas,
    resetGame,
  };
});
