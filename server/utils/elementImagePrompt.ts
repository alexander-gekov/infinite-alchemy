/**
 * Image prompt for a discovered or typed element.
 * When a description is present it is included in parentheses, matching
 * the combine path. The generate path only has a name.
 */
export function elementImagePrompt(name: string, description?: string): string {
  const trimmedDescription = description?.trim() ?? "";
  const subject = trimmedDescription
    ? `${name} (${trimmedDescription})`
    : name;

  return `3D icon of the most recognizable symbol of ${subject}, the shape you would see in a ${name} emoji. Soft 3D render, smooth glossy surfaces, rounded inflated shapes, natural colors true to the subject, limited palette, one object only, centered, plain white background, flat even lighting, app icon style.`;
}
