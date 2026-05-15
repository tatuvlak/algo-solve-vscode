export function buildPrompt(template: string, language: string, content: string): string {
  return template
    .replace(/\{language\}/g, language)
    .replace(/\{content\}/g, content);
}
