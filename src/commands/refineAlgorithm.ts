import * as path from 'path';
import * as vscode from 'vscode';
import { getConfiguration } from '../config/settings';
import { saveToFile, generateFilename, resolveDestinationDirectory } from '../services/fileService';
import { queryOllama } from '../services/ollamaService';
import { buildRefinePrompt } from '../utils/promptBuilder';
import { parseRefineInput } from '../utils/refineInputParser';
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
  activeFilePath: string,
  fileContext: string,
  userPrompt: string,
  progress?: ProgressHandle
): Promise<void> {
  progress?.report({ message: 'Reading active editor content...' });

  const { instruction: fileInstruction, codeBody } = parseRefineInput(fileContext);
  const combinedInstruction = [
    `User request:\n${userPrompt.trim()}`,
    fileInstruction.trim() ? `File instruction from top comment:\n${fileInstruction.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  progress?.report({ message: 'Building prompt...' });
  const prompt = buildRefinePrompt(
    config.refinePrompt,
    config.programmingLanguage,
    combinedInstruction,
    codeBody
  );

  progress?.report({ message: 'Calling Ollama HTTP API...' });
  const refined = await queryOllama(
    config.ollamaEndpoint,
    config.ollamaModel,
    prompt,
    config.requestTimeout
  );

  progress?.report({ message: 'Writing refined solution file...' });
  const previousVersionedBase = path.basename(activeFilePath, path.extname(activeFilePath)) || 'solution';
  const derivedBaseName = previousVersionedBase.replace(/_v\d+$/, '') || 'solution';
  const outputBaseName = config.outputFileBaseName.trim() || derivedBaseName;

  const activeWorkspaceDir = vscode.workspace.getWorkspaceFolder?.(vscode.Uri.file(activeFilePath))?.uri.fsPath;
  const fallbackDir = activeWorkspaceDir ?? path.dirname(activeFilePath);
  const destDir = resolveDestinationDirectory(config.destinationDirectory, fallbackDir);
  const filename = generateFilename(outputBaseName, config.programmingLanguage, { directory: destDir });

  const savedPath = saveToFile(destDir, filename, refined);

  if (config.showNotifications) {
    await vscode.window.showInformationMessage(`Algo Solve: refined solution saved to ${savedPath}`);
  }
}

export async function refineAlgorithm(_context: vscode.ExtensionContext): Promise<void> {
  const config = getConfiguration();

  log('Starting algorithm refinement command');

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    await handleWarningMessage(config.showNotifications, 'No active editor found. Open a file first.');
    return;
  }

  const activeFilePath = editor.document.fileName;
  const fileContext = editor.document.getText();

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
        async (progress) => runRefine(config, activeFilePath, fileContext, userPrompt, progress)
      );
      return;
    }

    await runRefine(config, activeFilePath, fileContext, userPrompt);
  } catch (err) {
    logError('Failed to refine algorithm', err);

    if (config.showNotifications) {
      await vscode.window.showErrorMessage(getNotificationErrorMessage(err));
    }
  }
}
