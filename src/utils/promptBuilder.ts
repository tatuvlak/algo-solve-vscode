export function buildPrompt(template: string, language: string, content: string): string {
  return template
    .replace(/\{language\}/g, language)
    .replace(/\{content\}/g, content);
}

export function buildRefinePrompt(template: string, language: string, context: string, userPrompt: string): string {
  return template
    .replace(/\{language\}/g, language)
    .replace(/\{context\}/g, context)
    .replace(/\{userPrompt\}/g, userPrompt);
}
