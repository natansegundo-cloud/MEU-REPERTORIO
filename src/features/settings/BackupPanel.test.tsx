import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BackupFile } from '@/services';

vi.mock('@/services', () => ({
  createBackup: vi.fn(),
  downloadTextFile: vi.fn(),
  planRestore: vi.fn(),
  readBackupFile: vi.fn(),
  restoreBackup: vi.fn(),
  serializeBackup: vi.fn().mockReturnValue('{}'),
}));

import { createBackup, downloadTextFile } from '@/services';

import { BackupPanel } from './BackupPanel';

function makeBackup(): BackupFile {
  return {
    format: 'meu-repertorio-backup',
    version: 1,
    application: 'Meu Repertório V2',
    createdAt: '2026-11-12T12:00:00.000Z',
    data: {
      songs: [],
      repertories: [],
      repertoryItems: [],
      favorites: [],
      preferences: [],
      settings: [],
    },
    integrity: { algorithm: 'SHA-256', digest: 'digest' },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BackupPanel', () => {
  it('impede duas exportações simultâneas mesmo antes do botão ser desabilitado', async () => {
    let finishExport: (() => void) | undefined;
    vi.mocked(createBackup).mockImplementationOnce(
      () =>
        new Promise<BackupFile>((resolve) => {
          finishExport = () => resolve(makeBackup());
        }),
    );
    render(<BackupPanel />);

    const exportButton = screen.getByRole('button', { name: 'Exportar biblioteca' });
    act(() => {
      exportButton.click();
      exportButton.click();
    });

    expect(createBackup).toHaveBeenCalledTimes(1);

    finishExport?.();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Backup exportado com 0 música(s)'),
    );
    expect(downloadTextFile).toHaveBeenCalledTimes(1);
  });
});
