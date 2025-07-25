import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

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

export const useGameStore = defineStore("game", () => {
  const isPlaying = ref(false);
  const availableElementsSet = ref(new Set<Element>());
  const gameStarted = useCookie("gameStarted", {
    default: () => false,
    maxAge: 60 * 60 * 24 * 30,
  });
  const availableElementsStorage = useStorage(
    "availableElements",
    [] as Element[]
  );
  const canvasElementsStorage = useStorage("canvasElements", [] as Element[]);
  const canvasElements = ref<Element[]>(canvasElementsStorage.value);

  // Computed property to expose the Set as an array
  const availableElements = computed(() =>
    Array.from(availableElementsSet.value).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  );

  const startGame = async () => {
    isPlaying.value = true;
    // Load elements from storage
    const storedElements = availableElementsStorage.value || [];
    availableElementsSet.value = new Set(storedElements);
    canvasElements.value = canvasElementsStorage.value || [];

    if (!gameStarted.value) {
      const promises = Array.from({ length: 2 }, () =>
        $fetch<Omit<Element, "position">>("api/elements/random")
      );

      const responses = await Promise.all(promises);
      const newElements = responses.map((response) => ({
        ...response,
        position: { x: 0, y: 0 },
      })) as Element[];

      // Add new elements to the Set
      newElements.forEach((element) => availableElementsSet.value.add(element));
      gameStarted.value = true;
    }
  };

  const addAvailableElement = (element: Element) => {
    availableElementsSet.value.add(element);
    // Update storage with the array version
    availableElementsStorage.value = Array.from(availableElementsSet.value);
  };

  const addCanvasElement = (element: Element) => {
    canvasElements.value = [
      ...canvasElements.value,
      {
        ...element,
        position: element.position || { x: 0, y: 0 },
      },
    ];
    canvasElementsStorage.value = canvasElements.value;
  };

  const updateElementPosition = (
    elementId: string,
    position: { x: number; y: number }
  ) => {
    const elementIndex = canvasElements.value.findIndex(
      (e: Element) => e.id === elementId
    );
    if (elementIndex !== -1) {
      canvasElements.value = canvasElements.value.map((e, index) =>
        index === elementIndex ? { ...e, position } : e
      );
      canvasElementsStorage.value = canvasElements.value;
    }
  };

  const removeCanvasElement = (elementId: string) => {
    canvasElements.value = canvasElements.value.filter(
      (e) => e.id !== elementId
    );
    canvasElementsStorage.value = canvasElements.value;
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
