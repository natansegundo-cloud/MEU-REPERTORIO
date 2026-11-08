import { ArrowLeft, FileUp, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { parseSongText } from '@/features/parser';
import { extractBatchDocument, segmentBatchDocument, type BatchSegment } from '@/import';
import { importSongsBatch } from '@/services';

import styles from './BatchImportPage.module.css';

interface ReviewItem extends BatchSegment {
  selected: boolean;
}

interface BatchImportPageProps {
  readonly onBack: () => void;
  readonly onCompleted: (count: number) => void;
}

function withKey(content: string, key: string): string {
  const value = key.trim();
  if (!value) return content;
  if (/^\s*Tom\s*:/imu.test(content))
    return content.replace(/^\s*Tom\s*:\s*.*$/imu, `Tom: ${value}`);
  return `Tom: ${value}\n${content}`;
}

export function BatchImportPage({ onBack, onCompleted }: BatchImportPageProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [documentWarnings, setDocumentWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = useMemo(() => items.filter((item) => item.selected).length, [items]);

  async function handleFile(file: File): Promise<void> {
    setReading(true);
    setError(null);
    setItems([]);
    setDocumentWarnings([]);
    setFileName(file.name);
    try {
      const document = await extractBatchDocument(file);
      const result = segmentBatchDocument(document);
      setDocumentWarnings([...document.extractionWarnings, ...result.warnings]);
      setItems(
        result.segments.map((segment) => ({
          ...segment,
          selected: Boolean(segment.content.trim()),
        })),
      );
      if (result.segments.length === 0) setError('Nenhuma música foi encontrada para revisar.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler o arquivo.');
    } finally {
      setReading(false);
    }
  }

  function update(index: number, changes: Partial<ReviewItem>): void {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
    );
  }

  async function save(): Promise<void> {
    const selected = items.filter((item) => item.selected && item.content.trim());
    if (selected.length === 0) {
      setError('Selecione pelo menos uma música com conteúdo.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await importSongsBatch(
        selected.map((item) => ({
          content: withKey(item.content, item.originalKey ?? ''),
          ...(item.title ? { title: item.title } : {}),
          ...(item.artist ? { artist: item.artist } : {}),
        })),
      );
      onCompleted(result.saved.length);
      if (result.saved.length === 0 && result.duplicates.length > 0)
        setError('Todas as músicas selecionadas já existem na biblioteca.');
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'A restauração do lote falhou; nada foi salvo.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Voltar para a biblioteca
      </button>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Importação local</p>
        <h1 className={styles.title}>Importar músicas em lote</h1>
        <p className={styles.description}>
          Carregue um PDF ou DOCX, revise cada bloco e confirme antes de salvar.
        </p>
      </header>
      <div className={styles.picker}>
        <label>
          <FileUp size={17} /> Arquivo PDF ou DOCX
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={reading || saving}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
        {reading ? <p className={styles.muted}>Lendo {fileName || 'arquivo'}…</p> : null}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          <TriangleAlert size={17} /> {error}
        </p>
      ) : null}
      {documentWarnings.length > 0 ? (
        <div className={styles.feedback} role="status">
          <strong>Avisos para revisão</strong>
          <ul>
            {documentWarnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {items.length > 0 ? (
        <>
          <div className={styles.summary}>
            <span>{items.length} blocos encontrados</span>
            <span>{selectedCount} selecionados</span>
            <button
              type="button"
              onClick={() =>
                setItems((current) => current.map((item) => ({ ...item, selected: true })))
              }
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={() =>
                setItems((current) => current.map((item) => ({ ...item, selected: false })))
              }
            >
              Limpar seleção
            </button>
          </div>
          <div className={styles.list}>
            {items.map((item, index) => {
              const parsed = parseSongText(withKey(item.content, item.originalKey ?? ''));
              const warnings = [
                ...item.warnings,
                ...parsed.diagnostics
                  .filter((diagnostic) => diagnostic.severity === 'warning')
                  .map((diagnostic) => diagnostic.message),
              ];
              return (
                <article className={styles.card} key={item.id}>
                  <div className={styles.cardHeader}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) => update(index, { selected: event.target.checked })}
                      aria-label={`Selecionar ${item.title ?? `bloco ${index + 1}`}`}
                    />
                    <span className={styles.cardTitle}>
                      Bloco {index + 1} · páginas {item.pageNumbers.join(', ')}
                    </span>
                  </div>
                  <div className={styles.grid}>
                    <label>
                      Título
                      <input
                        value={item.title ?? ''}
                        onChange={(event) => update(index, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      Artista
                      <input
                        value={item.artist ?? ''}
                        onChange={(event) => update(index, { artist: event.target.value })}
                      />
                    </label>
                    <label>
                      Tom
                      <input
                        value={item.originalKey ?? ''}
                        onChange={(event) => update(index, { originalKey: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className={styles.content}>
                    <label>
                      Conteúdo
                      <textarea
                        value={item.content}
                        onChange={(event) => update(index, { content: event.target.value })}
                      />
                    </label>
                  </div>
                  {warnings.length > 0 ? (
                    <ul className={styles.warnings}>
                      {warnings.map((warning, warningIndex) => (
                        <li key={`${warning}-${warningIndex}`}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onBack} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={saving || selectedCount === 0}>
              {saving
                ? 'Salvando…'
                : `Salvar ${selectedCount} música${selectedCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
