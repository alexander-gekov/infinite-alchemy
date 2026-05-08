<template>
  <div class="absolute top-0 left-0 right-0 z-20 pointer-events-none">
    <div class="pointer-events-auto mx-auto max-w-prose bg-white/90 backdrop-blur-sm rounded-b-xl shadow-md p-4 md:p-6 max-h-[45vh] overflow-y-auto">
    <!-- Loading state -->
    <div
      v-if="storyStore.isGenerating"
      class="flex flex-col items-center gap-3 py-4">
      <LucideLoader2 class="w-8 h-8 animate-spin text-muted-foreground" />
      <p class="text-sm text-muted-foreground italic">Crafting your story...</p>
    </div>

    <!-- No story yet -->
    <div
      v-else-if="!storyStore.story"
      class="flex flex-col items-center gap-3 py-4 text-center">
      <LucideBookOpen class="w-10 h-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">
        No story loaded. Generate one to begin!
      </p>
      <Button variant="default" size="sm" @click="storyStore.generateStory()">
        Generate Story
      </Button>
    </div>

    <!-- Story content -->
    <div v-else>
      <!-- Title -->
      <h2 class="text-lg md:text-xl font-bold text-center mb-3 text-gray-800">
        {{ storyStore.story.title }}
      </h2>

      <!-- Story text with blanks -->
      <div class="text-sm md:text-base leading-relaxed text-gray-700">
        <template
          v-for="(segment, segIdx) in storyStore.story.segments"
          :key="segIdx">
          <!-- Text segment with typewriter -->
          <span v-if="segment.type === 'text'">{{
            getRevealedText(segIdx)
          }}</span>

          <!-- Blank segment -->
          <template v-else-if="segment.type === 'blank' && isSegmentRevealed(segIdx)">
            <!-- Filled blank -->
            <span
              v-if="getFilledAnswer(segIdx)"
              class="font-bold text-primary inline-block transition-all duration-300">
              {{ getFilledAnswer(segIdx) }}
            </span>

            <!-- Active blank (current one to solve) -->
            <span
              v-else-if="isActiveBlank(segIdx)"
              class="inline-flex flex-col items-center">
              <span
                class="inline-block border-b-2 border-primary border-dashed px-3 py-0.5 min-w-[80px] text-center animate-pulse text-primary font-medium">
                ???
              </span>
              <!-- Hints -->
              <span class="flex flex-col items-start mt-1 gap-0.5">
                <button
                  v-if="!hintsRevealed.has(segIdx)"
                  class="text-[11px] text-muted-foreground/60 italic hover:text-muted-foreground cursor-pointer underline decoration-dotted"
                  @click="revealHint(segIdx, 1)">
                  Show hint
                </button>
                <span
                  v-if="hintsRevealed.has(segIdx)"
                  class="text-[11px] text-muted-foreground italic">
                  Hint 1: {{ segment.hint1 }}
                </span>
                <button
                  v-if="hintsRevealed.has(segIdx) && hintsRevealed.get(segIdx) === 1"
                  class="text-[11px] text-muted-foreground/60 italic hover:text-muted-foreground cursor-pointer underline decoration-dotted"
                  @click="revealHint(segIdx, 2)">
                  Show hint 2
                </button>
                <span
                  v-if="hintsRevealed.has(segIdx) && hintsRevealed.get(segIdx)! >= 2"
                  class="text-[11px] text-muted-foreground italic">
                  Hint 2: {{ segment.hint2 }}
                </span>
              </span>
            </span>

            <!-- Future blank (not yet active) -->
            <span
              v-else
              class="inline-block border-b-2 border-gray-300 px-3 py-0.5 min-w-[60px] text-center text-gray-400">
              _____
            </span>
          </template>
        </template>
      </div>

      <!-- Progress -->
      <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{{ storyStore.filledCount }} / {{ storyStore.totalBlanks }} blanks filled</span>
      </div>

      <!-- Completion -->
      <div
        v-if="storyStore.isComplete"
        class="mt-4 text-center">
        <div class="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-3">
          <LucideCheckCircle class="w-5 h-5" />
          <span class="font-semibold text-sm">Story Complete!</span>
        </div>
        <div class="flex justify-center gap-3">
          <Button variant="default" size="sm" @click="handleNewStory">
            New Story
          </Button>
          <Button variant="outline" size="sm" @click="handleBackToFreeplay">
            Back to Freeplay
          </Button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LucideLoader2,
  LucideBookOpen,
  LucideCheckCircle,
} from "lucide-vue-next";
import { useStoryStore } from "~/stores/story";
import { useGameStore } from "~/stores/game";

const storyStore = useStoryStore();
const gameStore = useGameStore();

const revealedChars = ref(0);
const typewriterTimer = ref<ReturnType<typeof setInterval> | null>(null);
const hintsRevealed = ref<Map<number, number>>(new Map());

const totalCharsBeforeSegment = computed(() => {
  if (!storyStore.story) return [];
  let count = 0;
  return storyStore.story.segments.map((seg) => {
    const start = count;
    if (seg.type === "text") {
      count += seg.value.length;
    } else {
      count += 3;
    }
    return start;
  });
});

const totalStoryChars = computed(() => {
  if (!storyStore.story) return 0;
  return storyStore.story.segments.reduce((sum, seg) => {
    return sum + (seg.type === "text" ? seg.value.length : 3);
  }, 0);
});

const getRevealedText = (segIdx: number) => {
  const seg = storyStore.story?.segments[segIdx];
  if (!seg || seg.type !== "text") return "";

  const segStart = totalCharsBeforeSegment.value[segIdx] ?? 0;
  const available = revealedChars.value - segStart;

  if (available <= 0) return "";
  return seg.value.slice(0, Math.min(available, seg.value.length));
};

const isSegmentRevealed = (segIdx: number) => {
  const segStart = totalCharsBeforeSegment.value[segIdx] ?? 0;
  return revealedChars.value >= segStart;
};

const currentBlankSegmentIndex = computed(() => {
  return storyStore.currentBlank?.segmentIndex ?? -1;
});

const isActiveBlank = (segIdx: number) => {
  return segIdx === currentBlankSegmentIndex.value;
};

const getFilledAnswer = (segIdx: number) => {
  const blankIdx = storyStore.blanks.findIndex((b) => b.idx === segIdx);
  if (blankIdx === -1) return null;
  return storyStore.filledAnswers.get(blankIdx) || null;
};

const getCharsUpToBlank = (blankSegIdx: number) => {
  const start = totalCharsBeforeSegment.value[blankSegIdx] ?? 0;
  return start + 3;
};

const startTypewriter = () => {
  stopTypewriter();
  revealedChars.value = 0;

  const firstBlankSegIdx = currentBlankSegmentIndex.value;
  const stopAt =
    firstBlankSegIdx >= 0
      ? getCharsUpToBlank(firstBlankSegIdx)
      : totalStoryChars.value;

  typewriterTimer.value = setInterval(() => {
    revealedChars.value += 2;
    if (revealedChars.value >= stopAt) {
      stopTypewriter();
    }
  }, 15);
};

const stopTypewriter = () => {
  if (typewriterTimer.value) {
    clearInterval(typewriterTimer.value);
    typewriterTimer.value = null;
  }
};

const revealUpToCurrent = () => {
  const blankSegIdx = currentBlankSegmentIndex.value;
  if (blankSegIdx >= 0) {
    revealedChars.value = getCharsUpToBlank(blankSegIdx);
  } else {
    revealedChars.value = totalStoryChars.value;
  }
};

const revealHint = (segIdx: number, level: number) => {
  hintsRevealed.value.set(segIdx, level);
  hintsRevealed.value = new Map(hintsRevealed.value);
};

watch(
  () => storyStore.story,
  (newStory) => {
    if (newStory) {
      hintsRevealed.value = new Map();
      startTypewriter();
    }
  },
  { immediate: true }
);

watch(
  () => storyStore.currentBlankIndex,
  () => {
    revealUpToCurrent();
  }
);

watch(
  () => storyStore.isComplete,
  (complete) => {
    if (complete) {
      revealedChars.value = totalStoryChars.value;
    }
  }
);

onUnmounted(() => {
  stopTypewriter();
});

const handleNewStory = () => {
  hintsRevealed.value = new Map();
  storyStore.generateStory();
};

const handleBackToFreeplay = () => {
  storyStore.resetStory();
  gameStore.setGameMode("freeplay");
};
</script>
