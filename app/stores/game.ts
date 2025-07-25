import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { toast } from "vue-sonner";

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

  const startGame = async () => {
    isPlaying.value = true;

    const storedElements = availableElementsStorage.value || [];
    for (const element of storedElements) {
      try {
        const img = await $fetch<string>(`/api/redis/get/${element.id}`);
        availableElementsSet.value.add({
          ...element,
          img: typeof img === "string" ? img : "",
        });
      } catch (error) {
        toast((error as Error).message);
      }
    }

    const storedCanvasElements = canvasElementsStorage.value || [];
    const canvasElementsWithImages = await Promise.all(
      storedCanvasElements.map(async (el) => {
        const img = await $fetch<string>(`/api/redis/get/${el.id}`);
        return {
          ...el,
          img: typeof img === "string" ? img : "",
        };
      })
    );
    canvasElements.value = canvasElementsWithImages;

    if (!gameStarted.value) {
      try {
        const promises = Array.from({ length: 2 }, () =>
          $fetch<Omit<Element, "position">>("api/elements/random", {
            timeout: 10000,
          })
        );

        const responses = await Promise.all(promises);
        const newElements = responses.map((response) => ({
          ...response,
          position: { x: 0, y: 0 },
        })) as Element[];

        for (const element of newElements) {
          availableElementsSet.value.add(element);
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

  const addAvailableElement = async (element: Element) => {
    if (availableElementsSet.value.keys().some((el) => el.id === element.id)) {
      return;
    }

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
    availableElements,
    canvasElements,
    startGame,
    addAvailableElement,
    addCanvasElement,
    updateElementPosition,
    removeCanvasElement,
    clearCanvas,
    resetGame,
  };
});
