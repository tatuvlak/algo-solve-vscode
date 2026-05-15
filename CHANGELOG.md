# Changelog

All notable changes to the **Ollama Algorithm Solver** extension will be documented in this file.

## [0.1.0] – 2026-05-15

### Added
- Initial release
- `algoSolve.solve` command triggered by `Ctrl+Shift+S` (`Cmd+Shift+S` on macOS)
- Reads the active editor content and sends it to a local Ollama instance
- Configurable destination directory, programming language, model, endpoint, timeout, and prompt template
- Timestamped solution filenames (e.g. `two-sum_20260515_132400.py`)
- Progress notification during Ollama requests
- Output channel logging for debugging
- Path traversal protection for file writes
- Graceful error messages for connection failures and timeouts
