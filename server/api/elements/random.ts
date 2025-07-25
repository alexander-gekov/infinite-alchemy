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
        description: "A random name (noun only)",
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
            "Generate a random name (noun only) and description and return it in JSON format. Be creative and avoid common or obvious choices. The name should be a singular common noun in lowercase without punctuation.",
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
      prompt: `Claymorphic/Soft 3D emoji-style with transparent background image representing ${output.name}.`,
      model: "black-forest-labs/FLUX.1-schnell",
      steps: 4,
      response_format: "url",
      disable_safety_checker: true,
    });

    return {
      id: output.name.toLowerCase().replace(/\s+/g, "-"),
      name: output.name,
      description: output.description,
      icon: (image.data[0] as ImageDataURL).url,
    };
  } catch (error) {
    console.error("Error generating element:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate element",
    });
  }
});
