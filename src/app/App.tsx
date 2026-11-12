import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { UpdateNotice } from '@/components/system/UpdateNotice';
import {
  BatchImportPage,
  ImportSongPage,
  LibraryPage,
  SongEditorPage,
  SongViewPage,
} from '@/features/library';
import { RepertoriesPage, RepertoryEditorPage } from '@/features/repertories';
import { ShowModePage } from '@/features/show-mode';
import { FavoritesPage } from '@/features/favorites/FavoritesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useCloudSync } from '@/sync';
import type { Song } from '@/types';

import type { SectionId } from './navigation';
import {
  FAVORITES_ROUTE,
  LIBRARY_ROUTE,
  REPERTORIES_ROUTE,
  sectionForRoute,
  sectionRoute,
  type AppRoute,
} from './routes';
import { useAppRouter } from './useAppRouter';
import styles from './App.module.css';

const UNSAVED_CHANGES_MESSAGE = 'Existem alterações não salvas. Sair mesmo assim?';

export function App() {
  useCloudSync();
  const editorDirty = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    editorDirty.current = dirty;
  }, []);

  const confirmEditorExit = useCallback((): boolean => {
    if (!editorDirty.current) return true;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) return false;
    editorDirty.current = false;
    return true;
  }, []);

  const routeGuard = useCallback(
    (next: AppRoute, current: AppRoute): boolean => {
      if (
        next.name === 'song-edit' &&
        current.name === 'song-edit' &&
        next.songId === current.songId &&
        next.origin === current.origin
      ) {
        return true;
      }
      return confirmEditorExit();
    },
    [confirmEditorExit],
  );

  const router = useAppRouter(routeGuard);
  const { route } = router;
  const activeSection = sectionForRoute(route);

  useEffect(() => {
    const handleUpdate = (): void => setUpdateAvailable(true);
    window.addEventListener('pwa:need-refresh', handleUpdate);
    return () => window.removeEventListener('pwa:need-refresh', handleUpdate);
  }, []);

  function handleSectionChange(section: SectionId): void {
    if (!confirmEditorExit()) return;
    router.navigate(sectionRoute(section));
  }

  function handleImported(song: Song): void {
    const warnings = song.structure.diagnostics
      .filter((item) => item.severity === 'warning')
      .map((item) => item.message);
    const warningSuffix = warnings.length > 0 ? ` Avisos: ${warnings.join(' ')}` : '';
    setNotice(`“${song.title}” foi adicionada à biblioteca.${warningSuffix}`);
    router.back(LIBRARY_ROUTE);
  }

  function handleExitShow(repertoryId: string): void {
    router.back({ name: 'repertory', repertoryId });
  }

  if (route.name === 'show') {
    return (
      <ShowModePage
        key={route.repertoryId}
        repertoryId={route.repertoryId}
        requestedItemId={route.itemId}
        onExit={() => handleExitShow(route.repertoryId)}
      />
    );
  }

  let content: ReactNode;
  if (route.name === 'import') {
    content = (
      <ImportSongPage
        onBack={() => router.back(LIBRARY_ROUTE)}
        onImported={handleImported}
        onBatch={() => router.navigate({ name: 'batch-import' })}
      />
    );
  } else if (route.name === 'batch-import') {
    content = (
      <BatchImportPage
        onBack={() => router.back({ name: 'import' })}
        onCompleted={(count) => {
          setNotice(
            `${count} música${count === 1 ? '' : 's'} importada${count === 1 ? '' : 's'} com sucesso.`,
          );
          router.navigate(LIBRARY_ROUTE);
        }}
      />
    );
  } else if (route.name === 'song') {
    content = (
      <SongViewPage
        songId={route.songId}
        backLabel={
          route.origin === 'favorites' ? 'Voltar para os favoritos' : 'Voltar para a biblioteca'
        }
        onBack={() => router.back(route.origin === 'favorites' ? FAVORITES_ROUTE : LIBRARY_ROUTE)}
        onEdit={() =>
          router.navigate({
            name: 'song-edit',
            songId: route.songId,
            origin: route.origin,
          })
        }
      />
    );
  } else if (route.name === 'song-edit') {
    content = (
      <SongEditorPage
        songId={route.songId}
        onBack={() => {
          handleDirtyChange(false);
          router.back({
            name: 'song',
            songId: route.songId,
            origin: route.origin,
          });
        }}
        onDirtyChange={handleDirtyChange}
      />
    );
  } else if (route.name === 'repertory') {
    content = (
      <RepertoryEditorPage
        repertoryId={route.repertoryId}
        onBack={() => router.back(REPERTORIES_ROUTE)}
        onOpenShow={(itemId) =>
          router.navigate({
            name: 'show',
            repertoryId: route.repertoryId,
            itemId: itemId ?? null,
          })
        }
      />
    );
  } else if (route.name === 'repertories') {
    content = (
      <RepertoriesPage
        onOpenSongs={() => router.navigate(LIBRARY_ROUTE)}
        onOpenRepertory={(repertoryId) => router.navigate({ name: 'repertory', repertoryId })}
        onOpenShow={(repertoryId) => router.navigate({ name: 'show', repertoryId, itemId: null })}
      />
    );
  } else if (route.name === 'favorites') {
    content = (
      <FavoritesPage
        onOpenSong={(songId) => router.navigate({ name: 'song', songId, origin: 'favorites' })}
      />
    );
  } else if (route.name === 'settings') {
    content = <SettingsPage />;
  } else {
    content = (
      <LibraryPage
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        onAddSong={() => {
          setNotice(null);
          router.navigate({ name: 'import' });
        }}
        onImportBatch={() => {
          setNotice(null);
          router.navigate({ name: 'batch-import' });
        }}
        onCreateRepertory={() => {
          router.navigate(REPERTORIES_ROUTE);
        }}
        onOpenSong={(songId) => router.navigate({ name: 'song', songId, origin: 'library' })}
        onOpenRepertories={() => router.navigate(REPERTORIES_ROUTE)}
      />
    );
  }

  return (
    <>
      {updateAvailable ? <UpdateNotice /> : null}
      <AppShell activeSection={activeSection} onSectionChange={handleSectionChange}>
        <div className={styles.routeContent} data-route={route.name}>
          {content}
        </div>
      </AppShell>
    </>
  );
}
