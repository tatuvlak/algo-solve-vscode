import * as vscode from 'vscode';

export const LAST_SAVED_PATH_KEY = 'algoSolve.lastSavedPath';

export interface AlgoSolveConfig {
  destinationDirectory: string;
  programmingLanguage: string;
  ollamaModel: string;
  ollamaEndpoint: string;
  prompt: string;
  refinePrompt: string;
  requestTimeout: number;
  showNotifications: boolean;
}

const DEFAULT_PROMPT =
  'You are an expert algorithm solver. Analyze the following problem description and provide a complete, working solution in {language}.\n\nProblem:\n{content}\n\nRequirements:\n- Provide clean, well-commented code\n- Include proper error handling\n- Optimize for time and space complexity where possible\n- Return only the code implementation\n\nSolution:';

const DEFAULT_REFINE_PROMPT =
  'You are an expert programmer. Below is a solution in {language}.\n\n{context}\n\nUser request: {userPrompt}\n\nProvide an updated version of the solution that addresses the user\'s request. Return only the code.';

export function getConfiguration(): AlgoSolveConfig {
  const config = vscode.workspace.getConfiguration('algoSolve');

  return {
    destinationDirectory: config.get<string>('destinationDirectory', ''),
    programmingLanguage: config.get<string>('programmingLanguage', 'python'),
    ollamaModel: config.get<string>('ollamaModel', 'codellama'),
    ollamaEndpoint: config.get<string>('ollamaEndpoint', 'http://localhost:11434'),
    prompt: config.get<string>('prompt', DEFAULT_PROMPT),
    refinePrompt: config.get<string>('refinePrompt', DEFAULT_REFINE_PROMPT),
    requestTimeout: config.get<number>('requestTimeout', 60000),
    showNotifications: config.get<boolean>('showNotifications', false),
  };
}
