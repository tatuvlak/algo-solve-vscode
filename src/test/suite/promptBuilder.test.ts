import * as assert from 'assert';
import { buildPrompt, buildRefinePrompt } from '../../utils/promptBuilder';

suite('promptBuilder', () => {
  test('replaces {language} placeholder', () => {
    const result = buildPrompt('Solve in {language}', 'python', 'content');
    assert.strictEqual(result, 'Solve in python');
  });

  test('replaces {content} placeholder', () => {
    const result = buildPrompt('Problem:\n{content}', 'python', 'two sum');
    assert.strictEqual(result, 'Problem:\ntwo sum');
  });

  test('replaces all occurrences of placeholders', () => {
    const result = buildPrompt('{language} {language} {content}', 'go', 'task');
    assert.strictEqual(result, 'go go task');
  });

  test('returns template unchanged when no placeholders', () => {
    const result = buildPrompt('No placeholders here', 'python', 'content');
    assert.strictEqual(result, 'No placeholders here');
  });

  test('handles empty content', () => {
    const result = buildPrompt('Lang={language} Content={content}', 'python', '');
    assert.strictEqual(result, 'Lang=python Content=');
  });

  test('replaces refine placeholders and legacy context', () => {
    const result = buildRefinePrompt(
      'Lang={language}\nInstr={instruction}\nCode={codeBody}\nCtx={context}',
      'python',
      'user request\n\nfile note',
      'print("hi")'
    );

    assert.strictEqual(
      result,
      'Lang=python\nInstr=user request\n\nfile note\nCode=print("hi")\nCtx=user request\n\nfile note\n\nprint("hi")'
    );
  });
});
