import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import translate from 'google-translate-api-x';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const booksDir = path.join(repoRoot, 'public', 'books');
const outputDir = path.join(repoRoot, 'public', 'books-tr');

const CHUNK_CHAR_LIMIT = 4500;
const REQUEST_DELAY_MS = 120;
const MAX_RETRIES = 4;
const TRANSLATION_CONCURRENCY = 4;

const targets = [
  ['p1', 'alice-adventures-in-wonderland.txt', 'alice-adventures-in-wonderland.tr.txt'],
  ['p2', 'pinocchio-the-tale-of-a-puppet.txt', 'pinocchio-the-tale-of-a-puppet.tr.txt'],
  ['p3', 'treasure-island.txt', 'treasure-island.tr.txt'],
  ['p4', 'the-wonderful-wizard-of-oz.txt', 'the-wonderful-wizard-of-oz.tr.txt'],
  ['p5', 'the-secret-garden.txt', 'the-secret-garden.tr.txt'],
  ['p6', 'a-little-princess.txt', 'a-little-princess.tr.txt'],
  ['anne-of-green-gables', 'anne-of-green-gables.txt', 'anne-of-green-gables.tr.txt'],
  ['peter-pan', 'peter-pan.txt', 'peter-pan.tr.txt'],
  ['the-adventures-of-tom-sawyer', 'the-adventures-of-tom-sawyer.txt', 'the-adventures-of-tom-sawyer.tr.txt'],
  ['little-women', 'little-women.txt', 'little-women.tr.txt'],
  ['black-beauty', 'black-beauty.txt', 'black-beauty.tr.txt'],
  ['heidi', 'heidi.txt', 'heidi.tr.txt'],
  ['the-wind-in-the-willows', 'the-wind-in-the-willows.txt', 'the-wind-in-the-willows.tr.txt'],
  ['around-the-world-in-eighty-days', 'around-the-world-in-eighty-days.txt', 'around-the-world-in-eighty-days.tr.txt'],
  ['the-adventures-of-sherlock-holmes', 'the-adventures-of-sherlock-holmes.txt', 'the-adventures-of-sherlock-holmes.tr.txt'],
  ['the-jungle-book', 'the-jungle-book.txt', 'the-jungle-book.tr.txt'],
  ['the-time-machine', 'the-time-machine.txt', 'the-time-machine.tr.txt'],
  ['the-hound-of-the-baskervilles', 'the-hound-of-the-baskervilles.txt', 'the-hound-of-the-baskervilles.tr.txt'],
  ['kidnapped', 'kidnapped.txt', 'kidnapped.tr.txt'],
  ['the-call-of-the-wild', 'the-call-of-the-wild.txt', 'the-call-of-the-wild.tr.txt'],
  ['the-lost-world', 'the-lost-world.txt', 'the-lost-world.tr.txt'],
  ['the-island-of-doctor-moreau', 'the-island-of-doctor-moreau.txt', 'the-island-of-doctor-moreau.tr.txt'],
];

await fs.mkdir(outputDir, { recursive: true });

for (const [bookId, sourceFile, outputFile] of targets) {
  const sourcePath = path.join(booksDir, sourceFile);
  const outputPath = path.join(outputDir, outputFile);

  try {
    await fs.access(outputPath);
    console.log(`\n[Fovera] Skipping ${bookId}; ${outputFile} already exists`);
    continue;
  } catch {
    // Missing file is expected for books that still need translation.
  }

  console.log(`\n[Fovera] Translating ${bookId} from ${sourceFile}`);

  const sourceText = await fs.readFile(sourcePath, 'utf8');
  const translatedText = await translateBook(sourceText);
  await fs.writeFile(outputPath, `${translatedText.trim()}\n`, 'utf8');

  const pageCount = translatedText.split('---PAGE---').filter((page) => page.trim().length > 0).length;
  console.log(`[Fovera] Wrote ${outputFile} (${pageCount} pages)`);
}

async function translateBook(sourceText) {
  const pages = sourceText
    .split('---PAGE---')
    .map((page) => page.trim())
    .filter((page) => page.length > 0);

  const chunks = chunkPages(pages);
  const translatedChunks = await translateChunksInParallel(chunks);

  const joined = translatedChunks.join('\n\n');
  return restorePageBreaks(joined)
    .split('---PAGE---')
    .map((page) => page.trim())
    .filter((page) => page.length > 0)
    .join('\n\n---PAGE---\n\n');
}

function chunkPages(pages) {
  const units = [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    if (pageIndex > 0) {
      units.push(`[[[PAGE_BREAK_${pageIndex}]]]`);
    }
    const paragraphs = pages[pageIndex]
      .split(/\n\s*\n/u)
      .map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      units.push('');
      continue;
    }

    for (const paragraph of paragraphs) {
      const slices = splitLongParagraph(paragraph, CHUNK_CHAR_LIMIT - 240);
      for (const slice of slices) {
        units.push(slice);
      }
    }
  }

  const chunks = [];
  let current = '';

  for (const unit of units) {
    const candidate = current.length === 0 ? unit : `${current}\n\n${unit}`;
    if (current.length > 0 && candidate.length > CHUNK_CHAR_LIMIT) {
      chunks.push(current);
      current = unit;
      continue;
    }
    current = candidate;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function splitLongParagraph(paragraph, limit) {
  if (paragraph.length <= limit) return [paragraph];

  const sentences = paragraph.match(/[^.!?…]+[.!?…]*/gu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [paragraph];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const candidate = current.length === 0 ? sentence : `${current} ${sentence}`;
    if (current.length > 0 && candidate.length > limit) {
      chunks.push(current);
      current = sentence;
      continue;
    }

    if (sentence.length > limit) {
      if (current.length > 0) {
        chunks.push(current);
        current = '';
      }
      chunks.push(...hardSplit(sentence, limit));
      continue;
    }

    current = candidate;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function hardSplit(text, limit) {
  const words = text.split(/\s+/u).filter(Boolean);
  const parts = [];
  let current = '';

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (current.length > 0 && candidate.length > limit) {
      parts.push(current);
      current = word;
      continue;
    }
    current = candidate;
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

async function translateChunk(chunk) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translate(chunk, {
        from: 'en',
        to: 'tr',
        forceBatch: false,
      });
      return result.text;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      const delay = REQUEST_DELAY_MS * attempt * 3;
      console.warn(`[Fovera]   retry ${attempt}/${MAX_RETRIES - 1} after ${delay}ms: ${error?.message ?? error}`);
      await sleep(delay);
    }
  }

  return chunk;
}

async function translateChunksInParallel(chunks) {
  const translatedChunks = new Array(chunks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= chunks.length) return;

      console.log(`[Fovera]   chunk ${currentIndex + 1}/${chunks.length}`);
      translatedChunks[currentIndex] = await translateChunk(chunks[currentIndex]);
      await sleep(REQUEST_DELAY_MS);
    }
  };

  const workers = Array.from({ length: Math.min(TRANSLATION_CONCURRENCY, chunks.length) }, () => worker());
  await Promise.all(workers);
  return translatedChunks;
}

function restorePageBreaks(text) {
  return text.replace(/\[\[\[\s*page_break_(\d+)\s*\]\]\]/giu, '\n\n---PAGE---\n\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
