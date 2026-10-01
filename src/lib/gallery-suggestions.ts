/**
 * Pure checks for the gallery "who is in this photo?" suggestions — public
 * and unauthenticated, so anything that can't be a description of people or
 * a scene is turned away before it reaches the admin queue.
 */

export function validateCaptionSuggestion(raw: string): { suggestion: string } | { error: string } {
  const suggestion = raw.replace(/\s+/g, " ").trim();
  if (suggestion.length < 3) return { error: "Escreva um pouco mais sobre a foto." };
  if (suggestion.length > 500) return { error: "Texto muito longo (máximo 500 caracteres)." };
  if (/https?:\/\/|www\.|\.(com|net|org|br)\b/i.test(suggestion)) return { error: "Não inclua links na sugestão." };
  // Phone numbers and similar: long runs of digits aren't an identification.
  if (/\d[\d\s().-]{7,}\d/.test(suggestion.replace(/\b(1[89]|20)\d{2}\b/g, ""))) {
    return { error: "Não inclua telefones ou números de contato." };
  }
  if (!/\p{L}{2}/u.test(suggestion)) return { error: "Descreva com palavras quem ou o que aparece na foto." };
  return { suggestion };
}

/** Next/previous slide, wrapping around both ends. */
export function wrapIndex(index: number, length: number): number {
  return length > 0 ? ((index % length) + length) % length : 0;
}
