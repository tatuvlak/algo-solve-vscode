import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generateFilename,
  getExtensionForLanguage,
  resolveDestinationDirectory,
  sanitizeBaseName,
  saveToFile,
  stripMarkdownCodeFence,
} from '../../services/fileService';

suite('fileService', () => {
  suite('getExtensionForLanguage', () => {
    test('returns py for python', () => {
      assert.strictEqual(getExtensionForLanguage('python'), 'py');
    });

    test('is case-insensitive', () => {
      assert.strictEqual(getExtensionForLanguage('Python'), 'py');
      assert.strictEqual(getExtensionForLanguage('PYTHON'), 'py');
    });

    test('returns the language itself for unknown languages', () => {
      assert.strictEqual(getExtensionForLanguage('brainfuck'), 'brainfuck');
    });

    test('returns js for javascript', () => {
      assert.strictEqual(getExtensionForLanguage('javascript'), 'js');
    });

    test('returns ts for typescript', () => {
      assert.strictEqual(getExtensionForLanguage('typescript'), 'ts');
    });
  });

  suite('generateFilename', () => {
    test('includes the base name in the filename', () => {
      const name = generateFilename('two-sum', 'python');
      assert.ok(name.startsWith('two-sum_v1'), `Expected "two-sum_v1" prefix in "${name}"`);
    });

    test('uses the correct extension', () => {
      const name = generateFilename('solution', 'javascript');
      assert.ok(name.endsWith('.js'), `Expected .js extension in "${name}"`);
    });

    test('includes the provided version suffix', () => {
      const name = generateFilename('solution', 'python', { version: 2 });
      assert.ok(name.endsWith('_v2.py'), `Expected _v2.py suffix in "${name}"`);
    });

    test('sanitizes special characters in base name', () => {
      const name = generateFilename('my problem!@#', 'python', 1);
      assert.match(name, /^[a-zA-Z0-9_\-.]+$/);
    });

    test('falls back to solution when base name sanitizes to empty', () => {
      const name = generateFilename('!!!', 'python');
      assert.strictEqual(name, 'solution_v1.py');
    });

    test('auto-increments version when file already exists in destination directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'algo-solve-version-test-'));
      try {
        fs.writeFileSync(path.join(tmpDir, 'solution_v1.py'), 'existing', 'utf8');
        const name = generateFilename('solution', 'python', { directory: tmpDir });
        assert.strictEqual(name, 'solution_v2.py');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  suite('sanitizeBaseName', () => {
    test('returns solution for empty sanitized input', () => {
      assert.strictEqual(sanitizeBaseName('@@@'), 'solution');
    });
  });

  suite('resolveDestinationDirectory', () => {
    test('returns fallback when configured is empty', () => {
      const result = resolveDestinationDirectory('', '/fallback');
      assert.strictEqual(result, '/fallback');
    });

    test('returns fallback when configured is whitespace', () => {
      const result = resolveDestinationDirectory('   ', '/fallback');
      assert.strictEqual(result, '/fallback');
    });

    test('returns resolved absolute path when configured', () => {
      const result = resolveDestinationDirectory('/tmp/solutions', '/fallback');
      assert.strictEqual(result, path.resolve('/tmp/solutions'));
    });
  });

  suite('saveToFile', () => {
    let tmpDir: string;

    setup(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'algo-solve-test-'));
    });

    teardown(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('writes content to the specified file', () => {
      const filePath = saveToFile(tmpDir, 'solution.py', 'print("hello")');
      assert.ok(fs.existsSync(filePath));
      assert.strictEqual(fs.readFileSync(filePath, 'utf8'), 'print("hello")');
    });

    test('creates directory if it does not exist', () => {
      const nested = path.join(tmpDir, 'deep', 'dir');
      saveToFile(nested, 'solution.py', 'code');
      assert.ok(fs.existsSync(nested));
    });

    test('returns the full path of the saved file', () => {
      const filePath = saveToFile(tmpDir, 'out.js', 'const x = 1;');
      assert.strictEqual(filePath, path.join(tmpDir, 'out.js'));
    });

    test('neutralizes path traversal via basename stripping', () => {
      // path.basename('../evil.py') === 'evil.py', so the file is safely saved in tmpDir
      const filePath = saveToFile(tmpDir, '../evil.py', 'bad');
      assert.ok(filePath.startsWith(tmpDir), 'File should be inside tmpDir');
      assert.strictEqual(path.basename(filePath), 'evil.py');
    });

    test('strips surrounding markdown code fences before writing', () => {
      const filePath = saveToFile(tmpDir, 'solution.py', '```python\nprint("hello")\n```');
      assert.strictEqual(fs.readFileSync(filePath, 'utf8'), 'print("hello")');
    });

    test('keeps content unchanged when no surrounding fence exists', () => {
      const filePath = saveToFile(tmpDir, 'solution.py', 'print("hello")\n```python\ninner\n```');
      assert.strictEqual(
        fs.readFileSync(filePath, 'utf8'),
        'print("hello")\n```python\ninner\n```'
      );
    });
  });

  suite('stripMarkdownCodeFence', () => {
    test('returns original content when not fenced', () => {
      assert.strictEqual(stripMarkdownCodeFence('print("x")'), 'print("x")');
    });

    test('strips generic fenced block', () => {
      assert.strictEqual(stripMarkdownCodeFence('```\nprint("x")\n```'), 'print("x")');
    });
  });
});
