import * as path from 'path';
import * as vscode from 'vscode';
import { getConfiguration } from '../config/settings';
import { saveToFile, generateFilename, resolveDestinationDirectory } from '../services/fileService';
import { queryOllama } from '../services/ollamaService';
import { buildPrompt } from '../utils/promptBuilder';
import { log, logError } from '../utils/logger';

export async function solveAlgorithm(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Algo Solve: No active editor found. Open a file first.');
    return;
  }

  const content = editor.document.getText().trim();
  if (!content) {
    vscode.window.showWarningMessage('Algo Solve: The active file is empty. Add problem content first.');
    return;
  }

  const config = getConfiguration();
  const prompt = buildPrompt(config.prompt, config.programmingLanguage, content);

  log('Starting algorithm solve command');
  log(`Language: ${config.programmingLanguage}, Model: ${config.ollamaModel}`);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Solving with Ollama (${config.ollamaModel})…`,
      cancellable: false,
    },
    async () => {
      try {
        const solution = await queryOllama(
          config.ollamaEndpoint,
          config.ollamaModel,
          prompt,
          config.requestTimeout
        );

        const activeFilePath = editor.document.fileName;
        const baseName = path.basename(activeFilePath, path.extname(activeFilePath)) || 'solution';
        const filename = generateFilename(baseName, config.programmingLanguage);

        const fallbackDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
        const destDir = resolveDestinationDirectory(config.destinationDirectory, fallbackDir);

        const savedPath = saveToFile(destDir, filename, solution);

        vscode.window.showInformationMessage(`Algo Solve: Solution saved to ${savedPath}`);
      } catch (err) {
        logError('Failed to solve algorithm', err);
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Algo Solve: ${message}`);
      }
    }
  );
}
