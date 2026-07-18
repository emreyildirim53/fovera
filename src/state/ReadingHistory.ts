import type { Book } from '../core/types';
import { formatElapsed } from '../utils/dom';

const STORAGE_KEY = 'fovera:reading-history:v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ResumeSnapshot {
  wordIndex: number;
  elapsedMs: number;
  updatedAt: number;
}

export interface CompletionSummary {
  title: string;
  elapsedLabel: string;
  elapsedMs: number;
  averageWpm: number;
  wordsRead: number;
  rewoundWords: number;
  rewoundPages: number;
  pagesVisitedThisSession: number;
  maxPagesSingleSession: number;
  sessions: number;
  completions: number;
  progressPercent: number;
  returnedAfterDays: number | null;
}

interface BookProgressRecord {
  wordIndex: number;
  pageIndex: number;
  elapsedMs: number;
  updatedAt: number;
  completed: boolean;
  runWordsRead: number;
  runRewoundWords: number;
  runRewoundPages: number;
}

interface BookLifetimeStats {
  sessions: number;
  completions: number;
  totalElapsedMs: number;
  totalWordsRead: number;
  totalRewoundWords: number;
  totalRewoundPages: number;
  maxPagesSingleSession: number;
  lastOpenedAt: number;
  lastCompletedAt: number | null;
}

interface StoredBookHistory {
  bookId: string;
  title: string;
  author: string;
  progress: BookProgressRecord;
  stats: BookLifetimeStats;
}

interface SessionSnapshot {
  pagesVisited: number;
}

type StoredHistory = Record<string, StoredBookHistory>;
type PositionSource = 'playback' | 'seek' | 'restore' | 'reset';

/**
 * Persists two layers of reading state:
 * 1. resumable in-book progress
 * 2. lifetime analytics for the final stats panel
 */
export class ReadingHistory {
  private records: StoredHistory = readStoredHistory();
  private current: StoredBookHistory | null = null;
  private currentWordCount = 0;
  private currentPageCount = 0;
  private currentWordIndex = 0;
  private currentPageIndex = 0;
  private resumeGapDays: number | null = null;

  private sessionActive = false;
  private sessionElapsedStart = 0;
  private sessionWordsRead = 0;
  private sessionRewoundWords = 0;
  private sessionRewoundPages = 0;
  private sessionVisitedPages = new Set<number>();

  openBook(book: Book, wordCount: number): ResumeSnapshot | null {
    this.closeBook();

    const existing = this.records[book.id];
    const current = existing ? hydrateRecord(existing, book) : createRecord(book);
    current.stats.lastOpenedAt = Date.now();

    this.records[book.id] = current;
    this.current = current;
    this.currentWordCount = Math.max(0, wordCount);
    this.currentPageCount = Math.max(0, book.pages.length);
    this.currentWordIndex = clampIndex(current.progress.wordIndex, this.currentWordCount);
    this.currentPageIndex = clampIndex(current.progress.pageIndex, this.currentPageCount);
    this.resumeGapDays =
      !current.progress.completed && current.progress.wordIndex > 0
        ? calculateGapDays(Date.now(), current.progress.updatedAt)
        : null;

    this.persist();

    if (current.progress.completed || this.currentWordCount === 0 || current.progress.wordIndex <= 0) {
      return null;
    }

    return {
      wordIndex: this.currentWordIndex,
      elapsedMs: current.progress.elapsedMs,
      updatedAt: current.progress.updatedAt,
    };
  }

  ensureSessionStarted(): void {
    if (!this.current || this.sessionActive) return;

    this.sessionActive = true;
    this.sessionElapsedStart = this.current.progress.elapsedMs;
    this.sessionWordsRead = 0;
    this.sessionRewoundWords = 0;
    this.sessionRewoundPages = 0;
    this.sessionVisitedPages = new Set([this.currentPageIndex]);
    this.current.stats.sessions += 1;
    this.current.stats.lastOpenedAt = Date.now();
    this.persist();
  }

  recordPosition(wordIndex: number, pageIndex: number, source: PositionSource): void {
    if (!this.current) return;

    const nextWordIndex = clampIndex(wordIndex, this.currentWordCount);
    const nextPageIndex = clampIndex(pageIndex, this.currentPageCount);

    if (source === 'playback' || source === 'seek') {
      this.ensureSessionStarted();
    }

    if (source === 'playback' && nextWordIndex > this.currentWordIndex) {
      const delta = nextWordIndex - this.currentWordIndex;
      this.current.progress.runWordsRead += delta;
      this.sessionWordsRead += delta;
    }

    if (source === 'seek' && nextWordIndex < this.currentWordIndex) {
      const rewoundWords = this.currentWordIndex - nextWordIndex;
      const rewoundPages = Math.max(0, this.currentPageIndex - nextPageIndex);
      this.current.progress.runRewoundWords += rewoundWords;
      this.current.progress.runRewoundPages += rewoundPages;
      this.sessionRewoundWords += rewoundWords;
      this.sessionRewoundPages += rewoundPages;
    }

    this.current.progress.wordIndex = nextWordIndex;
    this.current.progress.pageIndex = nextPageIndex;
    this.current.progress.updatedAt = Date.now();
    this.current.progress.completed = false;

    this.currentWordIndex = nextWordIndex;
    this.currentPageIndex = nextPageIndex;

    if (this.sessionActive) {
      this.sessionVisitedPages.add(nextPageIndex);
    }
  }

  recordElapsed(elapsedMs: number): void {
    if (!this.current) return;
    this.current.progress.elapsedMs = Math.max(0, Math.round(elapsedMs));
    this.current.progress.updatedAt = Date.now();
  }

  pause(): void {
    this.persist();
  }

  finishBook(): CompletionSummary | null {
    if (!this.current) return null;

    this.ensureSessionStarted();
    this.current.progress.wordIndex = clampIndex(this.currentWordCount - 1, this.currentWordCount);
    this.current.progress.pageIndex = clampIndex(this.currentPageCount - 1, this.currentPageCount);
    this.current.progress.completed = true;
    this.current.progress.updatedAt = Date.now();
    this.current.stats.completions += 1;
    this.current.stats.lastCompletedAt = Date.now();

    const session = this.finalizeSession() ?? { pagesVisited: 1 };
    const summary = buildCompletionSummary(
      this.current,
      this.currentPageCount,
      session.pagesVisited,
      this.resumeGapDays
    );
    this.persist();
    return summary;
  }

  restartCurrentRun(): void {
    if (!this.current) return;

    this.sessionActive = false;
    this.sessionVisitedPages.clear();
    this.sessionElapsedStart = 0;
    this.sessionWordsRead = 0;
    this.sessionRewoundWords = 0;
    this.sessionRewoundPages = 0;
    this.resumeGapDays = null;

    this.current.progress = {
      wordIndex: 0,
      pageIndex: 0,
      elapsedMs: 0,
      updatedAt: Date.now(),
      completed: false,
      runWordsRead: 0,
      runRewoundWords: 0,
      runRewoundPages: 0,
    };
    this.currentWordIndex = 0;
    this.currentPageIndex = 0;
    this.persist();
  }

  closeBook(): void {
    if (!this.current) return;
    this.finalizeSession();
    this.persist();
    this.current = null;
    this.currentWordCount = 0;
    this.currentPageCount = 0;
    this.currentWordIndex = 0;
    this.currentPageIndex = 0;
    this.resumeGapDays = null;
  }

  persist(): void {
    writeStoredHistory(this.records);
  }

  private finalizeSession(): SessionSnapshot | null {
    if (!this.current || !this.sessionActive) return null;

    const elapsedDelta = Math.max(0, this.current.progress.elapsedMs - this.sessionElapsedStart);
    this.current.stats.totalElapsedMs += elapsedDelta;
    this.current.stats.totalWordsRead += this.sessionWordsRead;
    this.current.stats.totalRewoundWords += this.sessionRewoundWords;
    this.current.stats.totalRewoundPages += this.sessionRewoundPages;
    this.current.stats.maxPagesSingleSession = Math.max(this.current.stats.maxPagesSingleSession, this.sessionVisitedPages.size);

    const snapshot: SessionSnapshot = {
      pagesVisited: Math.max(1, this.sessionVisitedPages.size),
    };

    this.sessionActive = false;
    this.sessionElapsedStart = 0;
    this.sessionWordsRead = 0;
    this.sessionRewoundWords = 0;
    this.sessionRewoundPages = 0;
    this.sessionVisitedPages.clear();
    return snapshot;
  }
}

function createRecord(book: Book): StoredBookHistory {
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    progress: {
      wordIndex: 0,
      pageIndex: 0,
      elapsedMs: 0,
      updatedAt: Date.now(),
      completed: false,
      runWordsRead: 0,
      runRewoundWords: 0,
      runRewoundPages: 0,
    },
    stats: {
      sessions: 0,
      completions: 0,
      totalElapsedMs: 0,
      totalWordsRead: 0,
      totalRewoundWords: 0,
      totalRewoundPages: 0,
      maxPagesSingleSession: 0,
      lastOpenedAt: Date.now(),
      lastCompletedAt: null,
    },
  };
}

function hydrateRecord(record: StoredBookHistory, book: Book): StoredBookHistory {
  return {
    ...record,
    title: book.title,
    author: book.author,
    progress: {
      ...record.progress,
      wordIndex: Math.max(0, record.progress.wordIndex ?? 0),
      pageIndex: Math.max(0, record.progress.pageIndex ?? 0),
      elapsedMs: Math.max(0, record.progress.elapsedMs ?? 0),
      updatedAt: record.progress.updatedAt ?? Date.now(),
      completed: Boolean(record.progress.completed),
      runWordsRead: Math.max(0, record.progress.runWordsRead ?? 0),
      runRewoundWords: Math.max(0, record.progress.runRewoundWords ?? 0),
      runRewoundPages: Math.max(0, record.progress.runRewoundPages ?? 0),
    },
    stats: {
      sessions: Math.max(0, record.stats.sessions ?? 0),
      completions: Math.max(0, record.stats.completions ?? 0),
      totalElapsedMs: Math.max(0, record.stats.totalElapsedMs ?? 0),
      totalWordsRead: Math.max(0, record.stats.totalWordsRead ?? 0),
      totalRewoundWords: Math.max(0, record.stats.totalRewoundWords ?? 0),
      totalRewoundPages: Math.max(0, record.stats.totalRewoundPages ?? 0),
      maxPagesSingleSession: Math.max(0, record.stats.maxPagesSingleSession ?? 0),
      lastOpenedAt: record.stats.lastOpenedAt ?? Date.now(),
      lastCompletedAt: record.stats.lastCompletedAt ?? null,
    },
  };
}

function buildCompletionSummary(
  record: StoredBookHistory,
  pageCount: number,
  pagesVisitedThisSession: number,
  returnedAfterDays: number | null
): CompletionSummary {
  const elapsedMs = record.progress.elapsedMs;
  const wordsRead = record.progress.runWordsRead;
  const averageWpm = elapsedMs > 0 ? Math.round((wordsRead / elapsedMs) * 60000) : 0;

  return {
    title: record.title,
    elapsedLabel: formatElapsed(elapsedMs),
    elapsedMs,
    averageWpm,
    wordsRead,
    rewoundWords: record.progress.runRewoundWords,
    rewoundPages: record.progress.runRewoundPages,
    pagesVisitedThisSession,
    maxPagesSingleSession: record.stats.maxPagesSingleSession,
    sessions: record.stats.sessions,
    completions: record.stats.completions,
    progressPercent: pageCount > 0 ? Math.round(((record.progress.pageIndex + 1) / pageCount) * 100) : 100,
    returnedAfterDays,
  };
}

function readStoredHistory(): StoredHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as StoredHistory;
  } catch {
    return {};
  }
}

function writeStoredHistory(value: StoredHistory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Keep the active session alive even if storage is unavailable.
  }
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

function calculateGapDays(now: number, updatedAt: number): number | null {
  const diff = Math.floor((now - updatedAt) / DAY_MS);
  return diff > 0 ? diff : null;
}
