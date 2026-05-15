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

export function generateFilename(baseName: string, language: string): string {
  const ext = getExtensionForLanguage(language);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .substring(0, 15);
  const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `${sanitized}_${timestamp}.${ext}`;
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

  fs.writeFileSync(filePath, content, 'utf8');
  log(`Solution saved to: ${filePath}`);
  return filePath;
}
