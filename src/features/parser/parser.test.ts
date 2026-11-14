import { describe, expect, it } from 'vitest';

import { parseSongText, transposeParsedSong } from './index';

describe('parseSongText', () => {
  it('interpreta um formato comum do Cifra Club e associa cifra à letra seguinte', () => {
    const song = parseSongText(`Uma Vez Mais
Natiruts
Tom: A

A7M        Bbº
Mais uma vez
Bm7
Prisioneiro da solidão
E7(9)
E ela está chorando`);

    expect(song.valid).toBe(true);
    expect(song.title).toBe('Uma Vez Mais');
    expect(song.artist).toBe('Natiruts');
    expect(song.originalKey).toBe('A');
    expect(song.report.chordCount).toBe(4);

    const chordLyricLines = song.lines.filter((line) => line.kind === 'chord-lyric');
    expect(chordLyricLines).toHaveLength(3);
    expect(chordLyricLines[0]?.chords.map((chord) => chord.symbol)).toEqual(['A7M', 'Bbº']);
    expect(chordLyricLines[0]?.chords.map((chord) => chord.position)).toEqual([0, 11]);
  });

  it('reconhece cifras inline e preserva o texto da importação', () => {
    const input = 'Eu [C#m7] canto [E7(9)/G#] aqui';
    const song = parseSongText(input);
    const line = song.lines.find((item) => item.kind === 'chord-lyric');

    expect(song.originalText).toBe(input);
    expect(line?.text).toBe('Eu  canto  aqui');
    expect(line?.chords.map((chord) => chord.position)).toEqual([3, 10]);
    expect(line?.chords.map((chord) => chord.symbol)).toEqual(['C#m7', 'E7(9)/G#']);
    expect(line?.reconstructedText).toBe(input);
  });

  it('reconhece acordes inline simples e acordes complexos em uma linha de cifras', () => {
    const inline = parseSongText('Eu [C] sigo [Am] só');
    const chordLine = parseSongText(
      'A A7 A7M A9 A4 Asus4 Aadd9 A/C# Bb Bbº Bm7 C#m7 D7M Dm7 E7(9) F#m7 G7M',
    );

    expect(inline.lines[0]?.chords.map((chord) => chord.symbol)).toEqual(['C', 'Am']);
    expect(chordLine.report.chordCount).toBe(17);
    expect(chordLine.lines[0]?.kind).toBe('chords');
  });

  it('aceita letra sem tom e sem cifras sem invalidá-la', () => {
    const song = parseSongText('Apenas a letra\nsem nenhuma cifra');

    expect(song.valid).toBe(true);
    expect(song.originalKey).toBeNull();
    expect(song.report.chordCount).toBe(0);
    expect(song.diagnostics.map((item) => item.code)).toContain('NO_CHORDS_FOUND');
  });

  it('mantém linhas, espaços, tabs e caracteres invisíveis de forma normalizada', () => {
    const song = parseSongText('Tom: D\r\n\r\nA\t\u200B    D\r\nlinha');
    const line = song.lines.find((item) => item.kind === 'chord-lyric');

    expect(song.normalizedText).toContain('A       D');
    expect(line?.chords.map((chord) => chord.position)).toEqual([0, 8]);
    expect(song.originalText).toContain('\r\n');
  });

  it('preserva seções e linhas vazias no modelo estruturado', () => {
    const song = parseSongText('Título\n\n[Refrão]\nC G\nVolta pra mim\n\n');

    expect(song.lines.map((line) => line.kind)).toEqual([
      'blank',
      'section',
      'chord-lyric',
      'blank',
      'blank',
    ]);
    expect(song.lines[1]?.sectionLabel).toBe('Refrão');
  });

  it('emite aviso para marcação de acorde inválida sem descartar a linha', () => {
    const song = parseSongText('Verso [H7] desconhecido');

    expect(song.valid).toBe(true);
    expect(song.lines[0]?.text).toBe('Verso [H7] desconhecido');
    expect(song.diagnostics.some((item) => item.code === 'UNRECOGNIZED_CHORD')).toBe(true);
  });

  it('não avisa quando palavras de letra são apenas raízes soltas', () => {
    const song = parseSongText(
      [
        'A força que afugenta as idéias',
        'E tenta me dominar',
        'Então a gente põe o pé na estrada',
        'E de repente',
      ].join('\n'),
    );

    expect(song.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
  });

  it('não trata palavras minúsculas da letra, como “em”, como acordes ambíguos', () => {
    const song = parseSongText(
      [
        'Acredite em seus desejos',
        'Não há tempo pra viver em vão',
        'Transformando toda noite em amor',
      ].join('\n'),
    );

    expect(song.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
  });

  it('continua reconhecendo linhas de cifra escritas em minúsculas', () => {
    const song = parseSongText('c g am f\nletra da canção');

    expect(song.valid).toBe(true);
    expect(song.lines[0]?.kind).toBe('chord-lyric');
    expect(song.lines[0]?.chords.map((chord) => chord.symbol)).toEqual(['C', 'G', 'Am', 'F']);
    expect(song.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
  });

  it('não avisa em acordes com extensão após barra nem em progressões entre parênteses', () => {
    const song = parseSongText(
      [
        'Praia Dos Golfinhos',
        'Natiruts',
        'Tom: E',
        '[Intro] E7+/9 A7+',
        'E7+/9           A7+',
        'Tempo ensinou,  pra ter liberdade',
        '( Bb7M  Eb7M )',
        '( A7(4/9)  D7M(9) )',
      ].join('\n'),
    );

    expect(song.valid).toBe(true);
    expect(song.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
    expect(song.lines.some((line) => line.kind === 'chords')).toBe(true);
    expect(song.lines.some((line) => line.chords.some((chord) => chord.symbol === 'E7+/9'))).toBe(
      true,
    );
  });

  it('reconhece intro rotulada com acordes e não avisa', () => {
    const song = parseSongText(
      [
        'Verbalize',
        'Natiruts',
        'Tom: Bb',
        'Intro:   ( Gm Cm7 Dm7 )',
        'introdução: Am7 Dm Am7 Dm.',
      ].join('\n'),
    );

    expect(song.valid).toBe(true);
    expect(song.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
    expect(song.lines.filter((line) => line.kind === 'chords')).toHaveLength(2);
  });

  it('não avisa quando “Em” é palavra de uma linha de letra', () => {
    const song = parseSongText(['Em paz eu quero estar', 'Em forma de canção'].join('\n'));

    expect(song.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
  });

  it('mantém aviso para acorde ambíguo no meio da letra', () => {
    const song = parseSongText('Hoje eu vou de Am7 pra casa');

    expect(song.diagnostics.some((item) => item.code === 'UNRECOGNIZED_CHORD')).toBe(true);
  });

  it('separa rótulo com acordes em seção e linha de cifras sem perder colunas', () => {
    const song = parseSongText('[Intro] Gm7  Dm7  Cm7  Eb7+\n        Gm7  Dm7  Cm7  Eb7+');

    expect(song.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
    expect(song.lines.map((line) => line.kind)).toEqual(['section', 'chords', 'chords']);
    expect(song.lines[0]?.sectionLabel).toBe('Intro');
    expect(song.lines[1]?.chords.map((chord) => chord.symbol)).toEqual([
      'Gm7',
      'Dm7',
      'Cm7',
      'Eb7+',
    ]);
    expect(song.lines[1]?.chords.map((chord) => chord.position)).toEqual([8, 13, 18, 23]);
    expect(song.lines[2]?.chords.map((chord) => chord.position)).toEqual([8, 13, 18, 23]);
  });

  it('separa Intro com cifras da mesma forma que a Pétala', () => {
    const song = parseSongText('[Intro] A  A7M(2)  D7M  E7(4/9)');

    expect(song.lines.map((line) => line.kind)).toEqual(['section', 'chords']);
    expect(song.lines[0]?.sectionLabel).toBe('Intro');
    expect(song.lines[1]?.chords.map((chord) => chord.position)).toEqual([8, 11, 19, 24]);
  });

  it('sugere o tom pelo primeiro acorde e marca a estimativa', () => {
    const song = parseSongText('Gm7\nGm7  Dm7');

    expect(song.originalKey).toBe('Gm');
    expect(song.currentKey).toBe('Gm');
    expect(song.metadata.originalKeyInferred).toBe(true);
    expect(song.diagnostics.map((item) => item.message)).toContain('Tom sugerido: Gm — confirme.');
  });

  it('não substitui tom explicitamente informado por sugestão', () => {
    const song = parseSongText('Tom: A\nGm7\nGm7  Dm7');

    expect(song.originalKey).toBe('A');
    expect(song.metadata.originalKeyInferred).toBe(false);
    expect(song.diagnostics.some((item) => item.code === 'KEY_INFERRED')).toBe(false);
  });

  it('transpõe o modelo sem alterar a letra, as posições ou o tom original', () => {
    const song = parseSongText('Tom: A\nA7M        E/G#\nMinha letra');
    const transposed = transposeParsedSong(song, 2);
    const line = transposed.lines.find((item) => item.kind === 'chord-lyric');

    expect(transposed.originalKey).toBe('A');
    expect(transposed.currentKey).toBe('B');
    expect(line?.chords.map((chord) => chord.symbol)).toEqual(['B7M', 'F#/A#']);
    expect(line?.chords.map((chord) => chord.position)).toEqual([0, 11]);
    expect(line?.lyricText).toBe('Minha letra');
  });

  it('transpõe marcações inline preservando colchetes e a letra', () => {
    const song = parseSongText('Eu [C] canto [Am] aqui');
    const transposed = transposeParsedSong(song, 2);

    expect(transposed.lines[0]?.reconstructedText).toBe('Eu [D] canto [Bm] aqui');
    expect(transposed.lines[0]?.text).toBe('Eu  canto  aqui');
  });

  it('marca entrada vazia como erro explícito', () => {
    const song = parseSongText(' \t\r\n');

    expect(song.valid).toBe(false);
    expect(song.diagnostics[0]?.code).toBe('EMPTY_INPUT');
    expect(song.report.errorCount).toBe(1);
  });
});
