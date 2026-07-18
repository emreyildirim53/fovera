import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translate } from 'google-translate-api-x';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const booksDir = path.join(repoRoot, 'public', 'books');
const turkishBooksPath = path.join(repoRoot, 'src', 'content', 'books-tr.ts');
const outputPath = path.join(repoRoot, 'src', 'content', 'word-translations.json');

const BATCH_SIZE = 64;
const REQUEST_DELAY_MS = 80;
const MAX_RETRIES = 4;

async function main() {
  const existing = await readExistingTranslations();
  const enWords = await collectEnglishWords();
  const trWords = await collectTurkishWords();

  const nextData = {
    enToTr: { ...existing.enToTr },
    trToEn: { ...existing.trToEn },
  };

  const missingEn = enWords.filter((word) => !nextData.enToTr[word]);
  const missingTr = trWords.filter((word) => !nextData.trToEn[word]);

  console.log(`English unique words: ${enWords.length} (${missingEn.length} missing)`);
  console.log(`Turkish unique words: ${trWords.length} (${missingTr.length} missing)`);

  await translateWordsInto(nextData.enToTr, missingEn, 'en', 'tr');
  await translateWordsInto(nextData.trToEn, missingTr, 'tr', 'en');

  const sorted = {
    enToTr: sortRecord(nextData.enToTr),
    trToEn: sortRecord(nextData.trToEn),
  };

  await fs.writeFile(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(`Saved translations to ${path.relative(repoRoot, outputPath)}`);
}

async function readExistingTranslations() {
  try {
    const content = await fs.readFile(outputPath, 'utf8');
    const parsed = JSON.parse(content);
    return {
      enToTr: parsed.enToTr ?? {},
      trToEn: parsed.trToEn ?? {},
    };
  } catch {
    return {
      enToTr: {},
      trToEn: {},
    };
  }
}

async function collectEnglishWords() {
  const words = new Set();
  const entries = await fs.readdir(booksDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.txt')) continue;
    const text = await fs.readFile(path.join(booksDir, entry.name), 'utf8');
    for (const page of splitTextIntoPages(text)) {
      collectWordsFromText(words, page);
    }
  }

  return [...words].sort();
}

async function collectTurkishWords() {
  const source = await fs.readFile(turkishBooksPath, 'utf8');
  const words = new Set();
  const templateBlocks = [...source.matchAll(/`([\s\S]*?)`/g)];

  for (const [, block] of templateBlocks) {
    for (const page of splitTextIntoPages(block)) {
      collectWordsFromText(words, page);
    }
  }

  return [...words].sort();
}

function collectWordsFromText(target, text) {
  for (const rawWord of text.split(/\s+/)) {
    const normalized = normalizeWord(rawWord);
    if (normalized) target.add(normalized);
  }
}

function splitTextIntoPages(text) {
  return text
    .split('---PAGE---')
    .map((page) => page.trim())
    .filter(Boolean);
}

async function translateWordsInto(target, words, from, to) {
  if (words.length === 0) return;

  const batches = chunk(words, BATCH_SIZE);
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    const translations = await translateBatchWithRetry(batch, from, to, 0);

    for (let wordIndex = 0; wordIndex < batch.length; wordIndex++) {
      const sourceWord = batch[wordIndex];
      const translatedText = normalizeTranslationText(translations[wordIndex]?.text);
      target[sourceWord] = translatedText || sourceWord;
    }

    console.log(`${from}->${to} ${index + 1}/${batches.length}`);
    await sleep(REQUEST_DELAY_MS);
  }
}

async function translateBatchWithRetry(batch, from, to, attempt) {
  try {
    return await translate(batch, { from, to });
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    const backoffMs = 500 * 2 ** attempt;
    console.warn(`Retrying ${from}->${to} batch after ${backoffMs}ms`, error?.message ?? error);
    await sleep(backoffMs);
    return translateBatchWithRetry(batch, from, to, attempt + 1);
  }
}

function normalizeWord(word) {
  return word
    .toLocaleLowerCase('tr')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim();
}

function normalizeTranslationText(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function sortRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b, 'tr')));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
