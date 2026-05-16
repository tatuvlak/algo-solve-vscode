import * as vscode from 'vscode';
import { solveAlgorithm } from './commands/solveAlgorithm';
import { refineAlgorithm } from './commands/refineAlgorithm';
import { dispose as disposeLogger, log } from './utils/logger';

export function activate(context: vscode.ExtensionContext): void {
  log('Ollama Algorithm Solver extension activated');

  context.subscriptions.push(
    vscode.commands.registerCommand('algoSolve.solve', () => solveAlgorithm(context)),
    vscode.commands.registerCommand('algoSolve.refine', () => refineAlgorithm(context))
  );
}

export function deactivate(): void {
  log('Ollama Algorithm Solver extension deactivated');
  disposeLogger();
}
