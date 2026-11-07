import { useEffect, useState, type ReactNode } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ImportSongPage, LibraryPage, SongEditorPage, SongViewPage } from '@/features/library';
import { RepertoriesPage, RepertoryEditorPage } from '@/features/repertories';
import { ShowModePage } from '@/features/show-mode';
import { CloudPage } from '@/features/settings/CloudPage';
import { useCloudSync } from '@/sync';
import type { Song } from '@/types';

import { NAVIGATION_BY_ID, type SectionId } from './navigation';
import styles from './App.module.css';

interface PlaceholderContent {
  title: string;
  description: string;
}

type LibraryScreen = 'library' | 'import' | 'song' | 'edit';

interface ShowRoute {
  readonly repertoryId: string;
  readonly itemId: string | null;
}

function readShowRoute(): ShowRoute | null {
  const match = /^#show\/([^/]+)(?:\/([^/]+))?$/u.exec(window.location.hash);
  if (!match?.[1]) return null;
  return {
    repertoryId: decodeURIComponent(match[1]),
    itemId: match[2] ? decodeURIComponent(match[2]) : null,
  };
}

const PLACEHOLDERS: Record<Exclude<SectionId, 'library'>, PlaceholderContent> = {
  repertories: {
    title: 'Repertórios na próxima etapa',
    description:
      'A estrutura de dados para repertórios e ordenação já foi definida. A interface será construída sobre essa base.',
  },
  favorites: {
    title: 'Favoritos na próxima etapa',
    description:
      'A tabela de favoritos já faz parte do schema inicial do banco local e será conectada à interface em seguida.',
  },
  settings: {
    title: 'Ajustes na próxima etapa',
    description:
      'Preferências e configurações terão uma área dedicada, persistida localmente e preparada para backup.',
  },
};

export function App() {
  useCloudSync();
  const [activeSection, setActiveSection] = useState<SectionId>('library');
  const [libraryScreen, setLibraryScreen] = useState<LibraryScreen>('library');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedRepertoryId, setSelectedRepertoryId] = useState<string | null>(null);
  const [repertoryScreen, setRepertoryScreen] = useState<'list' | 'edit'>('list');
  const [notice, setNotice] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [showRoute, setShowRoute] = useState<ShowRoute | null>(() => readShowRoute());

  const activeItem = NAVIGATION_BY_ID[activeSection];
  const ActiveIcon = activeItem.icon;

  useEffect(() => {
    function handleRouteChange(): void {
      setShowRoute(readShowRoute());
    }
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  function openShow(repertoryId: string, itemId?: string): void {
    const suffix = itemId ? `/${encodeURIComponent(itemId)}` : '';
    window.history.pushState(
      { show: true },
      '',
      `#show/${encodeURIComponent(repertoryId)}${suffix}`,
    );
    setShowRoute({ repertoryId, itemId: itemId ?? null });
  }

  function exitShow(): void {
    const originRepertoryId = showRoute?.repertoryId ?? null;
    window.history.replaceState({}, '', '#repertories');
    setShowRoute(null);
    setActiveSection('repertories');
    setSelectedRepertoryId(originRepertoryId);
    setRepertoryScreen(originRepertoryId ? 'edit' : 'list');
  }

  function handleSectionChange(section: SectionId): void {
    if (libraryScreen === 'edit' && editorDirty && section !== 'library') {
      if (!window.confirm('Existem alterações não salvas. Sair mesmo assim?')) return;
      setEditorDirty(false);
    }
    setActiveSection(section);
    if (section !== 'library') {
      setLibraryScreen('library');
      setSelectedSongId(null);
    }
    if (section === 'repertories') {
      setRepertoryScreen('list');
      setSelectedRepertoryId(null);
    }
  }

  function handleImported(song: Song): void {
    const warnings = song.structure.diagnostics
      .filter((item) => item.severity === 'warning')
      .map((item) => item.message);
    const warningSuffix = warnings.length > 0 ? ` Avisos: ${warnings.join(' ')}` : '';
    setNotice(`“${song.title}” foi adicionada à biblioteca.${warningSuffix}`);
    setLibraryScreen('library');
  }

  let content: ReactNode;
  if (activeSection === 'library' && libraryScreen === 'import') {
    content = (
      <ImportSongPage onBack={() => setLibraryScreen('library')} onImported={handleImported} />
    );
  } else if (activeSection === 'library' && libraryScreen === 'song' && selectedSongId) {
    content = (
      <SongViewPage
        songId={selectedSongId}
        onBack={() => setLibraryScreen('library')}
        onEdit={() => setLibraryScreen('edit')}
      />
    );
  } else if (activeSection === 'library' && libraryScreen === 'edit' && selectedSongId) {
    content = (
      <SongEditorPage
        songId={selectedSongId}
        onBack={() => setLibraryScreen('song')}
        onDirtyChange={setEditorDirty}
      />
    );
  } else if (activeSection === 'library') {
    content = (
      <LibraryPage
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        onImport={() => {
          setNotice(null);
          setLibraryScreen('import');
        }}
        onOpenSong={(id) => {
          setSelectedSongId(id);
          setLibraryScreen('song');
        }}
        onOpenRepertories={() => {
          setActiveSection('repertories');
          setRepertoryScreen('list');
          setSelectedRepertoryId(null);
        }}
      />
    );
  } else if (activeSection === 'repertories' && repertoryScreen === 'edit' && selectedRepertoryId) {
    content = (
      <RepertoryEditorPage
        repertoryId={selectedRepertoryId}
        onBack={() => setRepertoryScreen('list')}
        onOpenSongs={() => {
          setActiveSection('library');
          setLibraryScreen('library');
          setSelectedRepertoryId(null);
        }}
        onOpenShow={(itemId) => {
          if (selectedRepertoryId) openShow(selectedRepertoryId, itemId);
        }}
      />
    );
  } else if (activeSection === 'repertories') {
    content = (
      <RepertoriesPage
        onOpenSongs={() => {
          setActiveSection('library');
          setLibraryScreen('library');
        }}
        onOpenRepertory={(id) => {
          setSelectedRepertoryId(id);
          setRepertoryScreen('edit');
        }}
        onOpenShow={(id) => openShow(id)}
      />
    );
  } else if (activeSection === 'settings') {
    content = <CloudPage />;
  } else {
    const placeholder = PLACEHOLDERS[activeSection];
    content = (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Fundação V2"
          title={activeItem.label}
          description={activeItem.description}
        />
        <EmptyState
          icon={ActiveIcon}
          badge="Próxima etapa"
          title={placeholder.title}
          description={placeholder.description}
        />
      </div>
    );
  }

  if (showRoute) {
    return (
      <ShowModePage
        key={showRoute.repertoryId}
        repertoryId={showRoute.repertoryId}
        requestedItemId={showRoute.itemId}
        onExit={exitShow}
      />
    );
  }

  return (
    <AppShell activeSection={activeSection} onSectionChange={handleSectionChange}>
      {content}
    </AppShell>
  );
}
