interface OutputChannel {
  appendLine(value: string): void;
  dispose(): void;
}

let outputChannel: OutputChannel | undefined;

function getChannel(): OutputChannel {
  if (!outputChannel) {
    try {
      const vscode = require('vscode') as typeof import('vscode');
      outputChannel = vscode.window.createOutputChannel('Ollama Algorithm Solver');
    } catch {
      outputChannel = {
        appendLine: (value: string) => console.log(value),
        dispose: () => undefined,
      };
    }
  }
  return outputChannel;
}

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  getChannel().appendLine(`[${timestamp}] ${message}`);
}

export function logError(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  const errorDetail = error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : '';
  getChannel().appendLine(`[${timestamp}] ERROR: ${message}${errorDetail}`);
}

export function dispose(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
