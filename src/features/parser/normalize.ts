export interface NormalizedLine {
  readonly lineNumber: number;
  readonly text: string;
}

export interface NormalizedInput {
  readonly text: string;
  readonly lines: readonly NormalizedLine[];
}

const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/gu;
const COMBINING_MARK = /\p{Mark}/u;

function codePointWidth(character: string): number {
  if (COMBINING_MARK.test(character)) return 0;

  const codePoint = character.codePointAt(0) ?? 0;
  const isWide =
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2329 && codePoint <= 0x232a) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xff01 && codePoint <= 0xff60) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff);

  return isWide ? 2 : 1;
}

export function visualWidth(value: string, tabWidth = 4): number {
  let column = 0;

  for (const character of value) {
    if (character === '\t') {
      column += tabWidth - (column % tabWidth);
    } else {
      column += codePointWidth(character);
    }
  }

  return column;
}

export function codePointLength(value: string): number {
  return [...value].length;
}

function expandTabs(value: string, tabWidth: number): string {
  let column = 0;
  let result = '';

  for (const character of value) {
    if (character !== '\t') {
      result += character;
      column += codePointWidth(character);
      continue;
    }

    const spaces = tabWidth - (column % tabWidth);
    result += ' '.repeat(spaces);
    column += spaces;
  }

  return result;
}

export function normalizeImportedText(value: string, tabWidth = 4): NormalizedInput {
  const text = value
    .replace(/\r\n?/gu, '\n')
    .replace(/[\u2028\u2029]/gu, '\n')
    .replace(/\u00A0/gu, ' ')
    .replace(INVISIBLE_CHARACTERS, '')
    .split('\n')
    .map((line) => expandTabs(line, tabWidth))
    .join('\n');

  return {
    text,
    lines: text.split('\n').map((line, index) => ({ lineNumber: index + 1, text: line })),
  };
}
