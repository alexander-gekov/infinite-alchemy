import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { toast } from "vue-sonner";
import { useGameStore } from "./game";

export type StorySegment =
  | { type: "text"; value: string }
  | { type: "blank"; answer: string; hint1: string; hint2: string };

export interface Story {
  title: string;
  segments: StorySegment[];
}

export const useStoryStore = defineStore("story", () => {
  const story = ref<Story | null>(null);
  const currentBlankIndex = ref(0);
  const filledAnswers = ref<Map<number, string>>(new Map());
  const isGenerating = ref(false);
  const completedStories = useStorage("completedStories", [] as string[]);

  const blanks = computed(() => {
    if (!story.value) return [];
    return story.value.segments
      .map((seg, idx) => ({ seg, idx }))
      .filter((s) => s.seg.type === "blank");
  });

  const totalBlanks = computed(() => blanks.value.length);

  const filledCount = computed(() => filledAnswers.value.size);

  const isComplete = computed(
    () => totalBlanks.value > 0 && filledCount.value >= totalBlanks.value
  );

  const currentBlank = computed(() => {
    const b = blanks.value[currentBlankIndex.value];
    if (!b || b.seg.type !== "blank") return null;
    return { segmentIndex: b.idx, ...b.seg };
  });

  const generateStory = async () => {
    const gameStore = useGameStore();
    const elementNames = gameStore.availableElements.map((e) => e.name);

    if (elementNames.length < 2) {
      toast("You need at least 2 elements to generate a story.");
      return;
    }

    isGenerating.value = true;
    story.value = null;
    currentBlankIndex.value = 0;
    filledAnswers.value = new Map();

    try {
      const result = await $fetch<Story>("/api/story/generate", {
        method: "POST",
        body: { elements: elementNames },
        timeout: 30000,
      });
      story.value = result;
    } catch (error) {
      if ((error as any).statusCode === 429) {
        toast(
          "You've reached the limit. Please wait before generating more."
        );
      } else {
        toast("Failed to generate story. Please try again.");
      }
    } finally {
      isGenerating.value = false;
    }
  };

  const checkAnswer = (word: string): boolean => {
    const blank = currentBlank.value;
    if (!blank || blank.type !== "blank") return false;

    const normalize = (s: string) =>
      s.toLowerCase().trim().replace(/\s+/g, "-");

    const answer = normalize(blank.answer);
    const attempt = normalize(word);

    if (attempt !== answer && attempt !== answer.replace(/-/g, "")) {
      return false;
    }

    filledAnswers.value.set(currentBlankIndex.value, word);
    filledAnswers.value = new Map(filledAnswers.value);

    if (filledCount.value >= totalBlanks.value) {
      completeStory();
    } else {
      currentBlankIndex.value++;
    }

    return true;
  };

  const completeStory = () => {
    if (story.value && !completedStories.value.includes(story.value.title)) {
      completedStories.value = [
        ...completedStories.value,
        story.value.title,
      ];
    }
  };

  const resetStory = () => {
    story.value = null;
    currentBlankIndex.value = 0;
    filledAnswers.value = new Map();
  };

  return {
    story,
    currentBlankIndex,
    filledAnswers,
    isGenerating,
    completedStories,
    blanks,
    totalBlanks,
    filledCount,
    isComplete,
    currentBlank,
    generateStory,
    checkAnswer,
    resetStory,
  };
});
