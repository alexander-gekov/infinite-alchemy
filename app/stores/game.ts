import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

interface Element {
  id: string;
  name: string;
  description: string;
  icon: string;
  img: string;
  position: {
    x: number;
    y: number;
  };
}

export const useGameStore = defineStore("game", () => {
  const isPlaying = ref(false);
  const availableElements = ref<Element[]>([]);
  const storage = useStorage("canvasElements", [] as Element[]);
  const canvasElements = ref<Element[]>(storage.value);

  const startGame = async () => {
    isPlaying.value = true;
    // Load canvas elements from storage
    canvasElements.value = storage.value || [];

    availableElements.value = [
      {
        id: "1",
        name: "fire",
        description: "fire",
        icon: "https://upload.wikimedia.org/wikipedia/commons/9/99/FireIcon.svg",
        img: "https://upload.wikimedia.org/wikipedia/commons/9/99/FireIcon.svg",
        position: { x: 0, y: 0 },
      },
      {
        id: "2",
        name: "water",
        description: "water",
        icon: "https://upload.wikimedia.org/wikipedia/commons/6/65/Icon-water-blue.svg",
        img: "https://upload.wikimedia.org/wikipedia/commons/6/65/Icon-water-blue.svg",
        position: { x: 0, y: 0 },
      },
    ] as Element[];
  };

  const addCanvasElement = (element: Element) => {
    canvasElements.value = [
      ...canvasElements.value,
      {
        ...element,
        position: element.position || { x: 0, y: 0 },
      },
    ];
    storage.value = canvasElements.value;
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
      storage.value = canvasElements.value;
    }
  };

  const removeCanvasElement = (elementId: string) => {
    canvasElements.value = canvasElements.value.filter(
      (e) => e.id !== elementId
    );
    storage.value = canvasElements.value;
  };

  const clearCanvas = () => {
    canvasElements.value = [];
    storage.value = [];
  };

  return {
    isPlaying,
    availableElements,
    canvasElements,
    startGame,
    addCanvasElement,
    updateElementPosition,
    removeCanvasElement,
    clearCanvas,
  };
});
