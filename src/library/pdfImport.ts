import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Book } from '../core/types';
import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
import { PDF_UPLOAD_LIMITS } from './pdfUploadConfig';
import { PdfImportError } from './pdfUploadErrors';

const PDF_SIGNATURE = '%PDF-';
const PDF_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf']);
const CLOSE_PUNCTUATION = /^[,.;:!?%)\]}»”’]/u;
const OPEN_PUNCTUATION = /[(\[{«“‘]$/u;
const HYPHENATED_ENDING = /[-\u2010-\u2015]$/u;
const LETTER_START = /^\p{L}/u;

type PdfJsModule = typeof import('pdfjs-dist');

type PdfInfoRecord = {
  Title?: unknown;
  Author?: unknown;
};

interface ExtractedLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExtractedPage {
  lines: ExtractedLine[];
}

export interface PdfImportReport {
  fileSizeBytes: number;
  sourcePages: number;
  importedPages: number;
  extractedCharacters: number;
  strippedMarginLines: number;
  title: string;
  author: string;
}

let pdfJsPromise: Promise<PdfJsModule> | null = null;

export async function importPdfBook(file: File): Promise<{ book: Book; report: PdfImportReport }> {
  validatePdfFile(file);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfSignature(bytes)) {
    throw new PdfImportError('invalid_pdf_signature');
  }

  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    disableAutoFetch: true,
    disableRange: true,
    disableStream: true,
    enableXfa: false,
    maxImageSize: 24_000_000,
    stopAtErrors: true,
  });

  try {
    const document = await loadingTask.promise;
    return await buildBookFromPdf(file, document);
  } catch (error) {
    throw normalizePdfImportError(error, file);
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

async function buildBookFromPdf(file: File, document: PDFDocumentProxy): Promise<{ book: Book; report: PdfImportReport }> {
  if (document.isPureXfa) {
    throw new PdfImportError('xfa_document');
  }
  if (document.numPages > PDF_UPLOAD_LIMITS.maxSourcePages) {
    throw new PdfImportError('too_many_pages', { limit: PDF_UPLOAD_LIMITS.maxSourcePages, pages: document.numPages });
  }

  const [hasJSActions, attachments, metadata] = await Promise.all([
    document.hasJSActions().catch(() => false),
    document.getAttachments().catch(() => null),
    document.getMetadata().catch(() => null),
  ]);

  if (hasJSActions) {
    throw new PdfImportError('javascript_actions');
  }
  if (attachments && attachments.size > 0) {
    throw new PdfImportError('attachments_present');
  }

  const info = ((metadata?.info ?? null) as PdfInfoRecord | null) ?? null;
  const title = cleanMetadataField(info?.Title) ?? titleFromFilename(file.name);
  const author = cleanMetadataField(info?.Author) ?? 'Personal';

  const extractedPages: ExtractedPage[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    try {
      const textContent = await page.getTextContent({
        disableNormalization: false,
        includeMarkedContent: false,
      });
      extractedPages.push({ lines: extractPageLines(textContent.items) });
    } finally {
      page.cleanup();
    }
  }

  const repeatedMarginLines = collectRepeatedMarginLines(extractedPages);
  let strippedMarginLines = 0;

  const cleanedPages = extractedPages
    .map((page) => {
      const cleanedLines = stripMarginLines(page.lines, repeatedMarginLines);
      strippedMarginLines += Math.max(0, page.lines.length - cleanedLines.length);
      return joinLinesIntoPageText(cleanedLines);
    })
    .filter((pageText) => pageText.length > 0);

  const extractedCharacters = cleanedPages.reduce((sum, pageText) => sum + pageText.length, 0);
  const readablePages = cleanedPages.filter((pageText) => pageText.replace(/\s/g, '').length >= PDF_UPLOAD_LIMITS.minCharsForReadablePage)
    .length;
  const averageCharsPerSourcePage = document.numPages > 0 ? extractedCharacters / document.numPages : 0;

  if (
    cleanedPages.length === 0 ||
    extractedCharacters === 0 ||
    readablePages / Math.max(document.numPages, 1) < PDF_UPLOAD_LIMITS.minReadablePageRatio ||
    averageCharsPerSourcePage < PDF_UPLOAD_LIMITS.minAverageCharsPerSourcePage
  ) {
    throw new PdfImportError('no_extractable_text');
  }

  const book: Book = {
    id: createImportedBookId(),
    title,
    author,
    icon: 'PDF',
    sourceLocale: detectImportedBookLocale(cleanedPages),
    pages: cleanedPages,
  };

  return {
    book,
    report: {
      author,
      extractedCharacters,
      fileSizeBytes: file.size,
      importedPages: cleanedPages.length,
      sourcePages: document.numPages,
      strippedMarginLines,
      title,
    },
  };
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist').then((module) => {
      module.GlobalWorkerOptions.workerSrc = workerSrc;
      return module;
    });
  }
  return pdfJsPromise;
}

function validatePdfFile(file: File): void {
  const extension = getFileExtension(file.name);
  if (extension !== 'pdf') {
    throw new PdfImportError('unsupported_file_type');
  }
  if (file.size > PDF_UPLOAD_LIMITS.maxFileSizeBytes) {
    throw new PdfImportError('file_too_large', { limit: PDF_UPLOAD_LIMITS.maxFileSizeBytes, size: file.size });
  }

  if (file.type && !PDF_MIME_TYPES.has(file.type.toLowerCase())) {
    // MIME values are easy to spoof, so this is advisory only. The signature
    // check below is the real gatekeeper.
    console.warn(`Fovera: unexpected PDF MIME type "${file.type}" accepted after signature validation.`);
  }
}

function detectImportedBookLocale(pages: readonly string[]): 'en' | 'tr' {
  const sample = pages.slice(0, 3).join('\n ').toLocaleLowerCase('tr');
  if (!sample) return 'en';

  const turkishLetterHits = (sample.match(/[çğıöşü]/g) ?? []).length;
  const turkishWordHits = (sample.match(/\b(ve|bir|bu|için|ile|ama|gibi|daha|çok|şey|kadar|sonra)\b/gu) ?? []).length;
  return turkishLetterHits >= 8 || turkishWordHits >= 6 ? 'tr' : 'en';
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] ?? '' : '';
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_SIGNATURE.length) return false;
  const signature = Array.from(bytes.slice(0, PDF_SIGNATURE.length))
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return signature === PDF_SIGNATURE;
}

function normalizePdfImportError(error: unknown, file: File): PdfImportError {
  if (error instanceof PdfImportError) return error;

  const details = error as { name?: string; message?: string } | null;
  const errorName = details?.name ?? '';
  const message = details?.message ?? '';

  if (errorName === 'PasswordException') {
    return new PdfImportError('password_protected');
  }
  if (errorName === 'InvalidPDFException' || errorName === 'FormatError' || /invalid pdf/i.test(message)) {
    return new PdfImportError('invalid_pdf_signature');
  }
  if (errorName === 'AbortException') {
    return new PdfImportError('parse_failed');
  }

  return new PdfImportError('parse_failed', { size: file.size }, message);
}

function extractPageLines(items: readonly unknown[]): ExtractedLine[] {
  const textItems = items
    .filter(isTextItem)
    .map((item) => {
      const text = sanitizeTextFragment(item.str);
      if (!text) return null;
      return {
        text,
        x: Number(item.transform[4] ?? 0),
        y: Number(item.transform[5] ?? 0),
        width: Math.max(0, Number(item.width ?? 0)),
        height: Math.max(1, Number(item.height ?? 0)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      const yDelta = b.y - a.y;
      if (Math.abs(yDelta) > 2.5) return yDelta;
      return a.x - b.x;
    });

  const groupedLines: Array<Array<(typeof textItems)[number]>> = [];
  for (const item of textItems) {
    const currentLine = groupedLines[groupedLines.length - 1];
    const reference = currentLine?.[0];
    const tolerance = Math.max(3, Math.min(reference?.height ?? item.height, item.height) * 0.8);
    if (!currentLine || Math.abs((reference?.y ?? item.y) - item.y) > tolerance) {
      groupedLines.push([item]);
      continue;
    }
    currentLine.push(item);
  }

  return groupedLines
    .map((line) => {
      const sortedLine = [...line].sort((a, b) => a.x - b.x);
      const text = joinLineText(sortedLine);
      if (!text) return null;

      const firstItem = sortedLine[0];
      const lastItem = sortedLine[sortedLine.length - 1];
      if (!firstItem || !lastItem) return null;

      return {
        text,
        x: firstItem.x,
        y: firstItem.y,
        width: Math.max(0, lastItem.x + lastItem.width - firstItem.x),
        height: sortedLine.reduce((maxHeight, item) => Math.max(maxHeight, item.height), firstItem.height),
      };
    })
    .filter((line): line is ExtractedLine => line !== null);
}

function joinLineText(items: ReadonlyArray<ExtractedLine>): string {
  let text = '';
  let previousItem: ExtractedLine | null = null;

  for (const item of items) {
    if (!previousItem) {
      text = item.text;
      previousItem = item;
      continue;
    }

    const prevEndX = previousItem.x + previousItem.width;
    const averageCharWidth = previousItem.width / Math.max(previousItem.text.length, 1);
    const gap = item.x - prevEndX;
    if (shouldInsertSpace(previousItem.text, item.text, gap, averageCharWidth)) {
      text += ' ';
    }
    text += item.text;
    previousItem = item;
  }

  return text
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([(\[{«“‘])\s+/gu, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function shouldInsertSpace(previousText: string, nextText: string, gap: number, averageCharWidth: number): boolean {
  if (CLOSE_PUNCTUATION.test(nextText)) return false;
  if (OPEN_PUNCTUATION.test(previousText)) return false;
  if (HYPHENATED_ENDING.test(previousText) && LETTER_START.test(nextText)) return false;

  const positiveThreshold = Math.max(0.8, averageCharWidth * 0.25);
  if (gap <= positiveThreshold) return false;
  return true;
}

function collectRepeatedMarginLines(pages: readonly ExtractedPage[]): Set<string> {
  const counts = new Map<string, number>();
  const threshold = Math.max(3, Math.ceil(pages.length * 0.18));

  for (const page of pages) {
    const candidates = [
      ...page.lines.slice(0, PDF_UPLOAD_LIMITS.repeatedMarginScanDepth),
      ...page.lines.slice(-PDF_UPLOAD_LIMITS.repeatedMarginScanDepth),
    ];
    const seenOnPage = new Set<string>();

    for (const candidate of candidates) {
      const normalized = normalizeMarginCandidate(candidate.text);
      if (!normalized || normalized.length > 120 || seenOnPage.has(normalized)) continue;
      seenOnPage.add(normalized);
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return new Set(Array.from(counts.entries()).filter(([, count]) => count >= threshold).map(([line]) => line));
}

function stripMarginLines(lines: readonly ExtractedLine[], repeatedMarginLines: ReadonlySet<string>): ExtractedLine[] {
  let start = 0;
  let end = lines.length;

  while (start < end && isIgnorableMarginLine(lines[start]?.text ?? '', repeatedMarginLines)) {
    start++;
  }
  while (end > start && isIgnorableMarginLine(lines[end - 1]?.text ?? '', repeatedMarginLines)) {
    end--;
  }

  return lines.slice(start, end);
}

function isIgnorableMarginLine(line: string, repeatedMarginLines: ReadonlySet<string>): boolean {
  const normalized = normalizeMarginCandidate(line);
  if (!normalized) return true;
  if (isLikelyPageNumber(normalized)) return true;
  return repeatedMarginLines.has(normalized);
}

function normalizeMarginCandidate(line: string): string {
  return sanitizeTextFragment(line)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—|·]+\s*(?:page\s+)?(?:\d+|[ivxlcdm]+)(?:\s*\/\s*(?:\d+|[ivxlcdm]+))?$/iu, '')
    .replace(/^(?:page\s+)?(?:\d+|[ivxlcdm]+)\s*[-–—|·]+\s*/iu, '')
    .trim();
}

function isLikelyPageNumber(line: string): boolean {
  return /^(?:page\s+)?(?:\d+|[ivxlcdm]+)(?:\s*\/\s*(?:\d+|[ivxlcdm]+))?$/iu.test(line.trim());
}

function joinLinesIntoPageText(lines: readonly ExtractedLine[]): string {
  let pageText = '';
  let previousLine: ExtractedLine | null = null;

  for (const line of lines) {
    const currentText = line.text.trim();
    if (!currentText) continue;

    if (!previousLine) {
      pageText = currentText;
      previousLine = line;
      continue;
    }

    const verticalGap = previousLine.y - line.y;
    const newParagraph = verticalGap > previousLine.height * 1.9 || line.x - previousLine.x > 18;
    if (newParagraph) {
      pageText += `\n\n${currentText}`;
    } else if (pageText.endsWith('-') && LETTER_START.test(currentText)) {
      pageText = `${pageText.slice(0, -1)}${currentText}`;
    } else {
      pageText += ` ${currentText}`;
    }

    previousLine = line;
  }

  return pageText
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeTextFragment(value: string): string {
  return value
    .replace(/\u00ad/g, '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMetadataField(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = sanitizeTextFragment(value).replace(/\0/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

function titleFromFilename(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  const normalized = withoutExtension.replace(/[_-]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return normalized || 'Untitled PDF';
}

function createImportedBookId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isTextItem(item: unknown): item is TextItem {
  return item !== null && typeof item === 'object' && 'str' in item && 'transform' in item;
}
