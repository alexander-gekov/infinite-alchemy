interface Element {
  id: string;
  name: string;
  description: string;
  icon: string;
  position?: {
    x: number;
    y: number;
  };
}

export const useGameStore = defineStore("game", () => {
  const isPlaying = ref(false);
  const availableElements = ref<Element[]>([]);
  const canvasElements = ref<Element[]>([]);

  const startGame = async () => {
    isPlaying.value = true;

    const promises = Array.from({ length: 4 }, () =>
      $fetch<Element>("/api/elements/random")
    );

    const responses = await Promise.all(promises);
    availableElements.value = responses.map((response) => response as Element);
  };

  const addCanvasElement = (element: Element) => {
    canvasElements.value.push(element);
  };

  const updateElementPosition = (
    elementId: string,
    position: { x: number; y: number }
  ) => {
    const element = canvasElements.value.find((e) => e.id === elementId);
    if (element) {
      element.position = position;
    }
  };

  return {
    isPlaying,
    availableElements,
    canvasElements,
    startGame,
    addCanvasElement,
    updateElementPosition,
  };
});
