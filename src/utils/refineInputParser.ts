export interface ParsedRefineInput {
  instruction: string;
  codeBody: string;
}

const LINE_COMMENT_PREFIXES = ['#', '//', '--', ';'];

function isLineCommentLine(trimmedLine: string): boolean {
  return LINE_COMMENT_PREFIXES.some((prefix) => trimmedLine.startsWith(prefix));
}

function stripLineCommentPrefix(trimmedLine: string): string {
  for (const prefix of LINE_COMMENT_PREFIXES) {
    if (trimmedLine.startsWith(prefix)) {
      return trimmedLine.slice(prefix.length).replace(/^\s/, '');
    }
  }

  return trimmedLine;
}

function stripTrailingBlankLines(lines: string[]): string[] {
  const result = [...lines];

  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  return result;
}

function trimLeadingBlankLines(lines: string[]): string[] {
  let startIndex = 0;

  while (startIndex < lines.length && lines[startIndex].trim() === '') {
    startIndex += 1;
  }

  return lines.slice(startIndex);
}

function parseLineCommentBlock(lines: string[], startIndex: number): { instruction: string; nextIndex: number } {
  const instructionLines: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const trimmedLine = lines[index].trimStart();

    if (trimmedLine.trim() === '') {
      instructionLines.push('');
      index += 1;
      continue;
    }

    if (!isLineCommentLine(trimmedLine)) {
      break;
    }

    instructionLines.push(stripLineCommentPrefix(trimmedLine));
    index += 1;
  }

  return {
    instruction: stripTrailingBlankLines(instructionLines).join('\n').trim(),
    nextIndex: index,
  };
}

function parseBlockCommentBlock(
  lines: string[],
  startIndex: number,
  openingDelimiter: string,
  closingDelimiter: string
): { instruction: string; nextIndex: number } {
  const instructionLines: string[] = [];
  let index = startIndex;
  let opened = false;

  while (index < lines.length) {
    const trimmedLine = lines[index].trimStart();

    if (!opened) {
      const remainder = trimmedLine.slice(openingDelimiter.length);
      opened = true;

      const closingIndex = remainder.indexOf(closingDelimiter);
      if (closingIndex >= 0) {
        instructionLines.push(remainder.slice(0, closingIndex).trim());
        index += 1;
        break;
      }

      if (remainder.trim() !== '') {
        instructionLines.push(remainder);
      }

      index += 1;
      continue;
    }

    const closingIndex = trimmedLine.indexOf(closingDelimiter);
    if (closingIndex >= 0) {
      instructionLines.push(trimmedLine.slice(0, closingIndex).trimEnd());
      index += 1;
      break;
    }

    instructionLines.push(trimmedLine.replace(/^\*\s?/, ''));
    index += 1;
  }

  return {
    instruction: stripTrailingBlankLines(instructionLines).join('\n').trim(),
    nextIndex: index,
  };
}

function parseDocstringBlock(
  lines: string[],
  startIndex: number,
  delimiter: '"""' | "'''"
): { instruction: string; nextIndex: number } {
  const instructionLines: string[] = [];
  let index = startIndex;
  let opened = false;

  while (index < lines.length) {
    const line = lines[index].trimStart();

    if (!opened) {
      const remainder = line.slice(delimiter.length);
      opened = true;

      const closingIndex = remainder.indexOf(delimiter);
      if (closingIndex >= 0) {
        instructionLines.push(remainder.slice(0, closingIndex).trim());
        index += 1;
        break;
      }

      if (remainder.trim() !== '') {
        instructionLines.push(remainder);
      }

      index += 1;
      continue;
    }

    const closingIndex = line.indexOf(delimiter);
    if (closingIndex >= 0) {
      instructionLines.push(line.slice(0, closingIndex).trimEnd());
      index += 1;
      break;
    }

    instructionLines.push(line);
    index += 1;
  }

  return {
    instruction: stripTrailingBlankLines(instructionLines).join('\n').trim(),
    nextIndex: index,
  };
}

export function parseRefineInput(content: string): ParsedRefineInput {
  if (content.trim() === '') {
    return { instruction: '', codeBody: '' };
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const trimmedLines = trimLeadingBlankLines(lines);

  if (trimmedLines.length === 0) {
    return { instruction: '', codeBody: '' };
  }

  const startIndex = lines.length - trimmedLines.length;
  const firstLine = lines[startIndex].trimStart();

  let parsedInstruction = '';
  let nextIndex = startIndex;

  if (firstLine.startsWith('/*')) {
    const parsed = parseBlockCommentBlock(lines, startIndex, '/*', '*/');
    parsedInstruction = parsed.instruction;
    nextIndex = parsed.nextIndex;
  } else if (firstLine.startsWith('"""')) {
    const parsed = parseDocstringBlock(lines, startIndex, '"""');
    parsedInstruction = parsed.instruction;
    nextIndex = parsed.nextIndex;
  } else if (firstLine.startsWith("'''")) {
    const parsed = parseDocstringBlock(lines, startIndex, "'''");
    parsedInstruction = parsed.instruction;
    nextIndex = parsed.nextIndex;
  } else if (isLineCommentLine(firstLine)) {
    const parsed = parseLineCommentBlock(lines, startIndex);
    parsedInstruction = parsed.instruction;
    nextIndex = parsed.nextIndex;
  }

  const codeLines = trimLeadingBlankLines(lines.slice(nextIndex));

  return {
    instruction: parsedInstruction,
    codeBody: codeLines.join('\n').trimEnd(),
  };
}