import { describe, expect, it } from 'vitest';

import { parseSongText } from '@/features/parser';

import { segmentBatchDocument, type BatchDocument } from './batch';
import { reconstructPdfPageTexts, type PdfPageInput } from './pdf';

const ZWSP = '\u200b';
const BOM = '\ufeff';
const EM_SEPARATOR = `\u2014${'-'.repeat(45)}`;

function document(text: string, pages?: readonly string[]): BatchDocument {
  const sourcePages = pages ?? [text];
  return {
    kind: 'docx',
    fileName: 'regressao.docx',
    pages: sourcePages.map((page, index) => ({ pageNumber: index + 1, text: page })),
    text: sourcePages.join('\n\n'),
    extractionWarnings: [],
  };
}

interface SongFixture {
  readonly title: string;
  readonly artist: string;
  readonly key: string;
  readonly secondChord: string;
  readonly firstLyric: string;
  readonly secondLyric: string;
}

/**
 * Reproduz a forma do DOCX real: cada parágrafo vira uma linha, o corpo começa
 * com U+200B e as músicas são separadas por uma linha de travessão + hífens.
 */
function song({ title, artist, key, secondChord, firstLyric, secondLyric }: SongFixture): string {
  return [
    title,
    '',
    artist,
    '',
    ' ',
    '',
    `Tom: ${key}`,
    '',
    ' ',
    '',
    `${ZWSP}${key}     ${secondChord}`,
    '',
    `${ZWSP}     ${firstLyric}`,
    '',
    `${ZWSP}${secondChord}     ${key}`,
    '',
    `${ZWSP}     ${secondLyric}`,
  ].join('\n');
}

function documentWithSeparators(songs: readonly SongFixture[]): string {
  return songs.map(song).join(`\n${EM_SEPARATOR}\n`);
}

function titlesOf(segments: readonly { title: string | null }[]): (string | null)[] {
  return segments.map((segment) => segment.title);
}

const REPERTOIRE: readonly SongFixture[] = [
  {
    title: 'Andei Só',
    artist: 'Natiruts',
    key: 'C#m',
    secondChord: 'G#m7',
    firstLyric: 'Preciso demonstrar pra ela',
    secondLyric: 'Que mereço seu tempo pra dizer',
  },
  {
    title: 'Deriram',
    artist: 'Natiruts',
    key: 'A',
    secondChord: 'F#m7',
    firstLyric: 'Acredite em seus desejos',
    secondLyric: 'Deixe o tempo te levar',
  },
  {
    title: 'Em Paz',
    artist: 'Natiruts',
    key: 'F',
    secondChord: 'Dm7',
    firstLyric: 'Em paz eu quero estar',
    secondLyric: 'Com o sol a brilhar',
  },
  {
    title: 'Eu e Ela / Waiting in Vain',
    artist: 'Natiruts',
    key: 'D',
    secondChord: 'Bm7',
    firstLyric: 'Eu e ela na varanda',
    secondLyric: 'Waiting in vain for you',
  },
  {
    title: 'Glamour Tropical',
    artist: 'Natiruts',
    key: 'Em',
    secondChord: 'C7M',
    firstLyric: 'Glamour tropical',
    secondLyric: 'No calor do verão',
  },
  {
    title: 'Iluminar',
    artist: 'Natiruts',
    key: 'C',
    secondChord: 'Am7',
    firstLyric: 'Quero iluminar',
    secondLyric: 'O caminho de quem vem',
  },
  {
    title: 'A Cor do Mar',
    artist: 'Natiruts',
    key: 'A',
    secondChord: 'E7(9)',
    firstLyric: 'A cor do mar me lembra você',
    secondLyric: 'E o vento traz o seu nome',
  },
  {
    title: 'Pedras Escondidas',
    artist: 'Natiruts',
    key: 'Bb',
    secondChord: 'Gm7',
    firstLyric: 'Pedras escondidas no caminho',
    secondLyric: 'Mas eu sigo sem parar',
  },
  {
    title: 'Me Namora',
    artist: 'Natiruts',
    key: 'G',
    secondChord: 'Em7',
    firstLyric: 'Me namora outra vez',
    secondLyric: 'Fica aqui mais um pouco',
  },
  {
    title: 'Naticongo',
    artist: 'Natiruts',
    key: 'C',
    secondChord: 'F7M',
    firstLyric: 'Naticongo chegou',
    secondLyric: 'Trazendo alegria pra nós',
  },
  {
    title: 'Presente De Um Beija-Flor',
    artist: 'Natiruts',
    key: 'Ebm',
    secondChord: 'Bbm7',
    firstLyric: 'Um beija-flor me visitou',
    secondLyric: 'E deixou o seu recado',
  },
  {
    title: 'Verbalize',
    artist: 'Natiruts',
    key: 'Bb',
    secondChord: 'F7',
    firstLyric: 'Verbalize o que sente',
    secondLyric: 'Não guarde isso pra você',
  },
];

describe('regressão da importação em lote', () => {
  it('reconhece 12 músicas com U+200B, separadores tipográficos e ordem preservada', () => {
    const source = documentWithSeparators(REPERTOIRE);
    const result = segmentBatchDocument(document(source));

    expect(result.usedExplicitSeparators).toBe(true);
    expect(result.segments).toHaveLength(REPERTOIRE.length);
    expect(titlesOf(result.segments)).toEqual(REPERTOIRE.map((item) => item.title));
    expect(result.segments.map((segment) => segment.artist)).toEqual(
      REPERTOIRE.map((item) => item.artist),
    );
    expect(result.segments.map((segment) => segment.originalKey)).toEqual(
      REPERTOIRE.map((item) => item.key),
    );

    result.segments.forEach((segment, index) => {
      const expected = REPERTOIRE[index];
      expect(segment.content).not.toContain(ZWSP);
      expect(segment.content).not.toContain(EM_SEPARATOR);
      expect(segment.content).toContain(expected?.firstLyric);
      expect(segment.content).toContain(expected?.secondLyric);
      expect(segment.content).not.toContain(REPERTOIRE[index + 1]?.firstLyric ?? ZWSP);
    });

    const parsed = result.segments.map((segment) => parseSongText(segment.content));
    expect(parsed.every((song) => song.valid)).toBe(true);
    expect(parsed.map((song) => song.title)).toEqual(REPERTOIRE.map((item) => item.title));
    expect(parsed.map((song) => song.artist)).toEqual(REPERTOIRE.map((item) => item.artist));
    expect(parsed.map((song) => song.originalKey)).toEqual(REPERTOIRE.map((item) => item.key));
    expect(parsed.every((song) => song.report.chordCount > 0)).toBe(true);
  });

  it('reconhece duas músicas separadas por hífens explícitos', () => {
    const first = song(REPERTOIRE[0]!);
    const second = song(REPERTOIRE[1]!);
    const result = segmentBatchDocument(document(`${first}\n---------------------\n${second}`));

    expect(result.usedExplicitSeparators).toBe(true);
    expect(result.segments).toHaveLength(2);
    expect(result.segments.map((segment) => segment.title)).toEqual(['Andei Só', 'Deriram']);
    expect(result.segments.map((segment) => segment.originalKey)).toEqual(['C#m', 'A']);
  });

  it('reconhece cinco músicas sem separadores explícitos usando cabeçalhos completos', () => {
    const songs = REPERTOIRE.slice(0, 5);
    const source = songs
      .map(({ title, artist, key, secondChord, firstLyric, secondLyric }) =>
        [
          title,
          artist,
          `Tom: ${key}`,
          '',
          `${key} ${secondChord}`,
          firstLyric,
          `${secondChord} ${key}`,
          secondLyric,
        ].join('\n'),
      )
      .join('\n\n');
    const result = segmentBatchDocument(document(source));

    expect(result.usedExplicitSeparators).toBe(false);
    expect(result.segments).toHaveLength(5);
    expect(titlesOf(result.segments)).toEqual(songs.map((item) => item.title));
    expect(result.segments.map((segment) => segment.originalKey)).toEqual(
      songs.map((item) => item.key),
    );
    expect(result.segments.every((segment) => segment.warnings.length > 0)).toBe(true);
  });

  it('mantém um único bloco quando não há evidência suficiente para dividir', () => {
    const result = segmentBatchDocument(
      document(
        [
          'Primeira canção',
          'C G',
          'Uma letra qualquer',
          '',
          'Segunda canção',
          'Am F',
          'Outra letra qualquer',
        ].join('\n'),
      ),
    );

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]?.content).toContain('Primeira canção');
    expect(result.segments[0]?.content).toContain('Outra letra qualquer');
  });

  it('não confunde títulos com nomes de acordes com linhas de cifra', () => {
    const source = [song(REPERTOIRE[2]!), EM_SEPARATOR, `${BOM}${song(REPERTOIRE[6]!)}`].join('\n');
    const result = segmentBatchDocument(document(source));

    expect(result.segments).toHaveLength(2);
    expect(result.segments.map((segment) => segment.title)).toEqual(['Em Paz', 'A Cor do Mar']);
    expect(result.segments[0]?.content.startsWith('Em Paz')).toBe(true);
    expect(result.segments[1]?.content.startsWith('A Cor do Mar')).toBe(true);
  });

  it('preserva conteúdo musical extenso sem dividir ou truncar', () => {
    const lyrics = Array.from({ length: 60 }, (_, index) => `Verso longo número ${index + 1}`);
    const body = lyrics
      .map((lyric, index) => [`${ZWSP}${index % 2 === 0 ? 'C' : 'G'}`, `${ZWSP}  ${lyric}`])
      .flat()
      .join('\n\n');
    const source = [
      'Canção Extensa',
      '',
      'Artista Longo',
      '',
      `Tom: C`,
      '',
      body,
      EM_SEPARATOR,
      song(REPERTOIRE[0]!),
    ].join('\n');
    const result = segmentBatchDocument(document(source));

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]?.title).toBe('Canção Extensa');
    expect(result.segments[0]?.content).toContain('Verso longo número 60');
    expect(result.segments[0]?.content).not.toContain('Preciso demonstrar pra ela');
  });

  it('lida com estruturas diferentes no mesmo documento', () => {
    const result = segmentBatchDocument(
      document(
        [
          song(REPERTOIRE[0]!),
          EM_SEPARATOR,
          'Título: Canção Rotulada',
          'Artista: Outra Banda',
          'Tom: E',
          'E A',
          'Letra rotulada',
          EM_SEPARATOR,
          'Somente Título',
          '',
          'C G',
          'Letra sem artista nem tom',
        ].join('\n'),
      ),
    );

    expect(result.segments).toHaveLength(3);
    expect(result.segments.map((segment) => segment.title)).toEqual([
      'Andei Só',
      'Canção Rotulada',
      'Somente Título',
    ]);
    expect(result.segments[1]).toMatchObject({
      artist: 'Outra Banda',
      originalKey: 'E',
    });
    expect(result.segments[2]).toMatchObject({ artist: null, originalKey: null });
    expect(result.segments[2]?.content).toContain('Letra sem artista nem tom');
  });

  it('avisa quando um bloco concatenou mais de um tom ou título', () => {
    const result = segmentBatchDocument(
      document(
        [
          'Primeira',
          'Artista',
          'Tom: C',
          'C G',
          'Letra',
          'Tom: G',
          'G D',
          'Outra letra',
          '----------------',
          'Título: Segunda',
          'Título: Terceira',
          'Artista',
          'Tom: D',
          'D A',
          'Final',
        ].join('\n'),
      ),
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]?.warnings).toContain(
      'Este bloco contém mais de um tom; ele pode ter concatenado músicas.',
    );
    expect(result.segments[1]?.warnings).toContain(
      'Este bloco contém mais de um título; ele pode ter concatenado músicas.',
    );
  });

  it('não deixa uma letra seguida de “(refrão)” virar cabeçalho e aceita intro entre parênteses', () => {
    const source = [
      'Au de Cabeça',
      'Natiruts',
      'Tom: Fm',
      '',
      'A#m7  Fm7(9)',
      'Vou rezar aos céus e vou pedir',
      '',
      'Caraíva',
      'Natiruts',
      'Tom: B',
      '',
      '(intro 2x) riff',
      '',
      'G#m  F#',
      'Comemorar o luar que fez',
      '',
      'Será que ainda há tempo para proteger',
      '',
      '(refrão)',
      'E7+  F#',
      'Sinta ainda, o céu tocar você',
      '',
      'Dois Planetas',
      'Natiruts',
      'Tom: Gm',
      '',
      '[Intro] Gm  Dm7  Cm7',
      'Gm  Dm7  Cm7',
      'Dois planetas gêmeos e no meio um coração',
    ].join('\n');
    const result = segmentBatchDocument(document(source));

    expect(result.usedExplicitSeparators).toBe(false);
    expect(result.segments).toHaveLength(3);
    expect(result.segments.map((segment) => segment.title)).toEqual([
      'Au de Cabeça',
      'Caraíva',
      'Dois Planetas',
    ]);
    expect(result.segments.map((segment) => segment.originalKey)).toEqual(['Fm', 'B', 'Gm']);
    expect(result.segments[1]?.content).toContain('(intro 2x) riff');
    expect(result.segments[1]?.content).toContain('(refrão)');
    expect(result.segments[2]?.content).toContain('[Intro] Gm  Dm7  Cm7');
    expect(result.segments.flatMap((segment) => segment.content).join('\n')).toContain(
      'Será que ainda há tempo para proteger',
    );
  });

  it('reconhece progressões entre parênteses sem tratá-las como título', () => {
    const source = [
      'Primeira Canção',
      'Artista Um',
      'Tom: C',
      '',
      '( C  G  Am  F )',
      'Letra da primeira canção',
      '',
      'Segunda Canção',
      'Artista Dois',
      'Tom: D',
      '',
      '( Bb7M  Eb7M )',
      'Letra da segunda canção',
    ].join('\n');
    const result = segmentBatchDocument(document(source));

    expect(result.segments).toHaveLength(2);
    expect(result.segments.map((segment) => segment.title)).toEqual([
      'Primeira Canção',
      'Segunda Canção',
    ]);
    expect(result.segments[0]?.content).toContain('( C  G  Am  F )');
    expect(result.segments[1]?.content).toContain('( Bb7M  Eb7M )');
  });

  it('mantém músicas que atravessam páginas com cabeçalho repetido', () => {
    const first = { ...REPERTOIRE[0]!, artist: 'Banda Um' };
    const second = { ...REPERTOIRE[1]!, artist: 'Banda Dois' };
    const page = (pageNumber: number, fixture: SongFixture): PdfPageInput => {
      const lines = ['CIFRAS - NATIRUTS', String(pageNumber), ...song(fixture).split('\n')].filter(
        (line) => line.trim(),
      );
      return {
        width: 595,
        items: lines.map((text, index) => ({
          str: text.replace(ZWSP, ''),
          transform: [1, 0, 0, 1, 40, 800 - index * 20],
          width: text.length * 6,
        })),
      };
    };
    const pages = reconstructPdfPageTexts([page(1, first), page(2, second)]).map(
      (item) => item.text,
    );
    const result = segmentBatchDocument(document('', pages));

    expect(result.segments).toHaveLength(2);
    expect(result.segments.map((segment) => segment.title)).toEqual(['Andei Só', 'Deriram']);
    expect(result.segments.map((segment) => segment.pageNumbers)).toEqual([[1], [2]]);
    expect(result.segments[0]?.content).not.toContain('CIFRAS - NATIRUTS');
  });
});
