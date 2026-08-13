# Infinite Alchemy

<p align="center">
  <img src="app/assets/images/logo.png" alt="Infinite Alchemy Logo" width="200"/>
</p>

<p align="center">
  <a href="https://infinitealche.my">
    <img src="app/assets/images/cover.png" alt="Infinite Alchemy Cover" width="100%" style="border-radius: 10px"/>
  </a>
</p>

<div align="center">
  <a href="https://infinitealche.my">
    <img src="https://img.shields.io/badge/Play%20Now-8A2BE2?style=for-the-badge" alt="Play Now"/>
  </a>
</div>

## About

Infinite Alchemy is an engaging puzzle game where you combine elements to discover new ones. Use your creativity and logic to unlock hundreds of unique combinations!

## Features

- 🧪 Combine elements to create new ones
- ✨ Beautiful and intuitive interface
- 🎮 Easy to play
- 💾 Progress automatically saved
- 🌟 Prompt new combinations

## Development

This project is built with: 

- [Nuxt 3](https://nuxt.com) - The Vue Framework
- [OpenRouter](https://openrouter.ai) - Gemini 2.5 Flash (`google/gemini-2.5-flash`) for text and FLUX.2 Klein 4B (`black-forest-labs/flux.2-klein-4b`) for image generation by default

Text runs through chat completions (`POST /api/v1/chat/completions`); images run through OpenRouter's dedicated Image API (`POST /api/v1/images`). Image-only models such as FLUX are **not** routable through chat completions — sending them there fails with an opaque `Provider returned error`.

Override the models with `OPENROUTER_TEXT_MODEL` and `OPENROUTER_IMAGE_MODEL`. Any model listed by `https://openrouter.ai/api/v1/images/models` works for images; check its `supported_parameters` before switching. Requests ask for a square image by default, which you can change with `OPENROUTER_IMAGE_ASPECT_RATIO` (set it to an empty string for models that reject the parameter, e.g. `openai/gpt-5-image`). FLUX.2 Klein bills per megapixel and has no resolution knob on OpenRouter.

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## License

MIT License © 2024
