import { Archive, Download, FileJson, RefreshCw, Upload } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/Button';
import {
  createBackup,
  downloadTextFile,
  planRestore,
  readBackupFile,
  restoreBackup,
  serializeBackup,
  type BackupFile,
  type BackupTableName,
  type RestoreMode,
  type RestorePlan,
  type RestoreProgress,
} from '@/services';

import styles from './BackupPanel.module.css';

interface RestorePreview {
  readonly backup: BackupFile;
  readonly plan: RestorePlan;
  readonly fileName: string;
}

const TABLE_LABELS: Record<BackupTableName, string> = {
  songs: 'Músicas',
  repertories: 'Repertórios',
  repertoryItems: 'Itens de repertório',
  favorites: 'Favoritos',
  preferences: 'Preferências',
  settings: 'Configurações locais',
};

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatBackupDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'data desconhecida';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function progressLabel(progress: RestoreProgress | null): string {
  if (!progress) return '';
  return `Restaurando ${TABLE_LABELS[progress.table].toLocaleLowerCase('pt-BR')} (${progress.tableIndex}/${progress.tableCount})…`;
}

export function BackupPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const backup = await createBackup();
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(
        serializeBackup(backup),
        `meu-repertorio-backup-${date}.json`,
        'application/json;charset=utf-8',
      );
      setFeedback(
        `Backup exportado com ${formatCount(backup.data.songs.length)} música(s) e ${formatCount(backup.data.repertories.length)} repertório(s).`,
      );
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível exportar o backup.',
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPreview(null);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const backup = await readBackupFile(file);
      const plan = await planRestore(backup);
      setPreview({ backup, plan, fileName: file.name });
      setRestoreMode('merge');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível validar o backup.',
      );
    }
  }

  async function handleRestore(): Promise<void> {
    if (!preview || isRestoring) return;
    if (
      restoreMode === 'replace-conflicts' &&
      preview.plan.conflictCount > 0 &&
      !window.confirm(
        `Substituir ${formatCount(preview.plan.conflictCount)} conflito(s) pelos dados do backup?`,
      )
    ) {
      return;
    }

    setIsRestoring(true);
    setFeedback(null);
    setErrorMessage(null);
    setProgress(null);
    try {
      const result = await restoreBackup(preview.backup, restoreMode, {
        onProgress: setProgress,
      });
      setFeedback(
        `Restauração concluída: ${formatCount(result.added)} adicionado(s), ${formatCount(result.overwritten)} substituído(s), ${formatCount(result.conflicts)} conflito(s) preservado(s).`,
      );
      const updatedPlan = await planRestore(preview.backup);
      setPreview({ ...preview, plan: updatedPlan });
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível restaurar o backup. A biblioteca original foi preservada.',
      );
    } finally {
      setIsRestoring(false);
      setProgress(null);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="backup-title">
      <div className={styles.heading}>
        <Archive size={21} aria-hidden="true" />
        <div>
          <h2 id="backup-title">Backup e restauração</h2>
          <p>Proteja sua biblioteca local sem depender de internet ou da nuvem.</p>
        </div>
      </div>

      <div className={styles.actions}>
        <Button onClick={() => void handleExport()} disabled={isExporting || isRestoring}>
          <Download size={16} />
          {isExporting ? 'Exportando…' : 'Exportar biblioteca'}
        </Button>
        <label className={styles.filePicker}>
          <Upload size={16} /> Selecionar backup
          <input
            type="file"
            accept=".json,application/json"
            disabled={isExporting || isRestoring}
            onChange={(event) => void handleFileChange(event)}
          />
        </label>
      </div>

      <div className={styles.info}>
        <FileJson size={18} aria-hidden="true" />
        <p>
          Formato JSON versionado (v1), com verificação SHA-256. O arquivo inclui músicas,
          repertórios, relações, favoritos e preferências. Tokens, sessões e chaves de sincronização
          não entram no backup.
        </p>
      </div>

      {preview ? (
        <div className={styles.preview} aria-label="Prévia do backup">
          <div>
            <strong>{preview.fileName}</strong>
            <span>Gerado em {formatBackupDate(preview.backup.createdAt)}</span>
          </div>
          <dl className={styles.summary}>
            <div>
              <dt>Registros</dt>
              <dd>{formatCount(preview.plan.total)}</dd>
            </div>
            <div>
              <dt>Novos</dt>
              <dd>{formatCount(preview.plan.newCount)}</dd>
            </div>
            <div>
              <dt>Iguais</dt>
              <dd>{formatCount(preview.plan.unchangedCount)}</dd>
            </div>
            <div>
              <dt>Conflitos</dt>
              <dd>{formatCount(preview.plan.conflictCount)}</dd>
            </div>
          </dl>
          <ul className={styles.tableSummary}>
            {preview.plan.tables.map((item) => (
              <li key={item.table}>
                <span>{TABLE_LABELS[item.table]}</span>
                <small>
                  {formatCount(item.backupCount)} registro(s) · {formatCount(item.conflictCount)}{' '}
                  conflito(s)
                </small>
              </li>
            ))}
          </ul>

          <fieldset className={styles.mode}>
            <legend>Como restaurar</legend>
            <label>
              <input
                type="radio"
                name="restore-mode"
                value="merge"
                checked={restoreMode === 'merge'}
                onChange={() => setRestoreMode('merge')}
              />
              <span>
                <strong>Mesclar com segurança (recomendado)</strong>
                <small>Adiciona ausentes e preserva conflitos existentes.</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="restore-mode"
                value="replace-conflicts"
                checked={restoreMode === 'replace-conflicts'}
                onChange={() => setRestoreMode('replace-conflicts')}
              />
              <span>
                <strong>Substituir conflitos</strong>
                <small>Atualiza somente IDs conflitantes após confirmação.</small>
              </span>
            </label>
          </fieldset>

          <Button onClick={() => void handleRestore()} disabled={isRestoring}>
            <RefreshCw size={16} />
            {isRestoring ? 'Restaurando…' : 'Restaurar backup'}
          </Button>
        </div>
      ) : null}

      {progress ? (
        <p className={styles.progress} role="status" aria-live="polite">
          {progressLabel(progress)} {formatCount(progress.processed)} de{' '}
          {formatCount(progress.total)} registros.
        </p>
      ) : null}
      {feedback ? (
        <p className={styles.success} role="status">
          {feedback}
        </p>
      ) : null}
      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
