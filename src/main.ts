import '@fontsource-variable/manrope';
import '@fontsource-variable/newsreader';
import { registerSW } from 'virtual:pwa-register';
import './styles/main.css';
import { $ } from './utils/dom';
import { TimerManager } from './core/TimerManager';
import { ReaderEngine } from './engine/ReaderEngine';
import { PlaybackEngine } from './engine/PlaybackEngine';
import { GestureController } from './engine/GestureController';
import { RenderLayer } from './render/RenderLayer';
import { AppState } from './state/AppState';
import { ReadingHistory } from './state/ReadingHistory';
import { BookLibrary } from './library/BookLibrary';
import { LibraryUI } from './library/LibraryUI';
import type { Book, VisibleWordCount } from './core/types';
import { I18n } from './i18n';
import { ThemeManager } from './theme';
import { ensureWordTranslationsLoaded, getTranslationLocale } from './content/wordTranslations';

const LAST_BOOK_STORAGE_KEY = 'fovera:last-book-id:v1';
const INLINE_TRANSLATION_STORAGE_KEY = 'fovera:inline-translation:v1';
const VISIBLE_WORD_COUNT_STORAGE_KEY = 'fovera:visible-word-count:v1';

async function main(): Promise<void> {
  const appRoot = $<HTMLDivElement>('#app');
  const i18n = new I18n();
  const theme = new ThemeManager();
  const appState = new AppState();
  const readingHistory = new ReadingHistory();
  const timers = new TimerManager();
  const reader = new ReaderEngine();
  const render = new RenderLayer(i18n);
  let inlineTranslationsEnabled = readInlineTranslationEnabled();
  let visibleWordCount = readVisibleWordCount();
  reader.setVisibleWordCount(visibleWordCount);
  render.setInlineTranslationEnabled(inlineTranslationsEnabled);

  const playback = new PlaybackEngine(reader, timers, {
    onWordShown: (animate) => {
      readingHistory.recordPosition(reader.currentWordIndex, reader.currentPageIndex, 'playback');
      render.showCenterWord(reader.currentDisplayWords, animate, reader.currentDisplayTranslations);
      render.setProgress(reader.wordCount <= 1 ? 0 : reader.currentWordIndex / (reader.wordCount - 1));
      gesture.syncPageUi();
      appState.update({
        currentWordIndex: reader.currentWordIndex,
        currentSentenceIndex: reader.currentSentenceIndex,
      });
    },
    onPageBoundary: (nextPageIndex, continuePlayback) => {
      gesture.pauseForPageTurn(nextPageIndex, continuePlayback);
    },
    onFinished: () => gesture.finishBook(),
  });

  const gesture = new GestureController(appRoot, reader, playback, render, timers, appState, readingHistory, () => libraryUI.isOpen);

  const library = new BookLibrary();
  await library.ready;
  let currentBookSource: Book | null = null;
  let activeBookLoadRequest = 0;
  const loadSelectedBook = async (book: Book): Promise<void> => {
    const requestId = ++activeBookLoadRequest;
    currentBookSource = book;
    persistLastBookId(book.id);
    libraryUI.setActiveBook(book);
    try {
      const resolvedBook = await library.resolveBookForReading(book, i18n.locale);
      if (requestId !== activeBookLoadRequest) return;

      currentBookSource = resolvedBook;
      const localizedBook = i18n.localizeBook(resolvedBook);
      reader.setVisibleWordCount(visibleWordCount);
      reader.loadBook(localizedBook, {
        sourceLocale: localizedBook.sourceLocale,
        referencePages: localizedBook.sourceLocale !== resolvedBook.sourceLocale ? resolvedBook.pages : undefined,
      });
      const resume = readingHistory.openBook(localizedBook, reader.wordCount);
      if (resume) {
        reader.jumpToWord(resume.wordIndex);
      }
      readingHistory.recordPosition(reader.currentWordIndex, reader.currentPageIndex, 'restore');
      readingHistory.recordElapsed(resume?.elapsedMs ?? 0);
      render.setTranslationLocale(getTranslationLocale(localizedBook.sourceLocale));
      render.setProgress(reader.wordCount <= 1 ? 0 : reader.currentWordIndex / (reader.wordCount - 1));
      gesture.reset({ elapsedMs: resume?.elapsedMs ?? 0 });
    } catch (error) {
      if (requestId !== activeBookLoadRequest) return;
      console.error(`Fovera: failed to load book "${book.id}".`, error);
    }
  };
  const libraryUI = new LibraryUI(library, i18n, theme, {
    onBookSelected: (book: Book) => {
      void loadSelectedBook(book);
    },
    onWordTranslationsChanged: (enabled) => {
      inlineTranslationsEnabled = enabled;
      persistInlineTranslationEnabled(enabled);
      render.setInlineTranslationEnabled(enabled);
      render.setTranslationLocale(getTranslationLocale(reader.currentBook?.sourceLocale ?? i18n.locale));
      if (!enabled) {
        render.showCenterWord(reader.currentDisplayWords, false, reader.currentDisplayTranslations);
        return;
      }
      void ensureWordTranslationsLoaded()
        .catch((error) => {
          console.warn('Fovera: word translations could not be loaded on demand.', error);
        })
        .finally(() => {
          render.showCenterWord(reader.currentDisplayWords, false, reader.currentDisplayTranslations);
        });
    },
    onVisibleWordCountChanged: (count) => {
      visibleWordCount = count;
      persistVisibleWordCount(count);
      reader.setVisibleWordCount(count);
      gesture.refreshVisibleWordLayout();
    },
    onGuideTourRequested: () => {
      gesture.pauseForOverlay();
      render.showOnboarding(true);
    },
    onRestoreDefaultsRequested: () => {
      inlineTranslationsEnabled = false;
      visibleWordCount = 1;
      persistInlineTranslationEnabled(false);
      persistVisibleWordCount(1);
      reader.setVisibleWordCount(1);
      libraryUI.setWordTranslationEnabled(false);
      libraryUI.setVisibleWordCount(1);
      playback.setSpeed(1);
      appState.update({ speedMultiplier: 1 });
      render.hideSpeedBadge();
      render.setInlineTranslationEnabled(false);
      gesture.refreshVisibleWordLayout();
      theme.resetToDefault();
      i18n.resetToDefault();
      render.setTranslationLocale(getTranslationLocale(reader.currentBook?.sourceLocale ?? i18n.locale));
      render.showCenterWord(reader.currentDisplayWords, false, reader.currentDisplayTranslations);
    },
    onOpen: () => {
      gesture.closePageSheet();
      gesture.pauseForOverlay();
    },
  });
  libraryUI.setWordTranslationEnabled(inlineTranslationsEnabled);
  libraryUI.setVisibleWordCount(visibleWordCount);

  render.onPageChipClick(() => gesture.togglePageSheet());
  render.onPageSheetClose(() => gesture.closePageSheet());
  render.onPageSheetSelect((pageIndex) => gesture.jumpToPage(pageIndex));

  i18n.subscribe(() => {
    if (!currentBookSource) return;
    if (!inlineTranslationsEnabled) {
      void loadSelectedBook(currentBookSource);
      return;
    }
    void ensureWordTranslationsLoaded()
      .catch((error) => {
        console.warn('Fovera: word translations could not be loaded for locale switch.', error);
      })
      .finally(() => {
        void loadSelectedBook(currentBookSource!);
      });
  });

  // Load the first preset book so there's always something to read.
  const initialBook = resolveInitialBook(library);
  if (initialBook) {
    const localizedIntroBook = i18n.localizeBook(initialBook);
    const introMeta = {
      title: localizedIntroBook.title,
      author: localizedIntroBook.author,
      pageCount: localizedIntroBook.pages.length,
    };
    render.showBookIntro(introMeta);
    render.showIdleHint(introMeta);

    void loadSelectedBook(initialBook).then(() => {
      if (!inlineTranslationsEnabled) return;
      void ensureWordTranslationsLoaded()
        .catch((error) => {
          console.warn('Fovera: word translations could not be loaded for the initial session.', error);
        })
        .finally(() => {
          render.showCenterWord(reader.currentDisplayWords, false, reader.currentDisplayTranslations);
        });
    });
  }

  // Prevent the reader surface from hijacking page scroll, but allow natural
  // scrolling inside overlays like the library drawer and add-book modal.
  const allowNativeScroll = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('#library, #page-sheet, #add-modal, #book-text-input, #upload-area'));
  };

  document.addEventListener(
    'touchmove',
    (e) => {
      if (allowNativeScroll(e.target)) return;
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'wheel',
    (e) => {
      if (allowNativeScroll(e.target)) return;
      e.preventDefault();
    },
    { passive: false }
  );

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    readingHistory.recordElapsed(appState.get().elapsedMs);
    readingHistory.persist();
  });

  window.addEventListener('beforeunload', () => {
    readingHistory.recordElapsed(appState.get().elapsedMs);
    readingHistory.closeBook();
    gesture.destroy();
  });
}

void main();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      registerSW({ immediate: true });
    }, 1500);
  });
}

function resolveInitialBook(library: BookLibrary): Book | null {
  const lastBookId = readLastBookId();
  const catalog = [...library.presets, ...library.custom];
  return catalog.find((book) => book.id === lastBookId) ?? library.presets[0] ?? library.custom[0] ?? null;
}

function readLastBookId(): string | null {
  try {
    return localStorage.getItem(LAST_BOOK_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistLastBookId(bookId: string): void {
  try {
    localStorage.setItem(LAST_BOOK_STORAGE_KEY, bookId);
  } catch {
    // Persistence is a convenience only; reading must continue even if storage fails.
  }
}

function readInlineTranslationEnabled(): boolean {
  try {
    return localStorage.getItem(INLINE_TRANSLATION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistInlineTranslationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(INLINE_TRANSLATION_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Keep the active UI state even if persistence is unavailable.
  }
}

function readVisibleWordCount(): VisibleWordCount {
  try {
    const stored = localStorage.getItem(VISIBLE_WORD_COUNT_STORAGE_KEY);
    if (stored === '2') return 2;
    if (stored === '3') return 3;
  } catch {
    // Fall back to the default one-word mode.
  }
  return 1;
}

function persistVisibleWordCount(count: VisibleWordCount): void {
  try {
    localStorage.setItem(VISIBLE_WORD_COUNT_STORAGE_KEY, String(count));
  } catch {
    // Keep the active UI state even if persistence is unavailable.
  }
}
