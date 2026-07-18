/**
 * Core domain types shared across the reader engine, gesture controller,
 * and rendering layer. Keeping these in one place lets every module agree
 * on the exact shape of a "word" without re-deriving it.
 */

/** A single word/token produced by the parser, enriched for playback, analytics, and future AI features. */
export interface WordToken {
  /** The literal word text (punctuation stripped, see `punctuation`). */
  word: string;
  /** Index of this word within the entire book (0-based, monotonic). */
  globalIndex: number;
  /** Index of the sentence this word belongs to (0-based, monotonic across the book). */
  sentenceIndex: number;
  /** 0-based position of this word within its sentence. */
  positionInSentence: number;
  /** Index of the paragraph this word belongs to (0-based, monotonic across the book). */
  paragraphIndex: number;
  /** Index of the page this word belongs to (0-based). */
  pageIndex: number;
  /** True if this word is the last word of its sentence. */
  endsSentence: boolean;
  /** True if this word is the last word of its paragraph. */
  endsParagraph: boolean;
  /** Trailing punctuation captured from the source text, if any (e.g. ".", ",", "!?"). */
  punctuation: string | null;
  /** Suggested display duration in milliseconds at 1.0x speed, before the live speed multiplier is applied. */
  readingDelay: number;
}

/** A sentence, expressed as a contiguous range over the book's flat word list. */
export interface SentenceInfo {
  /** Global index (inclusive) of the sentence's first word. */
  startIndex: number;
  /** Global index (inclusive) of the sentence's last word. */
  endIndex: number;
  /** Page this sentence appears on. */
  pageIndex: number;
  /** 0-based sentence index within the book. */
  sentenceIndex: number;
}

export type BookLocale = 'en' | 'tr';
export type VisibleWordCount = 1 | 2 | 3;

/** A book as stored in the library (preset or user-added). */
export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  icon?: string;
  /** Locale of the canonical `pages` array when no localized override is available. */
  sourceLocale: BookLocale;
  /** Raw page texts; each entry is one page of plain text/paragraphs. */
  pages: string[];
  /** Optional localized page sets keyed by locale code. */
  localizedPages?: Partial<Record<BookLocale, string[]>>;
}

/** The fully parsed, ready-to-play representation of a book. */
export interface ParsedBook {
  book: Book;
  words: WordToken[];
  sentences: SentenceInfo[];
}

/** Persisted reading progress for a single book. */
export interface ReadingProgress {
  bookId: string;
  wordIndex: number;
  elapsedMs: number;
  updatedAt: number;
}
