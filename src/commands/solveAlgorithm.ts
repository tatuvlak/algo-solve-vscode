import * as path from 'path';
import * as vscode from 'vscode';
import { getConfiguration, LAST_SAVED_PATH_KEY } from '../config/settings';
import { saveToFile, generateFilename, resolveDestinationDirectory } from '../services/fileService';
import { queryOllama } from '../services/ollamaService';
import { buildPrompt } from '../utils/promptBuilder';
import { log, logError } from '../utils/logger';

type ProgressHandle = Pick<vscode.Progress<{ message?: string; increment?: number }>, 'report'>;

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

function getNotificationErrorMessage(err: unknown): string {
  const message = getErrorMessage(err);
  const httpErrorMatch = message.match(/^Ollama request failed \(HTTP (\d+)\)/);

  if (httpErrorMatch) {
    return `Algo Solve: Ollama request failed (HTTP ${httpErrorMatch[1]})`;
  }

  return `Algo Solve: ${message}`;
}

async function handleWarningMessage(showNotifications: boolean, message: string): Promise<void> {
  log(message);

  if (showNotifications) {
    await vscode.window.showWarningMessage(`Algo Solve: ${message}`);
  }
}

async function runSolve(
  config: ReturnType<typeof getConfiguration>,
  context: vscode.ExtensionContext,
  progress?: ProgressHandle
): Promise<void> {
  progress?.report({ message: 'Reading active editor content...' });

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    await handleWarningMessage(config.showNotifications, 'No active editor found. Open a file first.');
    return;
  }

  const content = editor.document.getText().trim();
  if (!content) {
    await handleWarningMessage(config.showNotifications, 'The active file is empty. Add problem content first.');
    return;
  }

  progress?.report({ message: 'Building prompt...' });
  const prompt = buildPrompt(config.prompt, config.programmingLanguage, content);

  progress?.report({ message: 'Calling Ollama HTTP API...' });
  const solution = await queryOllama(
    config.ollamaEndpoint,
    config.ollamaModel,
    prompt,
    config.requestTimeout
  );

  progress?.report({ message: 'Writing solution file...' });
  const activeFilePath = editor.document.fileName;
  const baseName = path.basename(activeFilePath, path.extname(activeFilePath)) || 'solution';
  const filename = generateFilename(baseName, config.programmingLanguage);

  const activeWorkspaceDir = vscode.workspace.getWorkspaceFolder?.(editor.document.uri)?.uri.fsPath;
  const fallbackDir = activeWorkspaceDir ?? path.dirname(activeFilePath);
  const destDir = resolveDestinationDirectory(config.destinationDirectory, fallbackDir);

  const savedPath = saveToFile(destDir, filename, solution);
  await context.workspaceState.update(LAST_SAVED_PATH_KEY, savedPath);

  if (config.showNotifications) {
    await vscode.window.showInformationMessage(`Algo Solve: solution saved to ${savedPath}`);
  }
}

export async function solveAlgorithm(context: vscode.ExtensionContext): Promise<void> {
  const config = getConfiguration();

  log('Starting algorithm solve command');
  log(`Language: ${config.programmingLanguage}, Model: ${config.ollamaModel}`);

  try {
    if (config.showNotifications) {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Algo Solve: Solving with Ollama...',
          cancellable: false,
        },
        async (progress) => runSolve(config, context, progress)
      );
      return;
    }

    await runSolve(config, context);
  } catch (err) {
    logError('Failed to solve algorithm', err);

    if (config.showNotifications) {
      await vscode.window.showErrorMessage(getNotificationErrorMessage(err));
    }
  }
}
