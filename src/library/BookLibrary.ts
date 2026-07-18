import type { Book } from '../core/types';
import { presetBooks, resolvePresetBookContent } from './presetBooks';
import { splitTextIntoPages } from '../core/Parser';

const LEGACY_STORAGE_KEY = 'fixate-reader:custom-books:v1';
const DB_NAME = 'fovera-library';
const DB_VERSION = 1;
const STORE_NAME = 'custom-books';

type CustomBookInput = Omit<Book, 'id' | 'sourceLocale'> & { id?: string; sourceLocale?: Book['sourceLocale'] };

/**
 * Holds the book catalog: built-in stories plus user-added books. Custom books
 * are persisted in IndexedDB to better support large uploads such as long PDFs,
 * with a legacy localStorage migration path for existing installs.
 */
export class BookLibrary {
  readonly ready: Promise<void>;
  private customBooks: Book[] = [];

  constructor() {
    this.ready = this.loadCustomBooks();
  }

  get presets(): readonly Book[] {
    return presetBooks;
  }

  get custom(): readonly Book[] {
    return this.customBooks;
  }

  async resolveBookForReading(book: Book, locale: 'en' | 'tr'): Promise<Book> {
    return resolvePresetBookContent(book, locale);
  }

  async addFromText(title: string, text: string): Promise<Book> {
    return this.addBook({
      title,
      author: 'Personal',
      icon: '📖',
      sourceLocale: detectBookLocale([text]),
      pages: splitTextIntoPages(text),
    });
  }

  async addBook(bookInput: CustomBookInput): Promise<Book> {
    const book = normalizeCustomBook(bookInput);
    this.customBooks.push(book);
    await this.persistBook(book);
    return book;
  }

  private async loadCustomBooks(): Promise<void> {
    const legacyBooks = this.loadLegacyBooks();

    try {
      const dbBooks = await readAllBooksFromDb();
      const mergedBooks = mergeBooks(dbBooks, legacyBooks);
      this.customBooks = mergedBooks;

      if (mergedBooks.length !== dbBooks.length || legacyBooks.length > 0) {
        await replaceAllBooksInDb(mergedBooks);
        this.clearLegacyStorage();
      }
      return;
    } catch {
      this.customBooks = legacyBooks;
    }
  }

  private loadLegacyBooks(): Book[] {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeStoredBook).filter((book): book is Book => book !== null);
    } catch {
      return [];
    }
  }

  private clearLegacyStorage(): void {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Non-fatal; IndexedDB is the primary persistence path.
    }
  }

  private async persistBook(book: Book): Promise<void> {
    try {
      await writeBookToDb(book);
      this.clearLegacyStorage();
    } catch {
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.customBooks));
      } catch {
        // Persistence can fail (quota/private mode). The active session keeps
        // the imported book in memory so reading may continue without crashing.
      }
    }
  }
}

function normalizeCustomBook(bookInput: CustomBookInput): Book {
  const title = bookInput.title.trim() || 'Untitled';
  const pages = normalizePages(bookInput.pages);
  const sourceLocale = normalizeSourceLocale(bookInput.sourceLocale, pages);
  return {
    ...bookInput,
    id: bookInput.id ?? createCustomBookId(),
    title,
    author: bookInput.author.trim() || 'Personal',
    sourceLocale,
    pages: pages.length > 0 ? pages : [''],
    cover: bookInput.cover?.trim() || undefined,
    icon: bookInput.icon?.trim() || undefined,
    localizedPages: normalizeLocalizedPages(bookInput.localizedPages),
  };
}

function normalizeStoredBook(value: unknown): Book | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<Book>;
  if (typeof candidate.title !== 'string' || typeof candidate.author !== 'string' || !Array.isArray(candidate.pages)) {
    return null;
  }

  return normalizeCustomBook({
    id: typeof candidate.id === 'string' ? candidate.id : undefined,
    title: candidate.title,
    author: candidate.author,
    cover: typeof candidate.cover === 'string' ? candidate.cover : undefined,
    icon: typeof candidate.icon === 'string' ? candidate.icon : undefined,
    sourceLocale: candidate.sourceLocale,
    pages: candidate.pages.filter((page): page is string => typeof page === 'string'),
    localizedPages: candidate.localizedPages,
  });
}

function normalizePages(pages: readonly string[]): string[] {
  return pages
    .map((page) => page.replace(/\r/g, '').trim())
    .filter((page) => page.length > 0);
}

function normalizeLocalizedPages(localizedPages: Book['localizedPages']): Book['localizedPages'] {
  if (!localizedPages) return undefined;

  const normalized: Partial<Record<'en' | 'tr', string[]>> = {};
  for (const [locale, pages] of Object.entries(localizedPages)) {
    if (!Array.isArray(pages)) continue;
    const nextPages = normalizePages(pages);
    if (nextPages.length === 0) continue;
    if (locale === 'en' || locale === 'tr') {
      normalized[locale] = nextPages;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSourceLocale(sourceLocale: unknown, pages: readonly string[]): 'en' | 'tr' {
  if (sourceLocale === 'en' || sourceLocale === 'tr') {
    return sourceLocale;
  }
  return detectBookLocale(pages);
}

function detectBookLocale(pages: readonly string[]): 'en' | 'tr' {
  const sample = pages.slice(0, 3).join('\n ').toLocaleLowerCase('tr');
  if (!sample) return 'en';

  const turkishLetterHits = (sample.match(/[çğıöşü]/g) ?? []).length;
  const turkishWordHits = (sample.match(/\b(ve|bir|bu|için|ile|ama|gibi|daha|çok|şey|kadar|sonra)\b/gu) ?? []).length;
  return turkishLetterHits >= 8 || turkishWordHits >= 6 ? 'tr' : 'en';
}

function mergeBooks(primary: readonly Book[], secondary: readonly Book[]): Book[] {
  const merged = new Map<string, Book>();
  for (const book of [...primary, ...secondary]) {
    merged.set(book.id, book);
  }
  return Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function createCustomBookId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function openLibraryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
  });
}

async function readAllBooksFromDb(): Promise<Book[]> {
  const db = await openLibraryDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await requestToPromise<Book[]>(store.getAll());
    await transactionDone(tx);
    return result.map(normalizeStoredBook).filter((book): book is Book => book !== null);
  } finally {
    db.close();
  }
}

async function writeBookToDb(book: Book): Promise<void> {
  const db = await openLibraryDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(book);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

async function replaceAllBooksInDb(books: readonly Book[]): Promise<void> {
  const db = await openLibraryDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const book of books) {
      store.put(book);
    }
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}
