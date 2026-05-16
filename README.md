# algo-solve-vscode

A VS Code extension that uses local Ollama models to solve algorithmic tasks. Trigger it with a keyboard shortcut, and the plugin will read your problem description, send it to a local Ollama instance, and save the generated solution to a file.

## Features

- **Non-intrusive**: Runs silently in the background until triggered
- **Keyboard shortcut**: Activate with `Ctrl+Shift+S` (`Cmd+Shift+S` on macOS)
- **Refine flow**: Ask Ollama to improve the most recently generated solution with `Ctrl+Alt+R` (`Cmd+Alt+R` on macOS)
- **Flexible output**: Saves solutions to a configurable directory with timestamped filenames
- **Configurable**: Choose your Ollama model, programming language, and custom prompts
- **Async**: All Ollama requests run asynchronously with a progress indicator

## Requirements

- [Ollama](https://ollama.ai/) running locally (default: `http://localhost:11434`)
- An Ollama model downloaded (e.g. `ollama pull codellama`)

## Installation

1. Install the extension from the VS Code Marketplace (or install the `.vsix` file)
2. Make sure Ollama is running: `ollama serve`
3. Pull a model: `ollama pull codellama`

## Usage

1. Open a file containing an algorithm problem description
2. Press `Ctrl+Shift+S` (`Cmd+Shift+S` on macOS)
3. Wait for the progress notification to complete
4. The solution is saved to your configured destination directory

### Refine an existing solution

After running **Solve Algorithm with Ollama** at least once, you can refine the latest generated file:

1. Run **Refine Solution with Ollama** from the Command Palette, or press `Ctrl+Alt+R` (`Cmd+Alt+R` on macOS)
2. Enter a refinement request (for example: "optimize for memory" or "add type annotations")
3. The extension reads the last saved solution, sends it with your instruction to Ollama, and saves a new file

Refined files are written to the same configured destination directory with a `_refined` suffix in the filename.

### Example

Open a file `two-sum.txt`:
```
Given an array of integers nums and an integer target,
return indices of the two numbers that add up to target.
```

Press `Ctrl+Shift+S`. The extension saves a Python solution to  
`~/solutions/two-sum_20260515_132400.py` and shows a notification.

## Configuration

Add these to your VS Code `settings.json`:

```json
{
  "algoSolve.destinationDirectory": "~/solutions",
  "algoSolve.programmingLanguage": "python",
  "algoSolve.ollamaModel": "codellama",
  "algoSolve.ollamaEndpoint": "http://localhost:11434",
  "algoSolve.refinePrompt": "You are an expert programmer. Below is a solution in {language}.\n\n{context}\n\nUser request: {userPrompt}\n\nProvide an updated version of the solution that addresses the user's request. Return only the code.",
  "algoSolve.requestTimeout": 60000,
  "algoSolve.showNotifications": false,
  "algoSolve.prompt": "You are an expert algorithm solver. Analyze the following problem description and provide a complete, working solution in {language}.\n\nProblem:\n{content}\n\nRequirements:\n- Provide clean, well-commented code\n- Include proper error handling\n- Optimize for time and space complexity where possible\n- Return only the code implementation\n\nSolution:"
}
```

| Setting | Default | Description |
|---|---|---|
| `algoSolve.destinationDirectory` | `""` (workspace root) | Directory to save solutions |
| `algoSolve.programmingLanguage` | `"python"` | Target language (python, javascript, java, …) |
| `algoSolve.ollamaModel` | `"codellama"` | Ollama model name |
| `algoSolve.ollamaEndpoint` | `"http://localhost:11434"` | Ollama server URL |
| `algoSolve.refinePrompt` | See package default | Prompt template for refine command (`{language}`, `{context}`, `{userPrompt}`) |
| `algoSolve.requestTimeout` | `60000` | Timeout in milliseconds |
| `algoSolve.prompt` | See above | Prompt template (`{language}` and `{content}` placeholders) |
| `algoSolve.showNotifications` | `false` | Show progress/info/error notifications instead of running silently |

## Troubleshooting

**"Cannot connect to Ollama"** – Make sure Ollama is running (`ollama serve`) and the endpoint is correct.

**"Request timed out"** – Increase `algoSolve.requestTimeout` in settings.

**No active editor** – Open a file with the problem description before triggering the command.

## Development

```bash
npm install
npm run compile
npm test        # unit tests (no VS Code required)
npm run lint
```

To run the full VS Code integration tests:
```bash
npm run test:vscode
```

## License

MIT
