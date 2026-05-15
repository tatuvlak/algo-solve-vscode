import * as vscode from 'vscode';

export interface AlgoSolveConfig {
  destinationDirectory: string;
  programmingLanguage: string;
  ollamaModel: string;
  ollamaEndpoint: string;
  prompt: string;
  requestTimeout: number;
}

const DEFAULT_PROMPT =
  'You are an expert algorithm solver. Analyze the following problem description and provide a complete, working solution in {language}.\n\nProblem:\n{content}\n\nRequirements:\n- Provide clean, well-commented code\n- Include proper error handling\n- Optimize for time and space complexity where possible\n- Return only the code implementation\n\nSolution:';

export function getConfiguration(): AlgoSolveConfig {
  const config = vscode.workspace.getConfiguration('algoSolve');

  return {
    destinationDirectory: config.get<string>('destinationDirectory', ''),
    programmingLanguage: config.get<string>('programmingLanguage', 'python'),
    ollamaModel: config.get<string>('ollamaModel', 'codellama'),
    ollamaEndpoint: config.get<string>('ollamaEndpoint', 'http://localhost:11434'),
    prompt: config.get<string>('prompt', DEFAULT_PROMPT),
    requestTimeout: config.get<number>('requestTimeout', 60000),
  };
}
