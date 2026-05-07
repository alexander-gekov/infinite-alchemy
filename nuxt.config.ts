import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  vite: {
    plugins: [tailwindcss()],
  },

  css: ["~/assets/css/main.css"],
  modules: ["shadcn-nuxt", "@pinia/nuxt"],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./app/components/ui"
     */
    componentDir: "~/components/ui",
  },
  app: {
    head: {
      meta: [
        {
          name: "viewport",
          content:
            "initial-scale=1, viewport-fit=cover, user-scalable=no, user-scalable=0",
        },
      ],
    },
  },
  runtimeConfig: {
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterTextModel:
      process.env.OPENROUTER_TEXT_MODEL ?? "google/gemini-2.5-flash",
    openrouterImageModel:
      process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image",
    openrouterHttpReferer: process.env.OPENROUTER_HTTP_REFERER,
    openrouterAppTitle: process.env.OPENROUTER_APP_TITLE ?? "infinite-alchemy",
    appPassword: process.env.APP_PASSWORD || 'freedom',
    public: {
      upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
      upstashReadOnlyToken: process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN,
    },
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  plugins: [],
});
