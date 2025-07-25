import Together from "together-ai";
import { ImageDataB64 } from "together-ai/resources";

const config = useRuntimeConfig();

export default defineEventHandler(async (event) => {
  const { prompt } = await readBody(event);

  const together = new Together({
    apiKey: config.togetheraiApiKey,
  });

  const elementSchema = {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "A random common or abstract noun",
      },
      description: {
        type: "string",
        description: "A short one sentence description of the name.",
      },
    },
    required: ["name", "description"],
  };

  try {
    let name = prompt;
    let description = "";
    const extract = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Generate a common or abstract noun and description based on the prompt: ${prompt}`,
        },
      ],
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      response_format: { type: "json_object", schema: elementSchema },
      temperature: 1.2,
    });

    let output;
    if (extract?.choices?.[0]?.message?.content) {
      output = JSON.parse(extract?.choices?.[0]?.message?.content) as {
        name: string;
        description: string;
      };
    }

    if (!output?.name || !output?.description) {
      throw new Error("Failed to generate element details");
    }

    name = output.name;
    description = output.description;

    const image = await together.images.create({
      prompt: `shiny 3D illustration of ${name}, minimalistic design, smooth surfaces, bright colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution`,
      model: "black-forest-labs/FLUX.1-schnell",
      steps: 2,
      response_format: "base64",
      disable_safety_checker: true,
      seed: 123,
    });

    const imageBase64 = (image.data[0] as ImageDataB64).b64_json;

    return {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name: name,
      description: description,
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
