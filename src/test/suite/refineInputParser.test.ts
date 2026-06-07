import * as assert from 'assert';
import { parseRefineInput } from '../../utils/refineInputParser';

suite('refineInputParser', () => {
  test('splits a leading line-comment instruction from code', () => {
    const result = parseRefineInput('# add type hints\n# optimize memory\n\nprint("hi")');

    assert.strictEqual(result.instruction, 'add type hints\noptimize memory');
    assert.strictEqual(result.codeBody, 'print("hi")');
  });

  test('supports python docstring instructions', () => {
    const result = parseRefineInput('"""add type hints\noptimize memory"""\n\nprint("hi")');

    assert.strictEqual(result.instruction, 'add type hints\noptimize memory');
    assert.strictEqual(result.codeBody, 'print("hi")');
  });

  test('treats comment-only content as valid input', () => {
    const result = parseRefineInput('// create a solution\n// from scratch');

    assert.strictEqual(result.instruction, 'create a solution\nfrom scratch');
    assert.strictEqual(result.codeBody, '');
  });

  test('returns code body when no instruction comment exists', () => {
    const result = parseRefineInput('print("hello")\nprint("world")');

    assert.strictEqual(result.instruction, '');
    assert.strictEqual(result.codeBody, 'print("hello")\nprint("world")');
  });

  test('returns empty sections for empty content', () => {
    const result = parseRefineInput('   \n\n');

    assert.strictEqual(result.instruction, '');
    assert.strictEqual(result.codeBody, '');
  });
});
