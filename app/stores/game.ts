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

const STARTER_ELEMENTS: Omit<StoredElement, "position">[] = [
  { id: "earth", name: "Earth", description: "Solid ground beneath our feet" },
  { id: "fire", name: "Fire", description: "A blazing flame of heat and light" },
  { id: "water", name: "Water", description: "The essence of life, flowing freely" },
  { id: "air", name: "Air", description: "The invisible breath of the atmosphere" },
];

const STARTER_IDS = new Set(STARTER_ELEMENTS.map((e) => e.id));

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
    Array.from(availableElementsSet.value).sort((a, b) => {
      const aStarter = STARTER_IDS.has(a.id);
      const bStarter = STARTER_IDS.has(b.id);
      if (aStarter && bStarter) {
        return (
          STARTER_ELEMENTS.findIndex((s) => s.id === a.id) -
          STARTER_ELEMENTS.findIndex((s) => s.id === b.id)
        );
      }
      if (aStarter) return -1;
      if (bStarter) return 1;
      return a.name.localeCompare(b.name);
    })
  );

  const startGame = async () => {
    isPlaying.value = true;

    const storedElements = availableElementsStorage.value || [];

    if (gameStarted.value && storedElements.length > 0) {
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
        const starterIds = STARTER_ELEMENTS.map((e) => e.id);
        const images = await $fetch<{ id: string; img: string }[]>(
          `/api/redis/get/all`,
          { method: "POST", body: { ids: starterIds } }
        );

        for (const starter of STARTER_ELEMENTS) {
          const img = images.find((i) => i.id === starter.id)?.img || "";
          const element: Element = {
            ...starter,
            img,
            position: { x: 0, y: 0 },
          };
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

  const removeAvailableElement = (baseId: string) => {
    for (const el of availableElementsSet.value) {
      if (el.id === baseId) {
        availableElementsSet.value.delete(el);
        break;
      }
    }
    availableElementsStorage.value = availableElementsStorage.value.filter(
      (e) => e.id !== baseId
    );
    canvasElements.value = canvasElements.value.filter(
      (e) => e.id.split("_")[0] !== baseId
    );
    canvasElementsStorage.value = canvasElementsStorage.value.filter(
      (e) => e.id.split("_")[0] !== baseId
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
    removeAvailableElement,
    addCanvasElement,
    updateElementPosition,
    removeCanvasElement,
    clearCanvas,
    resetGame,
  };
});
