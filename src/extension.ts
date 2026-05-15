import * as vscode from 'vscode';
import { solveAlgorithm } from './commands/solveAlgorithm';
import { dispose as disposeLogger, log } from './utils/logger';

export function activate(context: vscode.ExtensionContext): void {
  log('Ollama Algorithm Solver extension activated');

  const disposable = vscode.commands.registerCommand('algoSolve.solve', solveAlgorithm);
  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  log('Ollama Algorithm Solver extension deactivated');
  disposeLogger();
}
