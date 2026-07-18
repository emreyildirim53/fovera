import { findSentenceIndexForWord, parseBook } from '../core/Parser';
import type { Book, BookLocale, ParsedBook, SentenceInfo, VisibleWordCount, WordToken } from '../core/types';
import { extractReferenceNames, translateWord } from '../content/wordTranslations';

/** A small window of browse rows around a candidate sentence, ready for rendering. */
export interface BrowseRow {
  /** Distance from the target sentence, e.g. -2..2. */
  offset: number;
  sentenceIndex: number | null;
  words: Array<{ word: string; isCenter: boolean }>;
}

interface LoadBookOptions {
  sourceLocale?: BookLocale;
  referencePages?: readonly string[];
}

/**
 * Owns the parsed book and the reader's position within it. Pure/synchronous:
 * no timers, no DOM. `PlaybackEngine` drives it forward over time and
 * `GestureController` drives it during browsing.
 */
export class ReaderEngine {
  private parsed: ParsedBook | null = null;
  private sourceLocale: BookLocale = 'en';
  private referenceNames: ReadonlySet<string> | null = null;
  private visibleWordCount: VisibleWordCount = 1;
  private wordIndex = 0;
  private sentenceIndex = 0;

  loadBook(book: Book, options: LoadBookOptions = {}): void {
    this.parsed = parseBook(book);
    this.sourceLocale = options.sourceLocale ?? 'en';
    this.referenceNames = options.referencePages?.length ? extractReferenceNames(options.referencePages) : null;
    this.wordIndex = 0;
    this.sentenceIndex = 0;
  }

  get isLoaded(): boolean {
    return this.parsed !== null;
  }

  get wordCount(): number {
    return this.parsed?.words.length ?? 0;
  }

  get currentWordIndex(): number {
    return this.wordIndex;
  }

  get currentSentenceIndex(): number {
    return this.sentenceIndex;
  }

  get currentWord(): WordToken | null {
    return this.parsed?.words[this.wordIndex] ?? null;
  }

  get currentTranslatedWord(): string | null {
    const translated = this.currentDisplayTranslations[0] ?? '';
    return translated.length > 0 ? translated : null;
  }

  get currentDisplayWords(): string[] {
    return this.getDisplayTokensAtWord(this.wordIndex).map((token) => token.word);
  }

  get currentDisplayTranslations(): string[] {
    const sentenceWords = this.getSentenceWords(this.sentenceIndex);
    return this.getDisplayTokensAtWord(this.wordIndex)
      .map((token) =>
        translateWord(token.word, {
          sourceLocale: this.sourceLocale,
          sentenceWords,
          referenceNames: this.referenceNames,
        }).trim()
      )
      .filter((translation) => translation.length > 0);
  }

  get currentBook(): Book | null {
    return this.parsed?.book ?? null;
  }

  get totalPages(): number {
    return this.parsed?.book.pages.length ?? 0;
  }

  get pages(): string[] {
    return this.parsed?.book.pages ?? [];
  }

  get currentPageIndex(): number {
    return this.currentWord?.pageIndex ?? 0;
  }

  get nextWord(): WordToken | null {
    if (!this.parsed) return null;
    return this.parsed.words[this.wordIndex + 1] ?? null;
  }

  wordAt(index: number): WordToken | null {
    return this.parsed?.words[index] ?? null;
  }

  setVisibleWordCount(count: VisibleWordCount): void {
    this.visibleWordCount = count;
  }

  getWordWindow(index: number, radius = 1): Array<{ word: string; isCenter: boolean }> {
    const current = this.wordAt(index);
    if (!this.parsed || !current) return [];
    const sentence = this.sentenceAt(current.sentenceIndex);
    if (!sentence) return [{ word: current.word, isCenter: true }];

    const start = Math.max(sentence.startIndex, index - radius);
    const end = Math.min(sentence.endIndex, index + radius);
    const words: Array<{ word: string; isCenter: boolean }> = [];
    for (let i = start; i <= end; i++) {
      const token = this.wordAt(i);
      if (!token) continue;
      words.push({ word: token.word, isCenter: i === index });
    }
    return words;
  }

  getSentencePreviewAtProgress(sentenceIndex: number, progress: number, maxWords = 5): Array<{ word: string; isCenter: boolean }> {
    const sentence = this.sentenceAt(sentenceIndex);
    if (!this.parsed || !sentence) return [];

    const sentenceWords = this.parsed.words.slice(sentence.startIndex, sentence.endIndex + 1);
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const targetIndex = Math.round(clampedProgress * Math.max(0, sentenceWords.length - 1));
    const radius = Math.floor(maxWords / 2);
    let start = Math.max(0, targetIndex - radius);
    let end = Math.min(sentenceWords.length - 1, start + maxWords - 1);
    start = Math.max(0, end - (maxWords - 1));

    return sentenceWords.slice(start, end + 1).map((token) => ({
      word: token.word,
      isCenter: false,
    }));
  }

  buildContextPreviewAtProgress(
    sentenceIndex: number,
    progress: number,
    options: { leadingWord?: string; trailingWord?: string; maxWords?: number } = {}
  ): Array<{ word: string; isCenter: boolean }> {
    const overlapCount = (options.leadingWord ? 1 : 0) + (options.trailingWord ? 1 : 0);
    const maxWords = Math.max(1, options.maxWords ?? 5);
    const previewSlots = Math.max(1, maxWords - overlapCount);
    const preview = this.getSentencePreviewAtProgress(sentenceIndex, progress, previewSlots);
    const words: Array<{ word: string; isCenter: boolean }> = [];

    if (options.leadingWord) {
      words.push({ word: options.leadingWord, isCenter: false });
    }

    words.push(...preview);

    if (options.trailingWord) {
      words.push({ word: options.trailingWord, isCenter: false });
    }

    return words.slice(0, maxWords);
  }

  sentenceAt(index: number): SentenceInfo | null {
    return this.parsed?.sentences[index] ?? null;
  }

  get sentenceCount(): number {
    return this.parsed?.sentences.length ?? 0;
  }

  get isAtEnd(): boolean {
    return !this.parsed || this.wordIndex >= this.parsed.words.length - 1;
  }

  /** Advances to the next word. Returns false if the book has ended. */
  advance(): boolean {
    if (!this.parsed || this.wordIndex >= this.parsed.words.length - 1) return false;
    this.wordIndex++;
    this.sentenceIndex = findSentenceIndexForWord(this.parsed.sentences, this.wordIndex);
    return true;
  }

  /** Jumps directly to a specific word index, clamped to valid range. */
  jumpToWord(index: number): void {
    if (!this.parsed) return;
    this.wordIndex = Math.max(0, Math.min(this.parsed.words.length - 1, index));
    this.sentenceIndex = findSentenceIndexForWord(this.parsed.sentences, this.wordIndex);
  }

  jumpToPage(pageIndex: number): void {
    if (!this.parsed) return;
    const target = this.parsed.words.find((word) => word.pageIndex === Math.max(0, Math.min(this.totalPages - 1, pageIndex)));
    if (!target) return;
    this.jumpToWord(target.globalIndex);
  }

  /** Jumps to the midpoint word of a sentence (used when committing a browse selection). */
  jumpToSentenceMidpoint(sentenceIdx: number): void {
    const sentence = this.sentenceAt(sentenceIdx);
    if (!sentence) return;
    const span = sentence.endIndex - sentence.startIndex;
    this.jumpToWord(sentence.startIndex + Math.floor(span / 2));
    this.sentenceIndex = sentenceIdx;
  }

  resetToStart(): void {
    this.wordIndex = 0;
    this.sentenceIndex = 0;
  }

  /**
   * Builds a window of browse rows centered on `targetSentenceIdx`, each
   * containing up to 3 words (previous / current candidate / next) with the
   * true center word of that sentence always aligned to the reading anchor.
   */
  buildBrowseRows(targetSentenceIdx: number, windowSize = 2): BrowseRow[] {
    const rows: BrowseRow[] = [];
    if (!this.parsed) return rows;

    for (let offset = -windowSize; offset <= windowSize; offset++) {
      const sIdx = targetSentenceIdx + offset;
      const sentence = this.sentenceAt(sIdx);
      if (sIdx < 0 || sIdx >= this.parsed.sentences.length || !sentence) {
        rows.push({ offset, sentenceIndex: null, words: [] });
        continue;
      }
      const sentenceWords = this.parsed.words.slice(sentence.startIndex, sentence.endIndex + 1);
      const mid = Math.floor(sentenceWords.length / 2);
      const start = Math.max(0, mid - 1);
      const end = Math.min(sentenceWords.length - 1, mid + 1);
      const words = [];
      for (let i = start; i <= end; i++) {
        words.push({ word: sentenceWords[i]!.word, isCenter: i === mid });
      }
      rows.push({ offset, sentenceIndex: sIdx, words });
    }
    return rows;
  }

  buildBrowseRowsAroundWord(targetWordIndex: number, windowSize = 1): BrowseRow[] {
    const target = this.wordAt(targetWordIndex);
    if (!target) return [];
    const targetSentence = this.sentenceAt(target.sentenceIndex);
    const targetSentenceLength = targetSentence ? targetSentence.endIndex - targetSentence.startIndex + 1 : 1;
    const sentenceProgress = targetSentenceLength <= 1 ? 0 : target.positionInSentence / (targetSentenceLength - 1);
    const targetWindow = this.getDisplayTokensAtWord(targetWordIndex).map((token, index) => ({
      word: token.word,
      isCenter: index === 0,
    }));
    const previousVisibleWord = targetSentence && targetWordIndex > targetSentence.startIndex ? this.wordAt(targetWordIndex - 1)?.word : undefined;
    const nextVisibleWord = targetSentence && targetWordIndex < targetSentence.endIndex ? this.wordAt(targetWordIndex + 1)?.word : undefined;

    const rows: BrowseRow[] = [];
    for (let offset = -windowSize; offset <= windowSize; offset++) {
      const sentenceIndex = target.sentenceIndex + offset;
      const sentence = this.sentenceAt(sentenceIndex);
      if (!sentence) {
        rows.push({ offset, sentenceIndex: null, words: [] });
        continue;
      }

      if (offset === 0) {
        rows.push({
          offset,
          sentenceIndex,
          words: targetWindow,
        });
        continue;
      }

      rows.push({
        offset,
        sentenceIndex,
        words:
          offset < 0
            ? this.buildContextPreviewAtProgress(sentenceIndex, sentenceProgress, {
                trailingWord: previousVisibleWord,
                maxWords: 5,
              })
            : this.buildContextPreviewAtProgress(sentenceIndex, sentenceProgress, {
                leadingWord: nextVisibleWord,
                maxWords: 5,
              }),
      });
    }
    return rows;
  }

  private getDisplayTokensAtWord(index: number): WordToken[] {
    if (!this.parsed) return [];
    const current = this.wordAt(index);
    const sentence = current ? this.sentenceAt(current.sentenceIndex) : null;
    if (!current || !sentence) return current ? [current] : [];

    const endIndex = Math.min(sentence.endIndex, index + this.visibleWordCount - 1);
    return this.parsed.words.slice(index, endIndex + 1);
  }

  private getSentenceWords(sentenceIndex: number): string[] | undefined {
    const sentence = this.sentenceAt(sentenceIndex);
    if (!sentence || !this.parsed) return undefined;
    return this.parsed.words.slice(sentence.startIndex, sentence.endIndex + 1).map((token) => token.word);
  }
}
