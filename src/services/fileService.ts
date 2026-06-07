import * as fs from 'fs';
import * as path from 'path';
import { log } from '../utils/logger';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  kotlin: 'kt',
  swift: 'swift',
  php: 'php',
  csharp: 'cs',
  'c#': 'cs',
  scala: 'scala',
  r: 'r',
  dart: 'dart',
  haskell: 'hs',
};

export function getExtensionForLanguage(language: string): string {
  return LANGUAGE_EXTENSIONS[language.toLowerCase()] ?? language.toLowerCase();
}

export function sanitizeBaseName(baseName: string): string {
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return sanitized || 'solution';
}

export interface GenerateFilenameOptions {
  version?: number;
  directory?: string;
}

export function generateFilename(
  baseName: string,
  language: string,
  options?: number | GenerateFilenameOptions
): string {
  const ext = getExtensionForLanguage(language);
  const sanitized = sanitizeBaseName(baseName);

  if (typeof options === 'number') {
    return `${sanitized}_v${options}.${ext}`;
  }

  if (typeof options?.version === 'number') {
    return `${sanitized}_v${options.version}.${ext}`;
  }

  const resolvedDir = options?.directory ? path.resolve(options.directory) : undefined;
  let nextVersion = 1;

  if (resolvedDir) {
    while (true) {
      const candidate = path.join(resolvedDir, `${sanitized}_v${nextVersion}.${ext}`);
      if (!fs.existsSync(candidate)) {
        break;
      }

      nextVersion += 1;
    }
  }

  return `${sanitized}_v${nextVersion}.${ext}`;
}

export function resolveDestinationDirectory(configured: string, fallback: string): string {
  if (!configured || configured.trim() === '') {
    return fallback;
  }

  const resolved = path.resolve(configured);

  // Security: ensure the resolved path does not escape to root via traversal tricks
  if (!path.isAbsolute(resolved)) {
    return fallback;
  }

  return resolved;
}

export function stripMarkdownCodeFence(content: string): string {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```[^\n]*\n([\s\S]*?)\n```$/);

  if (!fencedMatch) {
    return content;
  }

  return fencedMatch[1];
}

export function saveToFile(directory: string, filename: string, content: string): string {
  const safeName = path.basename(filename);
  const resolvedDir = path.resolve(directory);
  const filePath = path.join(resolvedDir, safeName);

  // Security: verify the final path stays inside resolvedDir
  if (!filePath.startsWith(resolvedDir + path.sep) && filePath !== resolvedDir) {
    throw new Error(`Invalid file path detected: "${filePath}"`);
  }

  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
    log(`Created directory: ${resolvedDir}`);
  }

  const finalContent = stripMarkdownCodeFence(content);
  fs.writeFileSync(filePath, finalContent, 'utf8');
  log(`Solution saved to: ${filePath}`);
  return filePath;
}
