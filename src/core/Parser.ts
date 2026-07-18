import type { Book, ParsedBook, SentenceInfo, WordToken } from './types';

const SENTENCE_BOUNDARY = /([.!?…]+)/g;
const TRAILING_PUNCTUATION = /([.,!?;:…"'”’)\]]+)$/;

/**
 * Splits a page of raw text into sentence strings. A sentence is any run of
 * text terminated by one of `. ! ? …` (repeated punctuation, e.g. "?!" or
 * "...", counts as a single boundary). Text with no terminal punctuation at
 * all is still returned as a single trailing "sentence" so no content is lost.
 */
function splitIntoSentenceStrings(pageText: string): string[] {
  const chunks = pageText.replace(SENTENCE_BOUNDARY, '$1\n').split('\n');
  const sentences: string[] = [];
  let buffer = '';

  for (const chunk of chunks) {
    buffer += chunk;
    if (/[.!?…]\s*$/.test(chunk.trim())) {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) sentences.push(trimmed);
      buffer = '';
    }
  }
  const remainder = buffer.trim();
  if (remainder.length > 0) sentences.push(remainder);

  return sentences.length > 0 ? sentences : [pageText];
}

/** Word-tuned reading delay in ms at 1.0x / 300 WPM baseline, before speed multiplier. */
function baseReadingDelay(word: string, baseWpm: number): number {
  const base = 60000 / baseWpm;
  const len = word.length;
  if (len <= 3) return base * 0.8;
  if (len <= 6) return base;
  if (len <= 10) return base * 1.3;
  return base * 1.6;
}

/**
 * Parses a `Book`'s raw page texts into a flat, index-addressable word model
 * plus sentence range metadata. This is the single source of truth consumed
 * by the reader engine, gesture controller (for browse snapping), and the
 * render layer.
 */
export function parseBook(book: Book, baseWpm = 300): ParsedBook {
  const words: WordToken[] = [];
  const sentences: SentenceInfo[] = [];

  let globalIndex = 0;
  let sentenceIndex = 0;
  let paragraphIndex = 0;

  const pages = book.pages ?? [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageText = pages[pageIndex] ?? '';
    // A blank line inside a page starts a new paragraph; pages themselves
    // always start a fresh paragraph too.
    const paragraphTexts = pageText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const effectiveParagraphs = paragraphTexts.length > 0 ? paragraphTexts : [pageText];

    for (const paragraphText of effectiveParagraphs) {
      const sentenceStrings = splitIntoSentenceStrings(paragraphText);

      for (let sIdx = 0; sIdx < sentenceStrings.length; sIdx++) {
        const sentenceText = sentenceStrings[sIdx]!;
        const rawWords = sentenceText.split(/\s+/).filter((w) => w.length > 0);
        const sentenceStart = globalIndex;

        for (let w = 0; w < rawWords.length; w++) {
          const raw = rawWords[w]!;
          const punctMatch = raw.match(TRAILING_PUNCTUATION);
          const isLastWordOfSentence = w === rawWords.length - 1;
          const isLastWordOfParagraph = isLastWordOfSentence && sIdx === sentenceStrings.length - 1;

          words.push({
            word: raw,
            globalIndex,
            sentenceIndex,
            positionInSentence: w,
            paragraphIndex,
            pageIndex,
            endsSentence: isLastWordOfSentence,
            endsParagraph: isLastWordOfParagraph,
            punctuation: punctMatch ? punctMatch[1] ?? null : null,
            readingDelay: baseReadingDelay(raw, baseWpm),
          });
          globalIndex++;
        }

        sentences.push({
          startIndex: sentenceStart,
          endIndex: globalIndex - 1,
          pageIndex,
          sentenceIndex,
        });
        sentenceIndex++;
      }
      paragraphIndex++;
    }
  }

  return { book, words, sentences };
}

/** Binary search for the sentence containing a given global word index. */
export function findSentenceIndexForWord(sentences: SentenceInfo[], wordIndex: number): number {
  let lo = 0;
  let hi = sentences.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = sentences[mid]!;
    if (wordIndex < s.startIndex) hi = mid - 1;
    else if (wordIndex > s.endIndex) lo = mid + 1;
    else return mid;
  }
  return Math.max(0, Math.min(sentences.length - 1, lo));
}

/** Splits raw pasted/uploaded text into pages using the `---PAGE---` marker, falling back to blank-line paragraphs. */
export function splitTextIntoPages(text: string): string[] {
  const marked = text
    .split('---PAGE---')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (marked.length > 0) return marked;

  const byBlankLine = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return byBlankLine.length > 0 ? byBlankLine : [text.trim()];
}
