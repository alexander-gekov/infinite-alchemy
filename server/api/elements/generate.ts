import Together from "together-ai";
import { ImageDataB64 } from "together-ai/resources";

const config = useRuntimeConfig();

export default defineEventHandler(async (event) => {
  const { prompt } = await readBody(event);

  const together = new Together({
    apiKey: config.togetheraiApiKey,
  });

  try {
    const image = await together.images.create({
      prompt: `shiny 3D illustration of ${prompt}, minimalistic design, smooth surfaces, bright colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution`,
      model: "black-forest-labs/FLUX.1-schnell",
      steps: 4,
      response_format: "base64",
      disable_safety_checker: true,
      seed: Math.floor(Math.random() * 1000000),
    });

    const imageBase64 = (image.data[0] as ImageDataB64).b64_json;

    return {
      id: prompt.toLowerCase().replace(/\s+/g, "-"),
      name: prompt || "New Element",
      description: "",
      img: `data:image/png;base64,${imageBase64}`,
    };
  } catch (error) {
    console.error("Error generating element:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate element",
    });
  }
});
