# algo-solve-vscode

A VS Code extension that uses local Ollama models to solve algorithmic tasks. Trigger it with a keyboard shortcut, and the plugin will read your problem description, send it to a local Ollama instance, and save the generated solution to a file.

## Features

- **Non-intrusive**: Runs silently in the background until triggered
- **Keyboard shortcut**: Activate with `Ctrl+Shift+S` (`Cmd+Shift+S` on macOS)
- **Refine flow**: Ask Ollama to improve the currently opened file with `Ctrl+Alt+R` (`Cmd+Alt+R` on macOS)
- **Flexible output**: Saves solutions to a configurable directory with auto-incremented versioned filenames (`_v1`, `_v2`, `_v3`, ...)
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

### Refine the active file

You can refine whatever file is currently open in the editor. If the file starts with a top comment, that comment is treated as additional instruction. The file may also contain only the instruction comment or even no code yet.

1. Run **Refine Solution with Ollama** from the Command Palette, or press `Ctrl+Alt+R` (`Cmd+Alt+R` on macOS)
2. Enter a refinement request (for example: "optimize for memory" or "add type annotations")
3. The extension reads the active editor file content, extracts the optional top instruction comment, sends the user request plus that instruction and code body to Ollama, and saves a new file

Refined files are written to the same configured destination directory and use the next available `_vN` version suffix.

### Example

Open a file `two-sum.txt`:
```
Given an array of integers nums and an integer target,
return indices of the two numbers that add up to target.
```

Press `Ctrl+Shift+S`. The extension saves a Python solution to  
`~/solutions/two-sum_v1.py` and shows a notification.

Running the command again with the same base name saves `~/solutions/two-sum_v2.py`, then `two-sum_v3.py`, and so on.

Refine continues the same version sequence for the active file base name (for example, if you refine `two-sum_v2.py`, it saves `two-sum_v3.py`).

If the file begins with a comment like this:
```python
# add type hints
# preserve current algorithm

def solve(...):
  ...
```

the extension sends both the user request and the leading comment as the instruction, and the code below it as the body to refine. If the code body is empty, the extension still asks Ollama to generate a solution from the instruction.

## Configuration

Add these to your VS Code `settings.json`:

```json
{
  "algoSolve.destinationDirectory": "~/solutions",
  "algoSolve.programmingLanguage": "python",
  "algoSolve.outputFileBaseName": "",
  "algoSolve.ollamaModel": "codellama",
  "algoSolve.ollamaEndpoint": "http://localhost:11434",
  "algoSolve.refinePrompt": "You are an expert programmer. Use the instruction below to refine the code in {language}.\n\nInstruction:\n{instruction}\n\nCode:\n{codeBody}\n\nRules:\n- Treat the instruction as the source of truth.\n- If the code section is empty, generate a complete solution from the instruction alone.\n- If both instruction and code are present, modify only what is needed to satisfy the instruction.\n- Return only the final code, with no explanation.",
  "algoSolve.requestTimeout": 60000,
  "algoSolve.showNotifications": false,
  "algoSolve.prompt": "You are an expert algorithm solver. Analyze the following problem description and provide a complete, working solution in {language}.\n\nProblem:\n{content}\n\nRequirements:\n- Provide clean, well-commented code\n- Include proper error handling\n- Optimize for time and space complexity where possible\n- Return only the code implementation\n\nSolution:"
}
```

| Setting | Default | Description |
|---|---|---|
| `algoSolve.destinationDirectory` | `""` (workspace root) | Directory to save solutions |
| `algoSolve.programmingLanguage` | `"python"` | Target language (python, javascript, java, …) |
| `algoSolve.outputFileBaseName` | `""` | Optional shared base name override for solve/refine output files (`_vN` and extension are appended automatically) |
| `algoSolve.ollamaModel` | `"codellama"` | Ollama model name |
| `algoSolve.ollamaEndpoint` | `"http://localhost:11434"` | Ollama server URL |
| `algoSolve.refinePrompt` | See package default | Prompt template for refine command (`{language}`, `{instruction}`, `{codeBody}`; `{context}` is still supported as a legacy combined alias) |
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
npm run watch   # live bundle rebuilds during development
npm test        # unit tests (no VS Code required)
npm run lint
```

`npm run compile` creates the production extension bundle at `dist/extension.js` and recompiles the test files under `out/`.

To run the full VS Code integration tests:
```bash
npm run test:vscode
```

To package the extension:
```bash
npx @vscode/vsce package
```

## License

MIT
