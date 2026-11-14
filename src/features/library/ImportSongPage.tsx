import { ArrowLeft, ClipboardPaste, FileUp, Info, TriangleAlert } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { parseSongText } from '@/features/parser';
import { extractPdfDocument, readTextFile } from '@/import';
import { importSong, SongImportError } from '@/services';
import type { ParserDiagnostic, Song } from '@/types';

import styles from './ImportSongPage.module.css';

interface ImportSongPageProps {
  readonly onBack: () => void;
  readonly onImported: (song: Song) => void;
  readonly onBatch: () => void;
}

function diagnosticLabel(diagnostic: ParserDiagnostic): string {
  const location = diagnostic.lineNumber ? `Linha ${diagnostic.lineNumber}: ` : '';
  return `${location}${diagnostic.message}`;
}

interface WarningGroup {
  readonly code: ParserDiagnostic['code'];
  readonly message: string;
  readonly lineNumbers: readonly number[];
}

function groupWarnings(diagnostics: readonly ParserDiagnostic[]): WarningGroup[] {
  const groups = new Map<
    string,
    { code: ParserDiagnostic['code']; message: string; lineNumbers: Set<number> }
  >();
  for (const item of diagnostics) {
    if (item.severity !== 'warning') continue;
    const key = `${item.code}:${item.message}`;
    const group = groups.get(key) ?? {
      code: item.code,
      message: item.message,
      lineNumbers: new Set<number>(),
    };
    if (item.lineNumber !== null) group.lineNumbers.add(item.lineNumber);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    code: group.code,
    message: group.message,
    lineNumbers: [...group.lineNumbers].sort((left, right) => left - right),
  }));
}

function replaceOrAddKey(input: string, key: string): string {
  const keyLine = `Tom: ${key}`;
  if (/^\s*Tom\s*:/imu.test(input)) {
    return input.replace(/^\s*Tom\s*:\s*.*$/imu, keyLine);
  }
  return `${keyLine}\n${input}`;
}

function fallbackPdfMetadata(fileName: string): { title: string | null; artist: string | null } {
  const baseName = fileName
    .replace(/\.(?:txt|pdf)$/iu, '')
    .replace(/\s+-\s+cifra\s+club\s*$/iu, '')
    .trim();
  const parts = baseName
    .split(/\s+-\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    title: parts[0] ?? (baseName || null),
    artist: parts.length > 1 ? parts.slice(1).join(' - ') : null,
  };
}

function WarningSummary({ diagnostics }: { readonly diagnostics: readonly ParserDiagnostic[] }) {
  const groups = useMemo(() => groupWarnings(diagnostics), [diagnostics]);
  const [showAll, setShowAll] = useState(false);
  if (groups.length === 0) return null;

  const visibleGroups = showAll ? groups : groups.slice(0, 3);
  return (
    <div className={styles.warningSummary} role="status" aria-label="Avisos da importação">
      <TriangleAlert size={18} aria-hidden="true" />
      <div>
        <strong>Avisos para revisar</strong>
        <div className={styles.warningGroups}>
          {visibleGroups.map((group) => (
            <details key={`${group.code}-${group.message}`}>
              <summary>
                {group.lineNumbers.length > 1
                  ? `Mesmo aviso em ${group.lineNumbers.length} linhas`
                  : diagnosticLabel({
                      ...group,
                      lineNumber: group.lineNumbers[0] ?? null,
                      column: null,
                      severity: 'warning',
                      sourceText: null,
                    })}
              </summary>
              <p>{group.message}</p>
              {group.lineNumbers.length > 0 ? (
                <small>Linhas: {group.lineNumbers.join(', ')}</small>
              ) : null}
            </details>
          ))}
        </div>
        {groups.length > 3 ? (
          <button
            className={styles.showWarnings}
            type="button"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? 'Ocultar avisos' : `Ver todos (${groups.length})`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ImportSongPage({ onBack, onImported, onBatch }: ImportSongPageProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [notes, setNotes] = useState('');
  const [keyDraft, setKeyDraft] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDiagnostics, setErrorDiagnostics] = useState<readonly ParserDiagnostic[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const parsedPreview = useMemo(() => (content.trim() ? parseSongText(content) : null), [content]);

  async function handleFile(file: File): Promise<void> {
    setIsReadingFile(true);
    setErrorDiagnostics([]);
    setFeedback(null);
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/iu.test(file.name);
      const pdfDocument = isPdf ? await extractPdfDocument(file) : null;
      const text = pdfDocument?.text ?? (await readTextFile(file));
      const preview = parseSongText(text);
      setContent(text);
      setKeyDraft(null);
      const fallback = isPdf
        ? fallbackPdfMetadata(file.name)
        : { title: file.name.replace(/\.(?:txt|pdf)$/iu, ''), artist: null };
      if (!title.trim()) {
        setTitle(pdfDocument?.title ?? preview.title ?? fallback.title ?? '');
      }
      if (!artist.trim()) setArtist(pdfDocument?.artist ?? preview.artist ?? fallback.artist ?? '');
      if (!notes.trim() && pdfDocument?.notes) setNotes(pdfDocument.notes);
      setFeedback(
        isPdf
          ? 'Texto do PDF extraído. Revise antes de salvar.'
          : 'Texto carregado. Revise antes de salvar.',
      );
    } catch (cause: unknown) {
      setErrorDiagnostics([
        {
          severity: 'error',
          code: 'PARTIAL_PARSE',
          message: cause instanceof Error ? cause.message : 'Não foi possível ler o arquivo.',
          lineNumber: null,
          column: null,
          sourceText: null,
        },
      ]);
    } finally {
      setIsReadingFile(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;

    setFeedback(null);
    setErrorDiagnostics([]);
    setIsSubmitting(true);

    try {
      const parsedKey = parsedPreview?.originalKey ?? null;
      const importContent =
        keyDraft && keyDraft.trim() && keyDraft.trim() !== parsedKey
          ? replaceOrAddKey(content, keyDraft.trim())
          : content;
      const song = await importSong(importContent, { title, artist, notes });
      const warnings = song.structure.diagnostics.filter((item) => item.severity === 'warning');
      setFeedback(
        warnings.length > 0
          ? `Música importada com ${warnings.length} aviso${warnings.length === 1 ? '' : 's'}.`
          : 'Música importada com sucesso.',
      );
      onImported(song);
    } catch (cause: unknown) {
      if (cause instanceof SongImportError) {
        setErrorDiagnostics(cause.parsed.diagnostics.filter((item) => item.severity === 'error'));
      } else {
        setErrorDiagnostics([
          {
            severity: 'error',
            code: 'PARTIAL_PARSE',
            message: cause instanceof Error ? cause.message : 'Não foi possível importar a música.',
            lineNumber: null,
            column: null,
            sourceText: null,
          },
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        Voltar para a biblioteca
      </button>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Nova música</p>
          <h1 className={styles.title}>Importar cifra</h1>
          <p className={styles.description}>
            Cole o conteúdo completo. O parser identifica as cifras, o tom e os metadados
            automaticamente.
          </p>
        </div>
      </header>

      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <div className={styles.metadata}>
          <label>
            <span>
              Título <small>(opcional)</small>
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Uma Vez Mais"
            />
          </label>
          <label>
            <span>
              Artista <small>(opcional)</small>
            </span>
            <input
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              placeholder="Ex.: Natiruts"
            />
          </label>
          <label>
            <span>
              Tom original <small>(opcional)</small>
            </span>
            <input
              value={keyDraft ?? parsedPreview?.originalKey ?? ''}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder="Ex.: Gm"
            />
            {parsedPreview?.metadata.originalKeyInferred ? (
              <small className={styles.inferredKey}>
                Tom sugerido: {parsedPreview.originalKey} — confirme
              </small>
            ) : null}
          </label>
        </div>

        <label className={styles.contentField}>
          <span className={styles.fieldHeading}>
            <ClipboardPaste size={17} />
            Letra e cifras
          </span>
          <textarea
            required
            value={content}
            onChange={(event) => {
              const value = event.target.value;
              setContent(value);
              setKeyDraft(null);
              if (title.trim() && artist.trim()) return;
              const preview = value.trim() ? parseSongText(value) : null;
              if (!preview) return;
              if (!title.trim()) setTitle(preview.title ?? '');
              if (!artist.trim()) setArtist(preview.artist ?? '');
            }}
            placeholder={'Cole aqui a cifra completa…\n\nTom: A\nA7M        E/G#\nMinha letra'}
            rows={16}
          />
        </label>
        <Button
          variant="secondary"
          type="button"
          onClick={onBatch}
          disabled={isSubmitting || isReadingFile}
        >
          Abrir importação em lote (PDF ou DOCX)
        </Button>
        <label className={styles.notesField}>
          <span>
            Observações <small>(opcional)</small>
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Composição, afinação ou outras informações"
            rows={3}
          />
        </label>
        <WarningSummary diagnostics={parsedPreview?.diagnostics ?? []} />
        <label className={styles.filePicker}>
          <FileUp size={17} />
          <span>{isReadingFile ? 'Lendo arquivo…' : 'Carregar TXT ou PDF'}</span>
          <input
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            disabled={isReadingFile}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>

        {errorDiagnostics.length > 0 ? (
          <div className={styles.diagnostics} role="alert">
            <TriangleAlert size={18} />
            <div>
              <strong>A música não foi salva.</strong>
              <ul>
                {errorDiagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${index}`}>{diagnosticLabel(diagnostic)}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {feedback ? (
          <p className={styles.success} role="status">
            <Info size={17} />
            {feedback}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? 'Importando…' : 'Importar música'}
          </Button>
        </div>
      </form>
    </div>
  );
}
