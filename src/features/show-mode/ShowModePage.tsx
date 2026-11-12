import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SunMedium,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';

import { ChordDiagram } from '@/components/music';
import { Button } from '@/components/ui/Button';
import { transposeParsedSong } from '@/features/parser';
import { getPreference, setPreference, updateRepertoryItemKey } from '@/services';
import type { JsonValue } from '@/types';
import { lockBodyScroll } from '@/utils/scroll-lock';

import { SongSheet } from '@/features/songs';
import { baseSongStructure, keyForShift, keyShift, keySpelling } from '@/features/songs/display';
import { useRepertoryDetail } from '@/features/repertories/useRepertories';
import {
  canMoveShowSession,
  createShowSession,
  jumpShowSession,
  moveShowSession,
  type PlayableEntry,
  type ShowSession,
} from './show-session';
import { createScrollController, type ScrollController } from './scroll-controller';
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  supportsScreenWakeLock,
  type WakeLockHandle,
  type WakeLockProvider,
} from './wake-lock';
import styles from './ShowModePage.module.css';

interface ShowModePageProps {
  readonly repertoryId: string;
  readonly requestedItemId?: string | null;
  readonly onExit: () => void;
}

interface ShowPositionPreference {
  readonly itemId: string | null;
  readonly index: number;
}

const POSITION_PREFIX = 'show.repertory.';
const SPEED_KEY = 'show.scrollSpeed';
const DIAGRAMS_KEY = 'show.diagrams';
const FONT_SCALE_KEY = 'show.fontScale';
const DEFAULT_SPEED = 42;

function positionKey(repertoryId: string): string {
  return `${POSITION_PREFIX}${repertoryId}.position`;
}

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, label, [role="button"], [role="slider"], [contenteditable="true"], [data-no-swipe="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      Boolean(target.closest('button, a, [role="button"], [role="slider"]')))
  );
}

function selectedStartKey(entry: PlayableEntry): string | null {
  return (
    entry.item.preferredKey ??
    entry.song.preferredKey ??
    entry.song.originalKey ??
    entry.song.structure.currentKey
  );
}

export function ShowModePage({ repertoryId, requestedItemId, onExit }: ShowModePageProps) {
  const { data: detail, loading, error } = useRepertoryDetail(repertoryId);
  const [savedPosition, setSavedPosition] = useState<ShowPositionPreference | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [trackListOpen, setTrackListOpen] = useState(false);
  const [diagramSymbol, setDiagramSymbol] = useState<string | null>(null);
  const [diagramsEnabled, setDiagramsEnabled] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [scrollSpeed, setScrollSpeed] = useState(DEFAULT_SPEED);
  const [autoScroll, setAutoScroll] = useState(false);
  const [toneShifts, setToneShifts] = useState<Record<string, number | string | null>>({});
  const [toneStatus, setToneStatus] = useState<string | null>(null);
  const [exitPending, setExitPending] = useState(false);
  const autoScrollingUntil = useRef(0);
  const scrollController = useRef<ScrollController | null>(null);
  const wakeLock = useRef<WakeLockHandle | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const trackSheetRef = useRef<HTMLElement>(null);
  const trackListTriggerRef = useRef<HTMLButtonElement>(null);
  const [positionLoaded, setPositionLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getPreference<ShowPositionPreference | null>(positionKey(repertoryId), null),
      getPreference<boolean>(DIAGRAMS_KEY, false),
      getPreference<number>(SPEED_KEY, DEFAULT_SPEED),
      getPreference<number>(FONT_SCALE_KEY, 1),
    ])
      .then(([position, diagrams, speed, scale]) => {
        if (!active) return;
        setSavedPosition(position ?? { itemId: null, index: 0 });
        setPositionLoaded(true);
        setDiagramsEnabled(diagrams);
        setScrollSpeed(Math.max(20, Math.min(100, speed)));
        setFontScale(Math.max(0.85, Math.min(1.25, scale)));
      })
      .catch(() => {
        if (!active) return;
        setSavedPosition({ itemId: null, index: 0 });
        setPositionLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [repertoryId]);

  const session = useMemo<ShowSession | null>(() => {
    if (!detail || !positionLoaded || savedPosition === null) return null;
    return createShowSession(
      detail.items,
      savedPosition.index,
      currentItemId ?? requestedItemId ?? savedPosition.itemId,
    );
  }, [currentItemId, detail, positionLoaded, requestedItemId, savedPosition]);

  const currentEntry = session?.entries[session.index];
  const currentSong = currentEntry?.song ?? null;
  const sourceKey =
    currentSong?.originalKey ??
    currentSong?.structure.currentKey ??
    (currentEntry ? selectedStartKey(currentEntry) : null);

  const baselineKey = currentEntry ? `${currentEntry.item.id}:baseline` : '';
  const initialItemKey = currentEntry
    ? Object.prototype.hasOwnProperty.call(toneShifts, baselineKey)
      ? (toneShifts[baselineKey] as string | null)
      : currentEntry.item.preferredKey
    : null;
  const startKey = currentEntry
    ? selectedStartKey({
        ...currentEntry,
        item: { ...currentEntry.item, preferredKey: initialItemKey },
      })
    : null;
  const startShift = sourceKey && startKey ? keyShift(sourceKey, startKey) : 0;
  const currentToneValue = currentEntry ? toneShifts[currentEntry.item.id] : undefined;
  const toneShift = typeof currentToneValue === 'number' ? currentToneValue : startShift;
  const wakeLockAvailable = typeof navigator !== 'undefined' && supportsScreenWakeLock(navigator);
  const displayedStructure = useMemo(() => {
    if (!currentSong) return null;
    return transposeParsedSong(baseSongStructure(currentSong), toneShift, {
      spelling: keySpelling(startKey),
    });
  }, [currentSong, startKey, toneShift]);
  const displayedKey = keyForShift(sourceKey, toneShift, startKey);

  useEffect(() => {
    if (currentEntry) {
      const nextHash = `#show/${encodeURIComponent(repertoryId)}/${encodeURIComponent(currentEntry.item.id)}`;
      window.history.replaceState({ ...(window.history.state ?? {}), show: true }, '', nextHash);
      void setPreference(positionKey(repertoryId), {
        itemId: currentEntry.item.id,
        index: session?.index ?? 0,
      } satisfies JsonValue);
    }
  }, [currentEntry, repertoryId, session?.index]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (exitPending || trackListOpen || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        if (session && canMoveShowSession(session, -1)) {
          const next = moveShowSession(session, -1);
          setCurrentItemId(next.entries[next.index]?.item.id ?? null);
          setAutoScroll(false);
          setDiagramSymbol(null);
          setToneStatus(null);
        }
      }
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        if (session && canMoveShowSession(session, 1)) {
          const next = moveShowSession(session, 1);
          setCurrentItemId(next.entries[next.index]?.item.id ?? null);
          setAutoScroll(false);
          setDiagramSymbol(null);
          setToneStatus(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exitPending, session, trackListOpen]);

  useEffect(() => {
    const controller = createScrollController(
      {
        now: () => performance.now(),
        requestFrame: (callback) => requestAnimationFrame(callback),
        cancelFrame: (frame) => cancelAnimationFrame(frame),
        getScrollTop: () => window.scrollY,
        getMaxScroll: () => document.documentElement.scrollHeight - window.innerHeight,
        scrollBy: (top) => {
          // Ignora o evento de scroll gerado pelo próprio controlador.
          autoScrollingUntil.current = performance.now() + 180;
          window.scrollBy(0, top);
        },
      },
      DEFAULT_SPEED,
      () => setAutoScroll(false),
    );
    scrollController.current = controller;
    return () => {
      controller.stop();
      scrollController.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = scrollController.current;
    if (!controller) return;
    controller.setSpeed(scrollSpeed);
    if (autoScroll) controller.start();
    else controller.stop();
  }, [autoScroll, scrollSpeed]);

  useEffect(() => {
    function pauseForManualScroll(): void {
      if (performance.now() > autoScrollingUntil.current) setAutoScroll(false);
    }
    function pauseForManualTouch(event: TouchEvent): void {
      if (isInteractiveTarget(event.target)) return;
      setAutoScroll(false);
    }
    // Não usamos touchstart: tocar em controles não deve pausar a rolagem.
    // O scroll cobre roda, teclado e barra; o touchmove cobre o arrasto manual,
    // que não pode ser distinguido pelo scroll durante a rolagem programática.
    window.addEventListener('wheel', pauseForManualScroll, { passive: true });
    window.addEventListener('scroll', pauseForManualScroll, { passive: true });
    window.addEventListener('touchmove', pauseForManualTouch, { passive: true });
    return () => {
      window.removeEventListener('wheel', pauseForManualScroll);
      window.removeEventListener('scroll', pauseForManualScroll);
      window.removeEventListener('touchmove', pauseForManualTouch);
    };
  }, []);

  useEffect(() => {
    if (!exitPending) return undefined;
    document.querySelector<HTMLButtonElement>('[data-exit-continue="true"]')?.focus();
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setExitPending(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [exitPending]);

  useEffect(() => {
    if (!trackListOpen) return undefined;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const listTrigger = trackListTriggerRef.current;
    const releaseScrollLock = lockBodyScroll();
    const sheet = trackSheetRef.current;
    const firstFocusable = sheet?.querySelector<HTMLElement>('button:not(:disabled)');
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        setTrackListOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sheet) return;
      const focusable = [...sheet.querySelectorAll<HTMLElement>('button:not(:disabled)')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      releaseScrollLock();
      if (listTrigger?.isConnected) listTrigger.focus();
      else if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [trackListOpen]);

  useEffect(() => {
    const navigatorWithWakeLock = navigator as WakeLockProvider;
    async function acquire(): Promise<void> {
      wakeLock.current = await requestScreenWakeLock(
        navigatorWithWakeLock,
        document.visibilityState === 'visible',
      );
    }
    function handleVisibility(): void {
      if (document.visibilityState === 'visible') void acquire();
    }
    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      void releaseScreenWakeLock(wakeLock.current);
      wakeLock.current = null;
    };
  }, []);

  function handleReadingTouchStart(event: ReactTouchEvent<HTMLDivElement>): void {
    if (event.touches.length !== 1 || isInteractiveTarget(event.target)) {
      touchStart.current = null;
      return;
    }
    const touch = event.changedTouches[0];
    if (!touch) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }

  function handleReadingTouchEnd(event: ReactTouchEvent<HTMLDivElement>): void {
    const touch = event.changedTouches[0];
    const start = touchStart.current;
    touchStart.current = null;
    if (!touch || !start) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Date.now() - start.time < 700 && Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      move(dx < 0 ? 1 : -1);
    }
  }

  function move(direction: -1 | 1): void {
    if (!session || !canMoveShowSession(session, direction)) return;
    scrollController.current?.stop();
    const next = moveShowSession(session, direction);
    setCurrentItemId(next.entries[next.index]?.item.id ?? null);
    setAutoScroll(false);
    setDiagramSymbol(null);
    setToneStatus(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function jump(index: number): void {
    if (!session) return;
    scrollController.current?.stop();
    const next = jumpShowSession(session, index);
    setCurrentItemId(next.entries[next.index]?.item.id ?? null);
    setTrackListOpen(false);
    setAutoScroll(false);
    setDiagramSymbol(null);
    setToneStatus(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  async function persistTone(nextShift: number): Promise<void> {
    if (!currentEntry) return;
    const previousShift = toneShift;
    const nextKey =
      nextShift === startShift ? initialItemKey : keyForShift(sourceKey, nextShift, startKey);
    setToneShifts((current) => ({
      ...current,
      [currentEntry.item.id]: nextShift,
      [baselineKey]: Object.prototype.hasOwnProperty.call(current, baselineKey)
        ? (current[baselineKey] ?? null)
        : initialItemKey,
    }));
    setToneStatus('Salvando tom…');
    try {
      await updateRepertoryItemKey(currentEntry.item.id, nextKey);
      setToneStatus(nextKey ? `Tom do item: ${nextKey}.` : 'Tom original do item restaurado.');
    } catch (cause: unknown) {
      setToneShifts((current) => ({ ...current, [currentEntry.item.id]: previousShift }));
      setToneStatus(cause instanceof Error ? cause.message : 'Não foi possível salvar o tom.');
    }
  }

  if (loading || !positionLoaded || savedPosition === null) {
    return <div className={styles.state}>Abrindo modo show…</div>;
  }
  if (error) return <div className={styles.state}>Não foi possível abrir este repertório.</div>;
  if (!session || session.entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.kicker}>Modo show</p>
        <h1>{detail?.repertory.name ?? 'Repertório'}</h1>
        <p>Este repertório não possui músicas disponíveis para tocar.</p>
        <Button variant="secondary" onClick={onExit}>
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>
    );
  }

  const nextEntry = session.entries[session.index + 1];
  const previousAvailable = canMoveShowSession(session, -1);
  const nextAvailable = canMoveShowSession(session, 1);
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <button className={styles.exit} type="button" onClick={() => setExitPending(true)}>
          <ArrowLeft size={16} /> Sair
        </button>
        <div className={styles.trackMeta}>
          <span>
            {session.index + 1} de {session.entries.length}
          </span>
          <strong>{currentSong?.title}</strong>
          <span>{displayedKey ?? 'Tom não informado'}</span>
        </div>
        <button
          className={styles.controlToggle}
          type="button"
          onClick={() => setControlsOpen((open) => !open)}
          aria-expanded={controlsOpen}
          aria-label="Abrir controles"
        >
          <Settings2 size={18} />
        </button>
      </header>

      {exitPending ? (
        <div className={styles.confirmExit} role="group" aria-label="Confirmar saída do modo show">
          <span>Sair do modo show?</span>
          <Button
            size="sm"
            variant="ghost"
            data-exit-continue="true"
            onClick={() => setExitPending(false)}
          >
            Continuar
          </Button>
          <Button size="sm" variant="secondary" onClick={onExit}>
            Sair
          </Button>
        </div>
      ) : null}

      <div className={styles.songHeading}>
        <p>{detail?.repertory.name}</p>
        <h1>{currentSong?.title}</h1>
        {currentSong?.artist ? <span>{currentSong.artist}</span> : null}
      </div>

      {controlsOpen ? (
        <section className={styles.controls} aria-label="Controles do modo show">
          <div className={styles.controlGroup}>
            <span>
              Tom exibido: <strong>{displayedKey ?? 'não informado'}</strong>
            </span>
            <div className={styles.inlineControls}>
              <button
                type="button"
                onClick={() => void persistTone(toneShift - 1)}
                aria-label="Baixar um semitom"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                onClick={() => void persistTone(startShift)}
                aria-label="Voltar ao tom de partida"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => void persistTone(toneShift + 1)}
                aria-label="Subir um semitom"
              >
                <Plus size={16} />
              </button>
            </div>
            <small>
              Original: {currentSong?.originalKey ?? 'não informado'} · Tom do item:{' '}
              {initialItemKey ?? 'não definido'}
            </small>
          </div>
          <div className={styles.controlGroup}>
            <label htmlFor="show-font-size">Tamanho da letra</label>
            <div className={styles.inlineControls}>
              <button
                type="button"
                onClick={() => {
                  const value = Math.max(0.85, fontScale - 0.05);
                  setFontScale(value);
                  void setPreference(FONT_SCALE_KEY, value);
                }}
                aria-label="Diminuir letra"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFontScale(1);
                  void setPreference(FONT_SCALE_KEY, 1);
                }}
              >
                <SunMedium size={15} /> Ajustar
              </button>
              <button
                type="button"
                onClick={() => {
                  const value = Math.min(1.25, fontScale + 0.05);
                  setFontScale(value);
                  void setPreference(FONT_SCALE_KEY, value);
                }}
                aria-label="Aumentar letra"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              role="switch"
              checked={diagramsEnabled}
              onChange={(event) => {
                const value = event.target.checked;
                setDiagramsEnabled(value);
                void setPreference(DIAGRAMS_KEY, value);
                if (!value) setDiagramSymbol(null);
              }}
            />
            Mostrar diagramas ao tocar nos acordes
          </label>
          {toneStatus ? (
            <p className={styles.toast} role="status">
              {toneStatus}
            </p>
          ) : null}
          {!wakeLockAvailable ? (
            <p className={styles.hint}>A tela acesa não é suportada neste navegador.</p>
          ) : null}
        </section>
      ) : null}

      {diagramSymbol && diagramsEnabled ? (
        <ChordDiagram
          key={diagramSymbol}
          symbol={diagramSymbol}
          onClose={() => setDiagramSymbol(null)}
        />
      ) : null}

      {displayedStructure ? (
        <div
          className={styles.reading}
          data-testid="show-reading"
          onTouchStart={handleReadingTouchStart}
          onTouchEnd={handleReadingTouchEnd}
          onTouchCancel={() => {
            touchStart.current = null;
          }}
        >
          <SongSheet
            structure={displayedStructure}
            title={currentSong?.title ?? 'Música'}
            fontScale={fontScale}
            variant="stage"
            {...(diagramsEnabled ? { onChordSelect: setDiagramSymbol } : {})}
          />
        </div>
      ) : null}

      <nav className={styles.navigation} aria-label="Navegação do modo show">
        <div className={styles.scrollRow}>
          <button
            className={styles.scrollToggle}
            type="button"
            aria-label={autoScroll ? 'Pausar rolagem' : 'Iniciar rolagem'}
            aria-pressed={autoScroll}
            onClick={() => setAutoScroll((running) => !running)}
          >
            {autoScroll ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <label className={styles.scrollSpeed}>
            <span className={styles.scrollLabel}>Rolagem</span>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={scrollSpeed}
              aria-label="Velocidade da rolagem"
              onChange={(event) => {
                const value = Number(event.target.value);
                setScrollSpeed(value);
                void setPreference(SPEED_KEY, value);
              }}
            />
            <span className={styles.scrollValue} aria-live="polite">
              {scrollSpeed} px/s
            </span>
          </label>
        </div>
        <div className={styles.navRow}>
          <button type="button" onClick={() => move(-1)} disabled={!previousAvailable}>
            <ChevronLeft size={20} /> <span>Anterior</span>
          </button>
          <button
            ref={trackListTriggerRef}
            type="button"
            className={styles.listButton}
            aria-expanded={trackListOpen}
            aria-controls="show-track-list"
            onClick={() => setTrackListOpen(true)}
          >
            <List size={18} />{' '}
            <span>
              {session.index + 1} de {session.entries.length}
            </span>
          </button>
          <button type="button" onClick={() => move(1)} disabled={!nextAvailable}>
            <span>{nextEntry ? nextEntry.song.title : 'Fim'}</span> <ChevronRight size={20} />
          </button>
        </div>
      </nav>

      {trackListOpen ? (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onClick={() => setTrackListOpen(false)}
        >
          <section
            ref={trackSheetRef}
            id="show-track-list"
            className={styles.trackSheet}
            role="dialog"
            aria-modal="true"
            aria-label="Músicas do repertório"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.sheetHeader}>
              <h2>{detail?.repertory.name}</h2>
              <button
                type="button"
                onClick={() => setTrackListOpen(false)}
                aria-label="Fechar lista"
              >
                <X size={18} />
              </button>
            </div>
            <ol>
              {session.entries.map((entry, index) => (
                <li key={entry.item.id}>
                  <button
                    type="button"
                    className={index === session.index ? styles.activeTrack : ''}
                    onClick={() => jump(index)}
                  >
                    <span>{index + 1}</span>
                    <span>{entry.song.title}</span>
                    <small>
                      {entry.item.preferredKey ??
                        entry.song.preferredKey ??
                        entry.song.originalKey ??
                        'Tom não informado'}
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </div>
  );
}
