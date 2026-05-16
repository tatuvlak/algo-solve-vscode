import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getConfiguration, LAST_SAVED_PATH_KEY } from '../config/settings';
import { saveToFile, generateFilename } from '../services/fileService';
import { queryOllama } from '../services/ollamaService';
import { buildRefinePrompt } from '../utils/promptBuilder';
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

async function runRefine(
  config: ReturnType<typeof getConfiguration>,
  lastSavedPath: string,
  userPrompt: string,
  progress?: ProgressHandle
): Promise<void> {
  progress?.report({ message: 'Reading previous solution...' });

  if (!fs.existsSync(lastSavedPath)) {
    await handleWarningMessage(
      config.showNotifications,
      `Previous solution file not found: ${lastSavedPath}`
    );
    return;
  }

  const fileContext = fs.readFileSync(lastSavedPath, 'utf8');

  progress?.report({ message: 'Building prompt...' });
  const prompt = buildRefinePrompt(config.refinePrompt, config.programmingLanguage, fileContext, userPrompt);

  progress?.report({ message: 'Calling Ollama HTTP API...' });
  const refined = await queryOllama(
    config.ollamaEndpoint,
    config.ollamaModel,
    prompt,
    config.requestTimeout
  );

  progress?.report({ message: 'Writing refined solution file...' });
  const baseName = path.basename(lastSavedPath, path.extname(lastSavedPath)) || 'solution';
  const filename = generateFilename(`${baseName}_refined`, config.programmingLanguage);

  const destDir = path.dirname(lastSavedPath);

  const savedPath = saveToFile(destDir, filename, refined);

  if (config.showNotifications) {
    await vscode.window.showInformationMessage(`Algo Solve: refined solution saved to ${savedPath}`);
  }
}

export async function refineAlgorithm(context: vscode.ExtensionContext): Promise<void> {
  const config = getConfiguration();

  log('Starting algorithm refinement command');

  const lastSavedPath = context.workspaceState.get<string>(LAST_SAVED_PATH_KEY);
  if (!lastSavedPath) {
    await handleWarningMessage(
      config.showNotifications,
      'No previous solution found. Run "Solve Algorithm with Ollama" first.'
    );
    return;
  }

  const userPrompt = await vscode.window.showInputBox({
    prompt: 'Enter your refinement instruction for Ollama',
    placeHolder: 'e.g. Add type annotations, optimize for memory, add unit tests...',
    ignoreFocusOut: true,
  });

  if (userPrompt === undefined) {
    return;
  }

  if (!userPrompt.trim()) {
    await handleWarningMessage(config.showNotifications, 'Refinement prompt cannot be empty.');
    return;
  }

  try {
    if (config.showNotifications) {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Algo Solve: Refining with Ollama...',
          cancellable: false,
        },
        async (progress) => runRefine(config, lastSavedPath, userPrompt, progress)
      );
      return;
    }

    await runRefine(config, lastSavedPath, userPrompt);
  } catch (err) {
    logError('Failed to refine algorithm', err);

    if (config.showNotifications) {
      await vscode.window.showErrorMessage(getNotificationErrorMessage(err));
    }
  }
}
