import type { Book, BookLocale } from '../core/types';
import { splitTextIntoPages } from '../core/Parser';
import { turkishLocalizedBookPaths } from '../content/books-tr';
import { presetBookCatalog, type PresetBookDefinition } from './presetBookCatalog.generated';

const presetIds = new Set(presetBookCatalog.map((definition) => definition.id));
const presetDefinitions = new Map(presetBookCatalog.map((definition) => [definition.id, definition]));
const presetBookCache = new Map<string, Promise<Book>>();
const textCache = new Map<string, Promise<string>>();

export const presetBooks: Book[] = presetBookCatalog.map((definition) => makePresetSummary(definition));

export async function resolvePresetBookContent(book: Book, locale: BookLocale): Promise<Book> {
  if (!isPresetBookId(book.id)) return book;

  const definition = presetDefinitions.get(book.id);
  if (!definition) return book;

  const localizedPath = locale === 'tr' ? turkishLocalizedBookPaths[book.id] : undefined;
  const cacheKey = localizedPath ? `${book.id}:tr` : `${book.id}:en`;
  const cached = presetBookCache.get(cacheKey);
  if (cached) return cached;

  const pendingBook = buildResolvedPresetBook(definition, localizedPath).catch((error) => {
    presetBookCache.delete(cacheKey);
    throw error;
  });

  presetBookCache.set(cacheKey, pendingBook);
  return pendingBook;
}

function makePresetSummary(definition: PresetBookDefinition): Book {
  return {
    id: definition.id,
    title: definition.title,
    author: definition.author,
    cover: definition.cover,
    sourceLocale: definition.sourceLocale,
    pages: createPlaceholderPages(definition.pageCount),
  };
}

async function buildResolvedPresetBook(definition: PresetBookDefinition, localizedPath?: string): Promise<Book> {
  const [rawText, localizedText] = await Promise.all([
    fetchTextCached(definition.textPath),
    localizedPath
      ? fetchTextCached(localizedPath).catch((error) => {
          console.warn(`Fovera: failed to load Turkish preset localization for "${definition.id}".`, error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  return buildPresetBook(definition, rawText, localizedText ? { tr: localizedText } : undefined);
}

function buildPresetBook(
  definition: PresetBookDefinition,
  rawText: string,
  localizedTexts?: Partial<Record<BookLocale, string>>
): Book {
  return {
    id: definition.id,
    title: definition.title,
    author: definition.author,
    cover: definition.cover,
    sourceLocale: definition.sourceLocale,
    pages: splitTextIntoPages(rawText),
    localizedPages: mapLocalizedTexts(localizedTexts),
  };
}

function mapLocalizedTexts(localizedTexts?: Partial<Record<BookLocale, string>>): Partial<Record<BookLocale, string[]>> | undefined {
  if (!localizedTexts) return undefined;

  const mapped: Partial<Record<BookLocale, string[]>> = {};
  for (const [locale, text] of Object.entries(localizedTexts)) {
    if ((locale !== 'en' && locale !== 'tr') || typeof text !== 'string' || text.trim().length === 0) continue;
    mapped[locale] = splitTextIntoPages(text);
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function createPlaceholderPages(pageCount: number): string[] {
  return Array.from({ length: pageCount }, () => '');
}

function isPresetBookId(value: string): boolean {
  return presetIds.has(value);
}

function fetchTextCached(path: string): Promise<string> {
  const cached = textCache.get(path);
  if (cached) return cached;

  const pending = fetch(path)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load preset text ${path}: ${response.status}`);
      }
      return response.text();
    })
    .catch((error) => {
      textCache.delete(path);
      throw error;
    });

  textCache.set(path, pending);
  return pending;
}
