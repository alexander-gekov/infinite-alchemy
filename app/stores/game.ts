import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { toast } from "vue-sonner";
import { parseRateLimitFromHeaders } from "~/lib/rateLimitHeaders";
import {
  INITIAL_ELEMENT_SEED,
  STARTER_IMG_BY_ID,
} from "~/lib/initialElements";

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
  /** Persisted image URL/data URL so resume does not require Redis for that element. */
  img?: string;
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
    canvasElementsStorage.value.map((el) => ({
      ...el,
      img: el.img ?? "",
    }))
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

  const fetchRedisImages = (ids: string[]) =>
    $fetch<{ id: string; img: string }[]>("/api/redis/get/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: { ids },
    });

  const startGame = async () => {
    isPlaying.value = true;

    const storedElements = availableElementsStorage.value || [];

    if (gameStarted.value) {
      try {
        const storedCanvasElements = canvasElementsStorage.value || [];
        const imageUrlById = new Map<string, string>(STARTER_IMG_BY_ID);

        for (const el of storedElements) {
          if (el.img) {
            imageUrlById.set(el.id, el.img);
          }
        }
        for (const el of storedCanvasElements) {
          if (el.img) {
            imageUrlById.set(el.id, el.img);
            const base = el.id.split("_")[0] ?? el.id;
            imageUrlById.set(base, el.img);
          }
        }

        const allBaseIds = new Set<string>();
        for (const el of storedElements) {
          allBaseIds.add(el.id);
        }
        for (const el of storedCanvasElements) {
          allBaseIds.add(el.id.split("_")[0] ?? el.id);
        }

        const idsMissingImage = [...allBaseIds].filter((id) => {
          const u = imageUrlById.get(id);
          return !u || u === "";
        });

        if (idsMissingImage.length > 0) {
          const rows = await fetchRedisImages(idsMissingImage);
          for (const row of rows) {
            if (row.img) {
              imageUrlById.set(row.id, row.img);
            }
          }
        }

        for (const element of storedElements) {
          const img =
            element.img ||
            imageUrlById.get(element.id) ||
            "";
          availableElementsSet.value.add({
            ...element,
            img,
          });
        }
        const canvasElementsWithImages = storedCanvasElements.map((el) => {
          const base = el.id.split("_")[0] ?? el.id;
          const img =
            el.img ||
            imageUrlById.get(el.id) ||
            imageUrlById.get(base) ||
            "";
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
        const seed: Element[] = INITIAL_ELEMENT_SEED.map((el) => ({
          id: el.id,
          name: el.name,
          description: el.description,
          img: el.img,
          position: { ...el.position },
        }));

        const onCanvas: Element[] = [];

        for (const element of seed) {
          availableElementsSet.value.add(element);
          availableElementsStorage.value.push({
            id: element.id,
            name: element.name,
            description: element.description,
            position: { ...element.position },
            img: element.img,
          });
          onCanvas.push(element);
        }

        canvasElements.value = onCanvas;
        canvasElementsStorage.value = onCanvas.map((el) => ({
          id: el.id,
          name: el.name,
          description: el.description,
          position: { ...el.position },
          img: el.img,
        }));

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
      img: element.img,
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
      img: element.img,
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
