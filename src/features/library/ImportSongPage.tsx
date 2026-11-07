import { ArrowLeft, ClipboardPaste, Info, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { importSong, SongImportError } from '@/services';
import type { ParserDiagnostic, Song } from '@/types';

import styles from './ImportSongPage.module.css';

interface ImportSongPageProps {
  readonly onBack: () => void;
  readonly onImported: (song: Song) => void;
}

function diagnosticLabel(diagnostic: ParserDiagnostic): string {
  const location = diagnostic.lineNumber ? `Linha ${diagnostic.lineNumber}: ` : '';
  return `${location}${diagnostic.message}`;
}

export function ImportSongPage({ onBack, onImported }: ImportSongPageProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDiagnostics, setErrorDiagnostics] = useState<readonly ParserDiagnostic[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;

    setFeedback(null);
    setErrorDiagnostics([]);
    setIsSubmitting(true);

    try {
      const song = await importSong(content, { title, artist });
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
        </div>

        <label className={styles.contentField}>
          <span className={styles.fieldHeading}>
            <ClipboardPaste size={17} />
            Letra e cifras
          </span>
          <textarea
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={'Cole aqui a cifra completa…\n\nTom: A\nA7M        E/G#\nMinha letra'}
            rows={16}
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
