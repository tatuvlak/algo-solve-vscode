export function buildPrompt(template: string, language: string, content: string): string {
  return template
    .replace(/\{language\}/g, language)
    .replace(/\{content\}/g, content);
}

export function buildRefinePrompt(
  template: string,
  language: string,
  instruction: string,
  codeBody: string
): string {
  const combinedContext = [instruction.trim(), codeBody.trim()].filter(Boolean).join('\n\n');

  return template
    .replace(/\{language\}/g, language)
    .replace(/\{instruction\}/g, instruction)
    .replace(/\{codeBody\}/g, codeBody)
    .replace(/\{context\}/g, combinedContext);
}
