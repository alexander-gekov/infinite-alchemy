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
- [OpenRouter](https://openrouter.ai) - Gemini 2.5 Flash for text and FLUX.2 Klein 4B (`black-forest-labs/flux.2-klein-4b`) for image generation by default

For **Black Forest FLUX** image models, requests default to **512×512** output (~0.26 MP) via `image_config` width/height so billing stays below OpenRouter’s ~1 MP `aspect_ratio` presets. Override with `OPENROUTER_FLUX_IMAGE_WIDTH` and `OPENROUTER_FLUX_IMAGE_HEIGHT` (minimum 64 each). If you pass `aspect_ratio` instead (e.g. from the AI image API), OpenRouter uses its fixed preset sizes (~1 MP). Gemini’s smaller `image_size` presets (e.g. `0.5K`) apply only to the models documented for that on OpenRouter.

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
