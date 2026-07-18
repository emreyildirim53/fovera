import glossaryUrl from './word-translations.json?url';
import type { BookLocale } from '../core/types';

interface WordTranslationTables {
  enToTr: Record<string, string>;
  trToEn: Record<string, string>;
}

export interface TranslateWordOptions {
  sourceLocale: BookLocale;
  sentenceWords?: readonly string[];
  referenceNames?: ReadonlySet<string> | null;
}

let translationsCache: WordTranslationTables | null = null;
let pendingLoad: Promise<void> | null = null;
let reverseFallbackCache: Record<string, string> | null = null;

export function getTranslationLocale(sourceLocale: BookLocale): BookLocale {
  return sourceLocale === 'tr' ? 'en' : 'tr';
}

export async function ensureWordTranslationsLoaded(): Promise<void> {
  if (translationsCache) return;
  if (pendingLoad) return pendingLoad;

  pendingLoad = fetch(glossaryUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load word translations: ${response.status}`);
      }
      translationsCache = (await response.json()) as WordTranslationTables;
      reverseFallbackCache = buildReverseFallbackTable(translationsCache);
    })
    .finally(() => {
      pendingLoad = null;
    });

  return pendingLoad;
}

export function translateWord(word: string, options: TranslateWordOptions): string {
  const sourceLocale = options.sourceLocale;
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) return '';

  if (sourceLocale === 'tr') {
    const protectedName =
      protectReferenceName(word, options.referenceNames) ?? protectSentenceName(word, options.sentenceWords);
    if (protectedName) {
      return protectedName;
    }
  }

  if (sourceLocale === 'tr') {
    if (!translationsCache) return '';
    return translationsCache.trToEn[normalizedWord] ?? reverseFallbackCache?.[normalizedWord] ?? normalizedWord;
  }

  const table = translationsCache?.enToTr;
  if (!table) return '';
  return table[normalizedWord] ?? normalizedWord;
}

export const preloadWordTranslations = ensureWordTranslationsLoaded;

export function extractReferenceNames(pages: readonly string[]): ReadonlySet<string> {
  const tallies = new Map<string, { count: number; adjacentTitleCaseHits: number }>();

  for (const page of pages) {
    for (const sentence of splitIntoSentenceStrings(page)) {
      const words = sentence.split(/\s+/).filter(Boolean);
      for (let index = 0; index < words.length; index++) {
        const candidate = extractTitleCaseReferenceToken(words[index] ?? '');
        if (!candidate) continue;

        const normalized = normalizeWord(candidate);
        if (!normalized) continue;

        const previous = extractTitleCaseReferenceToken(words[index - 1] ?? '');
        const next = extractTitleCaseReferenceToken(words[index + 1] ?? '');
        const tally = tallies.get(normalized) ?? { count: 0, adjacentTitleCaseHits: 0 };
        tally.count += 1;
        if (previous || next) {
          tally.adjacentTitleCaseHits += 1;
        }
        tallies.set(normalized, tally);
      }
    }
  }

  return new Set(
    [...tallies.entries()]
      .filter(([, tally]) => tally.count > 1 || tally.adjacentTitleCaseHits > 0)
      .map(([normalized]) => normalized)
  );
}

function normalizeWord(word: string): string {
  return word
    .toLocaleLowerCase('tr')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim();
}

function buildReverseFallbackTable(tables: WordTranslationTables): Record<string, string> {
  const reversed: Record<string, string> = { ...tables.trToEn };

  for (const [englishWord, turkishWord] of Object.entries(tables.enToTr)) {
    const normalizedTurkishWord = normalizeWord(turkishWord);
    if (!normalizedTurkishWord || reversed[normalizedTurkishWord]) continue;
    reversed[normalizedTurkishWord] = englishWord;
  }

  return reversed;
}

function protectReferenceName(word: string, referenceNames?: ReadonlySet<string> | null): string | null {
  if (!referenceNames || referenceNames.size === 0) return null;
  const token = parseProperNounToken(word);
  if (!token || !referenceNames.has(token.baseNormalized)) return null;
  return inflectPreservedName(token.baseOriginal, token.suffixNormalized);
}

function protectSentenceName(word: string, sentenceWords?: readonly string[]): string | null {
  if (!sentenceWords?.length) return null;
  const token = parseProperNounToken(word);
  if (!token) return null;

  const rawIndex = sentenceWords.findIndex((candidate) => candidate === word);
  if (rawIndex === -1) return null;

  const previous = parseProperNounToken(sentenceWords[rawIndex - 1] ?? '');
  const next = parseProperNounToken(sentenceWords[rawIndex + 1] ?? '');
  if (!previous && !next) return null;

  return inflectPreservedName(token.baseOriginal, token.suffixNormalized);
}

function parseProperNounToken(word: string): { baseOriginal: string; baseNormalized: string; suffixNormalized: string | null } | null {
  const trimmed = trimOuterPunctuation(word);
  if (!trimmed) return null;

  const match = trimmed.match(/^([\p{Lu}][\p{L}-]{1,})(?:['’]([\p{L}]+))?$/u);
  if (!match) return null;

  const baseOriginal = match[1] ?? '';
  const baseNormalized = normalizeWord(baseOriginal);
  if (!baseNormalized) return null;

  return {
    baseOriginal,
    baseNormalized,
    suffixNormalized: match[2] ? match[2].toLocaleLowerCase('tr') : null,
  };
}

function inflectPreservedName(base: string, suffixNormalized: string | null): string {
  if (!suffixNormalized) return base;
  if (GENITIVE_SUFFIXES.has(suffixNormalized)) {
    return `${base}'s`;
  }
  return base;
}

function trimOuterPunctuation(word: string): string {
  return String(word ?? '')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’-]+$/gu, '')
    .trim();
}

function extractTitleCaseReferenceToken(word: string): string | null {
  const trimmed = trimOuterPunctuation(word).replace(/['’]s$/i, '');
  if (!trimmed || trimmed.length < 2) return null;
  return /^[A-Z][A-Za-z-]+$/.test(trimmed) ? trimmed : null;
}

function splitIntoSentenceStrings(pageText: string): string[] {
  const chunks = pageText.replace(/([.!?…]+)/g, '$1\n').split('\n');
  const sentences: string[] = [];
  let buffer = '';

  for (const chunk of chunks) {
    buffer += chunk;
    if (/[.!?…]\s*$/.test(chunk.trim())) {
      const trimmed = buffer.trim();
      if (trimmed) sentences.push(trimmed);
      buffer = '';
    }
  }

  const remainder = buffer.trim();
  if (remainder) sentences.push(remainder);
  return sentences.length > 0 ? sentences : [pageText];
}

const GENITIVE_SUFFIXES = new Set(['in', 'ın', 'un', 'ün', 'nin', 'nın', 'nun', 'nün']);
