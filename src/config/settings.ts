import * as vscode from 'vscode';

export const LAST_SAVED_PATH_KEY = 'algoSolve.lastSavedPath';

export interface AlgoSolveConfig {
  destinationDirectory: string;
  programmingLanguage: string;
  outputFileBaseName: string;
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
  'You are an expert programmer. Use the instruction below to refine the code in {language}.\n\nInstruction:\n{instruction}\n\nCode:\n{codeBody}\n\nRules:\n- Treat the instruction as the source of truth.\n- If the code section is empty, generate a complete solution from the instruction alone.\n- If both instruction and code are present, modify only what is needed to satisfy the instruction.\n- Return only the final code, with no explanation.';

export function getConfiguration(): AlgoSolveConfig {
  const config = vscode.workspace.getConfiguration('algoSolve');

  return {
    destinationDirectory: config.get<string>('destinationDirectory', ''),
    programmingLanguage: config.get<string>('programmingLanguage', 'python'),
    outputFileBaseName: config.get<string>('outputFileBaseName', ''),
    ollamaModel: config.get<string>('ollamaModel', 'codellama'),
    ollamaEndpoint: config.get<string>('ollamaEndpoint', 'http://localhost:11434'),
    prompt: config.get<string>('prompt', DEFAULT_PROMPT),
    refinePrompt: config.get<string>('refinePrompt', DEFAULT_REFINE_PROMPT),
    requestTimeout: config.get<number>('requestTimeout', 60000),
    showNotifications: config.get<boolean>('showNotifications', false),
  };
}
