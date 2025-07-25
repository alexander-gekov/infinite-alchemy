import Together from "together-ai";
import { ImageDataURL } from "together-ai/resources";

const config = useRuntimeConfig();

export default defineEventHandler(async () => {
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
    const extract = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Generate a random common noun (Refer to general categories of people, places, or things) or a random abstract noun (Refer to ideas, concepts, or qualities that cannot be touched or seen (e.g., love, freedom, happiness)) and description and return it in JSON format. The name should be a singular common noun in lowercase without punctuation.",
        },
      ],
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      response_format: { type: "json_object", schema: elementSchema },
      temperature: 1.2,
      seed: Math.floor(Math.random() * 1000000),
      frequency_penalty: 1.0,
      presence_penalty: 1.0,
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

    const image = await together.images.create({
      prompt: `Claymorphic / Soft 3D style image of ${output.name} with transparent background`,
      model: "black-forest-labs/FLUX.1-schnell",
      steps: 2,
      response_format: "url",
      disable_safety_checker: true,
      seed: 123,
    });

    return {
      id: output.name.toLowerCase().replace(/\s+/g, "-"),
      name: output.name,
      description: output.description,
      img: (image.data[0] as ImageDataURL).url,
    };
  } catch (error) {
    console.error("Error generating element:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate element",
    });
  }
});
