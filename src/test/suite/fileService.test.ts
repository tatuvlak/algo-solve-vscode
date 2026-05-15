import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generateFilename,
  getExtensionForLanguage,
  resolveDestinationDirectory,
  saveToFile,
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
      assert.ok(name.startsWith('two-sum_'), `Expected "two-sum_" prefix in "${name}"`);
    });

    test('uses the correct extension', () => {
      const name = generateFilename('solution', 'javascript');
      assert.ok(name.endsWith('.js'), `Expected .js extension in "${name}"`);
    });

    test('includes a timestamp', () => {
      const name = generateFilename('solution', 'python');
      // timestamp format: YYYYMMDD_HHMMSS (part of ISO string)
      assert.match(name, /\d{8}_\d{6}/);
    });

    test('sanitizes special characters in base name', () => {
      const name = generateFilename('my problem!@#', 'python');
      assert.match(name, /^[a-zA-Z0-9_\-.]+$/);
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
      assert.strictEqual(result, '/tmp/solutions');
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
  });
});
