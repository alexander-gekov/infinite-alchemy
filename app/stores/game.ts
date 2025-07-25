import { defineStore } from "pinia";

interface Element {
  id: string;
  name: string;
  description: string;
  icon: string;
  img: string; // Add img property
  position: {
    x: number;
    y: number;
  };
}

export const useGameStore = defineStore("game", () => {
  const isPlaying = ref(false);
  const availableElements = ref<Element[]>([] as Element[]);
  const canvasElements = ref<Element[]>([] as Element[]);

  const startGame = async () => {
    isPlaying.value = true;

    // const promises = Array.from({ length: 4 }, () =>
    //   $fetch<Omit<Element, "position">>("/api/elements/random")
    // );

    // const responses = await Promise.all(promises);
    // availableElements.value = responses.map((response) => ({
    //   ...response,
    //   img: response.icon, // Use icon as img for now
    //   position: { x: 0, y: 0 },
    // })) as Element[];
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
    canvasElements.value.push({
      ...element,
      position: element.position || { x: 0, y: 0 },
    });
  };

  const updateElementPosition = (
    elementId: string,
    position: { x: number; y: number }
  ) => {
    const element = canvasElements.value.find(
      (e: Element) => e.id === elementId
    );
    if (element) {
      element.position = position;
    }
  };

  const removeCanvasElement = (elementId: string) => {
    canvasElements.value = canvasElements.value.filter(
      (e) => e.id !== elementId
    );
  };

  const clearCanvas = () => {
    canvasElements.value = [];
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
