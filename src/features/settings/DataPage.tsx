import { AlertTriangle, Download, FileDown, FileUp, HardDrive, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  type BackupDocument,
  type RestorePreview,
  downloadBackupDocument,
  exportBackup,
  getLastBackupExportedAt,
  parseBackupText,
  previewRestore,
  restoreBackup,
} from '@/backup';
import {
  createLegacySupabaseReader,
  importLegacyData,
  looksLikeLegacyBackup,
  parseLegacyBackupText,
  prepareLegacyImport,
  readLegacyIndexedDb,
  readLegacySupabase,
  type PreparedLegacyImport,
} from '@/migration';
import { requestPersistentStorage, type StoragePersistenceStatus } from '@/services';

import styles from './DataPage.module.css';

function formatDate(value: string | null): string {
  if (!value) return 'Ainda não exportado';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function Summary({ preview }: { readonly preview: RestorePreview }) {
  const rows = [
    ['Músicas', preview.songs],
    ['Repertórios', preview.repertories],
    ['Itens', preview.repertoryItems],
    ['Favoritos', preview.favorites],
    ['Preferências', preview.preferences],
  ] as const;
  return (
    <div className={styles.summary} aria-label="Resumo da restauração">
      {rows.map(([label, counts]) => (
        <div key={label}>
          <strong>{label}</strong>
          <span>
            +{counts.added} · {counts.updated} atualizados · {counts.ignored} ignorados
          </span>
        </div>
      ))}
    </div>
  );
}

interface BackupPanelProps {
  readonly onNotice: (message: string) => void;
}

function BackupPanel({ onNotice }: BackupPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [document, setDocument] = useState<BackupDocument | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge');
  const [allowResurrection, setAllowResurrection] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getLastBackupExportedAt().then(setLastExport);
  }, []);

  async function handleExport(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const backup = await exportBackup();
      setLastExport(backup.exportedAt);
      onNotice('Backup exportado com sucesso.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível exportar o backup.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File): Promise<void> {
    setBusy(true);
    setError(null);
    setDocument(null);
    setPreview(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (looksLikeLegacyBackup(parsed)) {
        throw new Error('Este é um backup da V1. Use a seção Migração da V1 abaixo.');
      }
      const backup = parseBackupText(text);
      setDocument(backup);
      setPreview(await previewRestore(backup, { strategy }));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler este arquivo.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function updateStrategy(next: 'merge' | 'replace'): Promise<void> {
    setStrategy(next);
    if (document)
      setPreview(
        await previewRestore(document, {
          strategy: next,
          allowTombstoneResurrection: allowResurrection,
        }),
      );
  }

  async function handleRestore(): Promise<void> {
    if (!document || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const result = await restoreBackup(document, {
        strategy,
        confirmation,
        allowTombstoneResurrection: allowResurrection,
        onAutomaticBackup: (backup) =>
          downloadBackupDocument(
            backup,
            `meu-repertorio-pre-substituicao-${new Date().toISOString().slice(0, 10)}.json`,
          ),
      });
      setDocument(null);
      setPreview(null);
      setConfirmation('');
      onNotice(
        `Restauração concluída: ${result.preview.songs.updated + result.preview.songs.added} música(s) processada(s).`,
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível restaurar o backup.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="backup-title">
      <div className={styles.panelHeading}>
        <HardDrive size={21} aria-hidden="true" />
        <div>
          <h2 id="backup-title">Backup local</h2>
          <p>
            Exporte cifras, repertórios, favoritos e preferências sem incluir login ou fila de
            nuvem.
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        <Button onClick={() => void handleExport()} disabled={busy}>
          <Download size={16} /> Exportar backup
        </Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          <FileUp size={16} /> Selecionar backup
        </Button>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      <p className={styles.muted}>Último backup: {formatDate(lastExport)}</p>
      {document && preview ? (
        <div className={styles.preview}>
          <h3>Resumo antes de restaurar</h3>
          <div className={styles.strategy}>
            <label>
              <input
                type="radio"
                checked={strategy === 'merge'}
                onChange={() => void updateStrategy('merge')}
              />{' '}
              Mesclar
            </label>
            <label>
              <input
                type="radio"
                checked={strategy === 'replace'}
                onChange={() => void updateStrategy('replace')}
              />{' '}
              Substituir tudo
            </label>
          </div>
          <Summary preview={preview} />
          {preview.warnings.length > 0 ? (
            <ul className={styles.warningList}>
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {preview.blockedResurrections > 0 ? (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={allowResurrection}
                onChange={(event) => {
                  setAllowResurrection(event.target.checked);
                  void (
                    document &&
                    previewRestore(document, {
                      strategy,
                      allowTombstoneResurrection: event.target.checked,
                    }).then(setPreview)
                  );
                }}
              />{' '}
              Permitir ressuscitar exclusões locais explicitamente
            </label>
          ) : null}
          {strategy === 'replace' ? (
            <label className={styles.confirm}>
              Digite SUBSTITUIR para confirmar
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
          ) : null}
          <Button
            onClick={() => void handleRestore()}
            disabled={busy || (strategy === 'replace' && confirmation !== 'SUBSTITUIR')}
          >
            <RefreshCw size={16} /> Restaurar
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          <AlertTriangle size={16} /> {error}
        </p>
      ) : null}
    </section>
  );
}

function LegacyPreview({
  prepared,
  onImported,
}: {
  readonly prepared: PreparedLegacyImport;
  readonly onImported: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function importNow(): Promise<void> {
    setBusy(true);
    try {
      const report = await importLegacyData(prepared);
      onImported(`${report.imported} registro(s) importado(s); ${report.ignored} ignorado(s).`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.preview}>
      <h3>Prévia da migração V1</h3>
      <p>{prepared.report.imported} registro(s) prontos para importar.</p>
      {typeof prepared.legacyPdfCount === 'number' ? (
        <p className={styles.muted}>
          {prepared.legacyPdfCount} PDF(s) antigo(s) encontrado(s). Eles ficam pendentes: a V2 não
          copia nem sincroniza os arquivos originais.
        </p>
      ) : null}
      {prepared.report.warnings.length > 0 ? (
        <ul className={styles.warningList}>
          {prepared.report.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {prepared.report.errors.length > 0 ? (
        <ul className={styles.errorList}>
          {prepared.report.errors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <Button onClick={() => void importNow()} disabled={busy}>
        <FileDown size={16} /> Confirmar migração
      </Button>
    </div>
  );
}

export function DataPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [legacy, setLegacy] = useState<PreparedLegacyImport | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacyBusy, setLegacyBusy] = useState(false);
  const legacyFileInput = useRef<HTMLInputElement>(null);
  const [storageStatus, setStorageStatus] = useState<StoragePersistenceStatus | null>(null);

  useEffect(() => {
    void requestPersistentStorage().then(setStorageStatus);
  }, []);

  async function readLegacyFile(file: File): Promise<void> {
    setLegacyBusy(true);
    setLegacyError(null);
    try {
      setLegacy(prepareLegacyImport(parseLegacyBackupText(await file.text())));
    } catch (cause: unknown) {
      setLegacyError(
        cause instanceof Error ? cause.message : 'Não foi possível ler o backup antigo.',
      );
    } finally {
      setLegacyBusy(false);
      if (legacyFileInput.current) legacyFileInput.current.value = '';
    }
  }

  async function readLegacyDevice(): Promise<void> {
    setLegacyBusy(true);
    setLegacyError(null);
    try {
      const payload = await readLegacyIndexedDb();
      if (!payload) throw new Error('Nenhum banco caderno-cifras foi encontrado nesta origem.');
      setLegacy(prepareLegacyImport(payload));
    } catch (cause: unknown) {
      setLegacyError(
        cause instanceof Error ? cause.message : 'Não foi possível ler o banco antigo.',
      );
    } finally {
      setLegacyBusy(false);
    }
  }

  async function readLegacyCloud(): Promise<void> {
    setLegacyBusy(true);
    setLegacyError(null);
    try {
      const reader = await createLegacySupabaseReader();
      if (!reader)
        throw new Error('Entre na conta da nuvem e configure o Supabase antes de ler a V1.');
      setLegacy(prepareLegacyImport(await readLegacySupabase(reader.client, reader.userId)));
    } catch (cause: unknown) {
      setLegacyError(
        cause instanceof Error ? cause.message : 'Não foi possível ler os dados antigos da nuvem.',
      );
    } finally {
      setLegacyBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <BackupPanel onNotice={setNotice} />
      <section className={styles.panel} aria-labelledby="legacy-title">
        <div className={styles.panelHeading}>
          <FileDown size={21} aria-hidden="true" />
          <div>
            <h2 id="legacy-title">Migração da V1</h2>
            <p>
              Leia um backup antigo, o IndexedDB local ou as tabelas antigas do Supabase. Nenhuma
              fonte antiga é alterada.
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => legacyFileInput.current?.click()}
            disabled={legacyBusy}
          >
            Importar backup V1
          </Button>
          <Button variant="secondary" onClick={() => void readLegacyDevice()} disabled={legacyBusy}>
            Ler deste dispositivo
          </Button>
          <Button variant="ghost" onClick={() => void readLegacyCloud()} disabled={legacyBusy}>
            Ler nuvem antiga
          </Button>
          <input
            ref={legacyFileInput}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readLegacyFile(file);
            }}
          />
        </div>
        {legacy ? <LegacyPreview prepared={legacy} onImported={setNotice} /> : null}
        {legacyError ? (
          <p className={styles.error} role="alert">
            {legacyError}
          </p>
        ) : null}
      </section>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      <p className={styles.version}>Versão {__APP_VERSION__}</p>
      <p className={styles.storage} role="status">
        Armazenamento local:{' '}
        {storageStatus === 'persisted'
          ? 'protegido contra limpeza automática.'
          : storageStatus === 'not-persisted'
            ? 'o navegador não confirmou proteção persistente.'
            : storageStatus === 'unsupported'
              ? 'persistência não disponível neste navegador.'
              : 'verificando proteção persistente…'}
      </p>
    </div>
  );
}
